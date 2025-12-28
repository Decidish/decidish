package service

import (
	"database/sql"
	"log"
	"net/http"
	"personalization/internal/repository"

	"github.com/gin-gonic/gin"
)

type RecommenderService struct {
	repository.RecommenderRepository
	*sql.DB
}

func NewRecommenderService(recommenderRepository repository.RecommenderRepository, db *sql.DB) *RecommenderService {
	return &RecommenderService{
		RecommenderRepository: recommenderRepository,
		DB:                    db,
	}
}

func (service RecommenderService) RecommendRecipeForUser(ctx *gin.Context) {
	tx, err := service.DB.Begin()

	if err != nil {
		log.Panicln("could not start a transaction", err.Error())
	}

	defer tx.Rollback()

	userId := ctx.GetString("user_id")

	if userId == "" {
		panic("no user id found")
	}

	recipes, err := service.RecommenderRepository.GetRecommendedRecipesForUser(tx, userId)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}

	err = tx.Commit()

	if err != nil {
		log.Panicln("could not commit", err.Error())
	}

	ctx.Header("Access-Control-Allow-Origin", "http://localhost:8081")
	ctx.JSON(http.StatusOK, recipes)
}
