package service

import (
	"context"
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
	tx, err := service.DB.BeginTx(context.Background(), &sql.TxOptions{ReadOnly: true})

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

	if err = tx.Commit(); err != nil {
		log.Panicln("could not commit", err.Error())
	}

	ctx.Header("Access-Control-Allow-Origin", "http://localhost:8081")
	ctx.JSON(http.StatusOK, recipes)
}
