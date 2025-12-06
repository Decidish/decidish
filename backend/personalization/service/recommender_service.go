package service

import (
	"personalization/repository"

	"github.com/gin-gonic/gin"
)

type RecommenderService struct {
	repository.RecommenderRepository
}

func (service RecommenderService) RecommendRecipeForUser(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	if userId == "" {
		panic("no user id found")
	}

	service.RecommenderRepository.GetRecommendedRecipesForUser(userId)
}
