package service

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"personalization/internal/client"
	"personalization/internal/config"
	"personalization/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
)

type AddReweRecipeRequest struct {
	JobId int `json:"job_id"`
}

type AddRecipeRequestBody struct {
	RecipeUrl string `json:"recipe_url"`
}

type AddRecipeRequest struct {
	JobId int `json:"job_id"`
	RecipeUrl  string `json:"recipe_url"`
}

type AddRecipeResponse struct {
	JobStatus string `json:"status"`
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

func (service RecipeService) AddRecipe(ctx *gin.Context) {
	var body AddRecipeRequestBody

	err := ctx.ShouldBindBodyWith(&body, binding.JSON)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}

	tx, err := service.DB.Begin()
	if err != nil {
		ctx.JSON(500, gin.H{"error": "db error"})
		return
	}

	jobId, err := repository.CreateJob(tx, "add_recipe", "pending")
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
	req := AddRecipeRequest{
		JobId: jobId,
		RecipeUrl: body.RecipeUrl,
	}

	var mlResp AddRecipeResponse

	// Call ML service and decode into mlResp
	status, err := service.MLClient.PostJSON(ctx.Request.Context(), fmt.Sprintf("%s/recipes/add", service.config.EmbedderServerUrl), req, &mlResp, nil)
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
		"job_id":   jobId,
		"status":   "pending",
		"response": mlResp.JobStatus,
		"name":     "add_recipe",
	})
}

func (service RecipeService) AddReweRecipes(ctx *gin.Context) {
	tx, err := service.DB.Begin()
	if err != nil {
		ctx.JSON(500, gin.H{"error": "db error"})
		return
	}

	jobId, err := repository.CreateJob(tx, "add_rewe_recipes", "pending")
	if err != nil {
		tx.Rollback()
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	err = tx.Commit()
	if err != nil {
		ctx.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Trigger ML Service in Background (Async)
	// We pass the config and client into the closure
	go func(jid int) {
		bgCtx := context.Background()
		// Prepare request for embedder
		req := AddReweRecipeRequest{
			JobId: jobId,
		}
		var mlResp AddRecipeResponse

		// Call ML service and decode into mlResp
		status, err := service.MLClient.PostJSON(bgCtx, fmt.Sprintf("%s/recipes/add/rewe", service.config.EmbedderServerUrl), req, &mlResp, nil)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed calling embedder", "details": err.Error()})
			return
		}
		if status < 200 || status >= 300 {
			ctx.JSON(status, gin.H{"error": "embedder returned non-2xx", "status_code": status})
			return
		}
	}(jobId)

	// Return job id and basic info about the embedding response
	ctx.JSON(http.StatusOK, gin.H{
		"job_id":   jobId,
		"status":   "pending",
		"response": "Job started in background",
		// "response": mlResp.JobStatus,
		"name":     "add_rewe_recipes",
	})
}

func (service RecipeService) CreateRecipe(ctx *gin.Context) {
	ctx.JSON(http.StatusNotImplemented, gin.H{"status": http.StatusNotImplemented})
	log.Fatal("Not implemented yet!")
}
