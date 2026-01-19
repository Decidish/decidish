package service

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"personalization/internal/client"
	"personalization/internal/config"
	"personalization/internal/repository"

	"github.com/gin-gonic/gin"
)

type UserItem struct {
	UserId     string    `json:"user_id"`
	UserVector []float64 `json:"user_vector"`
}

type EncodeBatchRequest struct {
	Users []UserItem `json:"users"`
}

type IUserService interface {
	CreateUserPreferences(ctx *gin.Context)
	SetSelectedUserMarketId(ctx *gin.Context)
}

type UserService struct {
	config.ApplicationConfig
	*sql.DB
	MLClient *client.Client
}

func NewUserService(applicationConfig config.ApplicationConfig, db *sql.DB, mlClient *client.Client) *UserService {
	return &UserService{
		ApplicationConfig:        applicationConfig,
		DB:                       db,
		MLClient:                 mlClient,
	}
}

func (service UserService) SetSelectedUserMarketId(ctx *gin.Context) {
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
	err = repository.AddUserPreferenceVector(tx, userId, userPreferences)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Populate the request
	req := EncodeBatchRequest{}

	status, err := service.MLClient.PostJSON(ctx.Request.Context(), fmt.Sprintf("%s/encode_users_batch", service.EmbedderServerUrl), req, nil, nil)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed calling embedder", "details": err.Error()})
		return
	}
	if status < 200 || status >= 300 {
		ctx.JSON(status, gin.H{"error": "embedder returned non-2xx", "status_code": status})
		return
	}

	err = tx.Commit()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, "could not commit transaction")
		log.Panicln("could not commit transaction", err.Error())
	}
	ctx.JSON(http.StatusCreated, userPreferences)
}
