package service

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"personalization/internal/client"
	"personalization/internal/config"
	"personalization/internal/repository"
	"strconv"

	"github.com/gin-gonic/gin"
)

type UserItem struct {
	UserId     string    `json:"user_id"`
	UserVector []float64 `json:"user_vector"`
}

type EncodeBatchRequest struct {
	Users []UserItem `json:"users"`
}

type UserEmbeddingItem struct {
	UserId        string    `json:"user_id"`
	UserEmbedding []float64 `json:"user_embedding"`
}

type EncodeBatchResponse struct {
	Users        []UserEmbeddingItem `json:"users"`
	EmbeddingDim int                 `json:"embedding_dim"`
}

type UserService struct {
	config.ApplicationConfig
	*sql.DB
	MLClient *client.Client
}

func NewUserService(applicationConfig config.ApplicationConfig, db *sql.DB, mlClient *client.Client) *UserService {
	return &UserService{
		ApplicationConfig: applicationConfig,
		DB:                db,
		MLClient:          mlClient,
	}
}

func (service UserService) IsUserEmbeddingReady(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	var exists bool
	err := service.DB.QueryRow(`
	SELECT true
	FROM user_embeddings
	WHERE user_id = $1
	LIMIT 1
	`, userId).Scan(&exists)

	if errors.Is(err, sql.ErrNoRows) {
		ctx.JSON(http.StatusOK, gin.H{"ready": false})
		return
	}
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"ready": true})
}

type SetMarketRequest struct {
	MarketId string `json:"market_id"`
}

func (service UserService) SetSelectedUserMarketId(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	var request SetMarketRequest
	err := ctx.ShouldBindJSON(&request)

	if err != nil {
		ctx.JSON(http.StatusBadRequest, err)
		return
	}

	tx, err := service.DB.Begin()

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, "could not start a transaction")
		log.Panicln("could not start a transaction", err.Error())
	}

	defer tx.Rollback()

	err = repository.UpdateMarketId(tx, userId, request.MarketId)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	if err = tx.Commit(); err != nil {
		ctx.JSON(http.StatusInternalServerError, "could not commit transaction")
		log.Panicln("could not commit transaction", err.Error())
	}

	ctx.JSON(http.StatusOK, fmt.Sprintf("Updated market id for user: %s", userId))
}

func (service UserService) GetUserSelectedMarket(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	// Note: We pass service.DB directly as we don't need a transaction for a single read
	marketId, err := repository.GetUserMarketId(service.DB, userId)

	if err != nil {
		if err == sql.ErrNoRows {
			// User exists but hasn't selected a market yet
			ctx.JSON(http.StatusNotFound, gin.H{"error": "No market selected for this user"})
			return
		}
		// Database error
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch user market"})
		log.Println("Database error in GetUserSelectedMarket:", err.Error())
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		// "userId":   userId,
		"marketId": marketId,
	})
}

func (service UserService) CreateUserPreferences(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	var userPreferences repository.AdditionalInfo
	err := ctx.ShouldBindJSON(&userPreferences)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, err)
		return
	}

	tx, err := service.DB.Begin()

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, "could not start a transaction")
		log.Panicln("could not start a transaction", err.Error())
	}

	defer tx.Rollback()

	// Save to database
	err = repository.AddUserPreference(tx, userId, userPreferences)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Populate the request
	req := EncodeBatchRequest{
		Users: []UserItem{
			{
				UserId:     userId,
				UserVector: userPreferences.PreferenceVector,
			},
		},
	}

	var encodeResp EncodeBatchResponse

	status, err := service.MLClient.PostJSON(ctx.Request.Context(), fmt.Sprintf("%s/encode_users_batch", service.EmbedderServerUrl), req, &encodeResp, nil)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed calling embedder", "details": err.Error()})
		return
	}
	if status < 200 || status >= 300 {
		ctx.JSON(status, gin.H{"error": "embedder returned non-2xx", "status_code": status})
		return
	}

	for _, user := range encodeResp.Users {
		err := repository.AddOrUpdateEmbeddings(tx, user.UserId, user.UserEmbedding)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, err)
			return
		}
	}

	err = tx.Commit()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, "could not commit transaction")
		log.Panicln("could not commit transaction", err.Error())
	}
	ctx.JSON(http.StatusCreated, userPreferences)
}

func (service UserService) RecordUserAction(ctx *gin.Context) {
	userId := ctx.GetString("user_id")
	actionStr := ctx.Param("action")
	recipeIDStr := ctx.Param("recipeID")

	var action bool
	switch actionStr {
	case "like", "liked", "1", "true":
		action = true
	case "dislike", "disliked", "0", "false":
		action = false
	default:
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid action. must be 'like', 'dislike', '1', '0', 'true', or 'false'"})
		return
	}

	recipeID, err := strconv.Atoi(recipeIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid recipe ID"})
		return
	}

	tx, err := service.DB.Begin()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, "could not start a transaction")
		log.Panicln("could not start a transaction", err.Error())
	}
	defer tx.Rollback()

	err = repository.AddUserHistory(tx, userId, recipeID, action)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	if err = tx.Commit(); err != nil {
		ctx.JSON(http.StatusInternalServerError, "could not commit transaction")
		log.Panicln("could not commit transaction", err.Error())
	}

	ctx.JSON(http.StatusOK, fmt.Sprintf("Recorded action for user: %s on recipe: %d", userId, recipeID))
}

func (service UserService) GetUserHistory(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	histories, err := repository.GetUserHistory(service.DB, userId)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	ctx.JSON(http.StatusOK, histories)
}
