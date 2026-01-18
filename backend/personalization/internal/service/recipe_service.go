package service

import (
	"database/sql"
	"log"
	"net/http"
	"personalization/internal/client"
	"personalization/internal/config"
	"personalization/internal/repository"
	"strconv"

	"github.com/gin-gonic/gin"
)

type EmbedRequest struct {
	RecipeStrs []string `json:"text"`
}
type EmbedResponse struct {
	Device     string      `json:"device"`
	Model      string      `json:"model"`
	Embeddings [][]float64 `json:"embeddings"`
}

type RecipeService struct {
	config   config.ApplicationConfig
	DB       *sql.DB
	MLClient *client.Client
}

func NewRecipeService(config config.ApplicationConfig, db *sql.DB, mlClient *client.Client) RecipeService {
	return RecipeService{
		config:   config,
		DB:       db,
		MLClient: mlClient,
	}
}

func (service RecipeService) AddReweRecipes(ctx *gin.Context) {
	tx, err := service.DB.Begin()
	if err != nil {
		ctx.JSON(500, gin.H{"error": "db error"})
		return
	}

	jobId, err := repository.CreateJob(tx, "add_rewe_recipes", "waiting")
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	err = tx.Commit()
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Prepare request for embedder
	req := EmbedRequest{
		RecipeStrs: []string{"add_rewe_recipes_start", strconv.Itoa(jobId)},
	}
	var mlResp EmbedResponse

	// Call ML service and decode into mlResp
	status, err := service.MLClient.PostJSON(ctx.Request.Context(), service.config.EmbedderServerUrl, req, &mlResp, nil)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed calling embedder", "details": err.Error()})
		return
	}
	if status < 200 || status >= 300 {
		ctx.JSON(status, gin.H{"error": "embedder returned non-2xx", "status_code": status})
		return
	}

	// Return job id and basic info about the embedding response
	ctx.JSON(http.StatusOK, gin.H{
		"job_id":     jobId,
		"status":     "started",
		"name":       "add_rewe_recipes",
		"embed_code": status,
		"emb_count":  len(mlResp.Embeddings),
	})
}

func (service RecipeService) CreateRecipe(ctx *gin.Context) {
	ctx.JSON(http.StatusNotImplemented, gin.H{"status": http.StatusNotImplemented})
	log.Fatal("Not implemented yet!")
}
