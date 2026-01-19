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

type UserEmbeddingRequest struct {
	JobId   int    `json:"job_id"`
	UserId  string `json:"user_id"`
	UserStr string `json:"user_str"`
}

type IOnboardingService interface {
	CreateUserPreferences(ctx *gin.Context)
}

type OnboardingService struct {
	config.ApplicationConfig
	repository.UserPreferenceRepository
	*sql.DB
	MLClient *client.Client
}

func NewOnboardingService(applicationConfig config.ApplicationConfig, preferenceRepository repository.UserPreferenceRepository, db *sql.DB, mlClient *client.Client) *OnboardingService {
	return &OnboardingService{
		ApplicationConfig:        applicationConfig,
		UserPreferenceRepository: preferenceRepository,
		DB:                       db,
		MLClient:                 mlClient,
	}
}

func (service OnboardingService) CreateUserPreferences(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	var userPreferences repository.UserPreferences
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

	jobId, err := repository.CreateJob(tx, "add_user_preferences", "pending")
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	err = tx.Commit()
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Save to database
	err = service.UserPreferenceRepository.Save(tx, userId, userPreferences)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	type UserEmbeddingRequest struct {
		JobId   int    `json:"job_id"`
		UserId  string `json:"user_id"`
		UserStr string `json:"user_str"`
	}

	req := AddReweRecipeRequest{
		JobId: jobId,
	}
	var mlResp AddRecipeResponse

	status, err := service.MLClient.PostJSON(ctx.Request.Context(), fmt.Sprintf("%s/recipes/add/rewe", service.EmbedderServerUrl), req, &mlResp, nil)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed calling embedder", "details": err.Error()})
		return
	}
	if status < 200 || status >= 300 {
		ctx.JSON(status, gin.H{"error": "embedder returned non-2xx", "status_code": status})
		return
	}

	ctx.JSON(http.StatusCreated, userPreferences)
}
