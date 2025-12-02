package service

import (
	"personalization/repository"

	"github.com/gin-gonic/gin"
)

type RecommenderService struct {
	repository.RecommenderRepository
}

func (service RecommenderService) RecommendRecipeForUser(ctx *gin.Context) {
	user_id := ctx.GetString("user_id")

	if user_id == "" {
		panic("no user id found")
	}

	service.RecommenderRepository.GetRecommendedRecipesForUser(user_id)
}