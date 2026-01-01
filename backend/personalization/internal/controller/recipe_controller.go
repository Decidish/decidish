package controller

import (
	"personalization/internal/service"

	"github.com/gin-gonic/gin"
)

type RecipeController struct {
	service.RecipeService
}

func NewRecipeController(service service.RecipeService) *RecipeController {
	return &RecipeController{service}
}

func (controller RecipeController) AddMappings(r *gin.Engine) {
	// TODO: For future, where we can add more recipes
	r.POST("/recipes/add/")
	r.POST("/recipes/rewe/", controller.RecipeService.SeedRecipeTableWithREWERecipes)
}
