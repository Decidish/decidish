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
	r.POST("/recipes/add/", controller.AddRecipe)
	r.POST("/recipes/add/rewe/", controller.AddReweRecipes)
	r.GET("/admin/stats", controller.GetAdminStats)
	// r.GET("/recipes/search", controller.SearchRecipes)
}
