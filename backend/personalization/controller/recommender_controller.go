package controller

import (
	"personalization/service"

	"github.com/gin-gonic/gin"
)

type RecommenderController struct {
	service.RecommenderService
}

func NewRecommenderController(recommenderService service.RecommenderService) *RecommenderController {
	return &RecommenderController{
		RecommenderService: recommenderService,
	}
}

func (controller RecommenderController) AddMappings(r *gin.RouterGroup) {
	r.GET("/recipes/recommend", controller.RecommenderService.RecommendRecipeForUser)
}
