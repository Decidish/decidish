package service

import (
	"database/sql"
	"log"
	"net/http"
	"personalization/internal/config"

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
	config config.ApplicationConfig
	DB     *sql.DB
}

func NewRecipeService(config config.ApplicationConfig, db *sql.DB) RecipeService {
	return RecipeService{
		config: config,
		DB:     db,
	}
}

func (service RecipeService) CreateRecipe(ctx *gin.Context) {
	ctx.JSON(http.StatusNotImplemented, gin.H{"status": http.StatusNotImplemented})
	log.Fatal("Not implemented yet!")
}
