package service

import (
	"bytes"
	"encoding/json"
	"net/http"
	"personalization/config"
	"personalization/repository"

	"github.com/gin-gonic/gin"
)

type OnboardingService struct {
	config.ApplicationConfig
	repository.UserPreferenceRepository
}

func NewOnboardingService(applicationConfig config.ApplicationConfig, preferenceRepository repository.UserPreferenceRepository) *OnboardingService {
	return &OnboardingService{
		ApplicationConfig:        applicationConfig,
		UserPreferenceRepository: preferenceRepository,
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

	// Save to database
	err = service.UserPreferenceRepository.Save(userId, userPreferences)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	type UserEmbeddingRequest struct {
		UserId  string `json:"user_id"`
		UserStr string `json:"user_str"`
	}

	jsonBody, err := json.Marshal(UserEmbeddingRequest{UserId: userId, UserStr: userPreferences.String()})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	// Save the embedding to the database
	resp, err := http.Post(service.ApplicationConfig.EmbedderServerUrl+"/process_user_feature", "application/json", bytes.NewReader(jsonBody))
	if err != nil {
		return
	}

	if resp.StatusCode != http.StatusOK {
		ctx.JSON(http.StatusServiceUnavailable, resp)
		return
	}

	ctx.Header("Access-Control-Allow-Origin", "http://localhost:8081")
	ctx.JSON(http.StatusCreated, userPreferences)
}
