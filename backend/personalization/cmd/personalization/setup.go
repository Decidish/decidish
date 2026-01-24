package main

import (
	"database/sql"
	"log"
	"personalization/internal/client"
	"personalization/internal/config"
	"personalization/internal/controller"
	"personalization/internal/driver"
	"personalization/internal/repository"
	"personalization/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	ginprometheus "github.com/zsais/go-gin-prometheus"
)

func setupAppConfig() config.ApplicationConfig {
	err := godotenv.Load()
	if err != nil {
		log.Println("Note: Could not find .env file, relying on shell environment.")
	}

	appConfig := config.ApplicationConfig{}

	appConfig.LoadConfiguration()

	return appConfig
}

func connectDB(appConfig config.ApplicationConfig) *sql.DB {
	dbDriver := driver.DBDriver{
		Name:          "postgres",
		ConnectionUrl: appConfig.DBConnectionUrl,
	}

	return dbDriver.ConnectDB()
}

func enablePrometheusMetrics(r *gin.Engine) {
	p := ginprometheus.NewPrometheus("gin")
	p.Use(r)
}

func createRecommendRecipesMappings(r *gin.RouterGroup, db *sql.DB) {
	recipeRepo := repository.NewRecommenderRepository()
	recipeService := service.NewRecommenderService(recipeRepo, db)
	recipeController := controller.NewRecommenderController(*recipeService)

	recipeController.AddMappings(r)
}

func createUserMappings(config config.ApplicationConfig, r *gin.RouterGroup, db *sql.DB) {
	userService := service.NewUserService(config, db, client.NewClient())
	shoppingService := service.NewShoppingListService(config, db)
	userController := controller.NewUserController(*userService, *shoppingService)

	userController.AddMappings(r)
}

func createRecipeMappings(config config.ApplicationConfig, r *gin.Engine, db *sql.DB) {
	recipeService := service.NewRecipeService(config, db, client.NewClient())
	recipeController := controller.NewRecipeController(recipeService)
	jobController := controller.NewJobController(db)

	recipeController.AddMappings(r)
	jobController.AddMappings(r);
}
