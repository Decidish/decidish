package controller

import (
	"personalization/service"

	"github.com/gin-gonic/gin"
)

type RecommenderController struct {
	service.RecommenderService
}

func (controller RecommenderController) AddMappings(r *gin.RouterGroup) {
	r.GET("/recipes/recommend", controller.RecommenderService.RecommendRecipeForUser)
}