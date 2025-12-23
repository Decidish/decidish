package service

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"personalization/config"
	"personalization/repository"

	"github.com/gin-gonic/gin"
)

type OnboardingService struct {
	config.ApplicationConfig
	repository.UserPreferenceRepository
	*sql.DB
}

func NewOnboardingService(applicationConfig config.ApplicationConfig, preferenceRepository repository.UserPreferenceRepository, db *sql.DB) *OnboardingService {
	return &OnboardingService{
		ApplicationConfig:        applicationConfig,
		UserPreferenceRepository: preferenceRepository,
		DB:                       db,
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

	// TODO: We have a duel write problem
	tx, err := service.DB.Begin()

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, "could not start a transaction")
		log.Panicln("could not start a transaction", err.Error())
	}

	defer tx.Rollback()

	// Save to database
	err = service.UserPreferenceRepository.Save(tx, userId, userPreferences)
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

	err = tx.Commit()

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	ctx.Header("Access-Control-Allow-Origin", "http://localhost:8081")
	ctx.JSON(http.StatusCreated, userPreferences)
}
