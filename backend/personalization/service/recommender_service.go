package service

import (
	"net/http"
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

	recipes, err := service.RecommenderRepository.GetRecommendedRecipesForUser(userId)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}

	ctx.JSON(http.StatusOK, recipes)
}
