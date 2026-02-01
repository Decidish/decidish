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
	"strconv"
	"strings"

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
	JobId     int    `json:"job_id"`
	RecipeUrl string `json:"recipe_url"`
}

type AddRecipeResponse struct {
	JobStatus string `json:"status"`
}

type RecipeService struct {
	config   config.ApplicationConfig
	DB       *sql.DB
	MLClient *client.Client
	Repo     *repository.RecipeRepository
}

func NewRecipeService(config config.ApplicationConfig, db *sql.DB, mlClient *client.Client) RecipeService {
	return RecipeService{
		config:   config,
		DB:       db,
		MLClient: mlClient,
		Repo:     repository.NewRecipeRepository(db),
	}
}

func (service RecipeService) GetAdminStats(ctx *gin.Context) {
	total, today, users, err := repository.GetAdminStats(service.DB)
	if err != nil {
		ctx.JSON(500, gin.H{"error": "Failed to fetch stats"})
		return
	}

	ctx.JSON(200, gin.H{
		"total_recipes":  total,
		"imported_today": today,
		"active_users":   users,
	})
}

func (s *RecipeService) SearchRecipes(ctx *gin.Context) {
	// Parse Pagination and Filters from the URL
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "12"))

	// Parse multiple categories; support CSV or repeated query params
	var categories []string
	var keywords []string

	// First, get all query values (could be array or single CSV)
	if arr := ctx.QueryArray("categories"); len(arr) > 0 {
		// If we got query params, split each one by comma (in case of CSV)
		for _, item := range arr {
			for _, c := range strings.Split(item, ",") {
				t := strings.TrimSpace(c)
				if t != "" {
					categories = append(categories, t)
				}
			}
		}
		fmt.Printf("DEBUG Service: Got categories from query array (parsed CSV): %v\n", categories)
	} else if csv := ctx.Query("categories"); csv != "" {
		// Fallback: single query parameter
		for _, c := range strings.Split(csv, ",") {
			t := strings.TrimSpace(c)
			if t != "" {
				categories = append(categories, t)
			}
		}
		fmt.Printf("DEBUG Service: Got categories from single CSV: %v (original: %q)\n", categories, csv)
	}

	// Parse keywords similarly (CSV or repeated params)
	if arr := ctx.QueryArray("keywords"); len(arr) > 0 {
		for _, item := range arr {
			for _, k := range strings.Split(item, ",") {
				t := strings.TrimSpace(k)
				if t != "" {
					keywords = append(keywords, t)
				}
			}
		}
		fmt.Printf("DEBUG Service: Got keywords from query array (parsed CSV): %v\n", keywords)
	} else if csv := ctx.Query("keywords"); csv != "" {
		for _, k := range strings.Split(csv, ",") {
			t := strings.TrimSpace(k)
			if t != "" {
				keywords = append(keywords, t)
			}
		}
		fmt.Printf("DEBUG Service: Got keywords from single CSV: %v (original: %q)\n", keywords, csv)
	}

	params := repository.SearchParams{
		Query:       ctx.Query("q"),       // matches ?q=
		Cuisine:     ctx.Query("cuisine"), // fallback single cuisine
		Categories:  categories,           // multiple categories
		Keywords:    keywords,
		MaxTime:     ctx.Query("maxTime"), // matches ?maxTime=
		MaxCalories: ctx.Query("maxCalories"),
		Page:        page,
		Limit:       limit,
	}

	fmt.Printf("DEBUG Service: SearchParams = %+v\n", params)

	result, err := s.Repo.SearchRecipes(params)
	if err != nil {
		fmt.Println("Search Error:", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recipes"})
		return
	}

	ctx.JSON(http.StatusOK, result)
}

// GetCategories returns a list of category names filtered by optional query
func (s *RecipeService) GetCategories(ctx *gin.Context) {
	q := ctx.Query("q")
	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "5"))
	if limit <= 0 || limit > 50 {
		limit = 5
	}

	cats, err := s.Repo.ListCategories(q, limit)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list categories"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"categories": cats})
}

// GetKeywords returns a list of keyword names filtered by optional query
func (s *RecipeService) GetKeywords(ctx *gin.Context) {
	q := ctx.Query("q")
	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "5"))
	if limit <= 0 || limit > 50 {
		limit = 5
	}

	kws, err := s.Repo.ListKeywords(q, limit)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list keywords"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"keywords": kws})
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

	// fmt.Println("Received URL:", body.RecipeUrl)

	jobId, err := repository.CreateJob(tx, "add_recipe", &body.RecipeUrl, "pending")
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
		JobId:     jobId,
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

	jobId, err := repository.CreateJob(tx, "add_rewe_recipes", nil, "pending")
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
			log.Printf("Background job %d failed calling embedder: %v", jid, err)
			// ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed calling embedder", "details": err.Error()})
			return
		}
		if status < 200 || status >= 300 {
			log.Printf("Background job %d. Embedder returned non-2xx: %v", jid, err)
			// ctx.JSON(status, gin.H{"error": "embedder returned non-2xx", "status_code": status})
			return
		}
	}(jobId)

	// Return job id and basic info about the embedding response
	ctx.JSON(http.StatusOK, gin.H{
		"job_id":   jobId,
		"status":   "pending",
		"response": "Job started in background",
		// "response": mlResp.JobStatus,
		"name": "add_rewe_recipes",
	})
}

func (service RecipeService) CreateRecipe(ctx *gin.Context) {
	ctx.JSON(http.StatusNotImplemented, gin.H{"status": http.StatusNotImplemented})
	log.Fatal("Not implemented yet!")
}
