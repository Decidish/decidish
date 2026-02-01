package service

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"personalization/internal/config"
	"personalization/internal/repository"
	"strconv"

	"github.com/gin-gonic/gin"
)

type SavedRecipesService struct {
	config.ApplicationConfig
	*sql.DB
}

func NewSavedRecipesService(config config.ApplicationConfig, db *sql.DB) *SavedRecipesService {
	return &SavedRecipesService{
		ApplicationConfig: config,
		DB:                db,
	}
}

type SaveRecipeRequest struct {
	RecipeID int `json:"recipe_id" binding:"required"`
}

// SaveRecipe saves a recipe for the current user
func (service SavedRecipesService) SaveRecipe(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	var request SaveRecipeRequest
	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "recipe_id is required"})
		return
	}

	tx, err := service.DB.Begin()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "could not start transaction"})
		log.Println("could not start transaction:", err.Error())
		return
	}
	defer tx.Rollback()

	if err := repository.SaveRecipe(tx, userId, request.RecipeID); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "could not commit transaction"})
		log.Println("could not commit transaction:", err.Error())
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Recipe %d saved for user %s", request.RecipeID, userId)})
}

// UnsaveRecipe removes a recipe from saved recipes
func (service SavedRecipesService) UnsaveRecipe(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	recipeIDStr := ctx.Param("recipe_id")
	recipeID, err := strconv.Atoi(recipeIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid recipe_id"})
		return
	}

	tx, err := service.DB.Begin()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "could not start transaction"})
		log.Println("could not start transaction:", err.Error())
		return
	}
	defer tx.Rollback()

	if err := repository.UnsaveRecipe(tx, userId, recipeID); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "could not commit transaction"})
		log.Println("could not commit transaction:", err.Error())
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Recipe %d unsaved for user %s", recipeID, userId)})
}

// GetSavedRecipes returns all saved recipes for the current user
func (service SavedRecipesService) GetSavedRecipes(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	savedRecipes, err := repository.GetSavedRecipes(service.DB, userId)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if savedRecipes == nil {
		savedRecipes = []repository.SavedRecipe{}
	}

	ctx.JSON(http.StatusOK, savedRecipes)
}

// GetSavedRecipeIds returns just the recipe IDs for the current user
func (service SavedRecipesService) GetSavedRecipeIds(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	recipeIds, err := repository.GetSavedRecipeIds(service.DB, userId)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if recipeIds == nil {
		recipeIds = []int{}
	}

	ctx.JSON(http.StatusOK, recipeIds)
}

// IsRecipeSaved checks if a specific recipe is saved
func (service SavedRecipesService) IsRecipeSaved(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	recipeIDStr := ctx.Param("recipe_id")
	recipeID, err := strconv.Atoi(recipeIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid recipe_id"})
		return
	}

	isSaved, err := repository.IsRecipeSaved(service.DB, userId, recipeID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"saved": isSaved})
}
