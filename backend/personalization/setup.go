package main

import (
	"database/sql"
	"log"
	"personalization/config"
	"personalization/controller"
	"personalization/db/driver"
	"personalization/repository"
	"personalization/service"

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
		MigrationDir:  "db/migrations",
		Name:          "postgres",
		ConnectionUrl: appConfig.DBConnectionUrl,
	}

	return dbDriver.ConnectDB()
}

func enablePrometheusMetrics(r *gin.Engine) {
	p := ginprometheus.NewPrometheus("gin")
	p.Use(r)
}

func createUserActionMappings(r *gin.RouterGroup) {
	userActionController := controller.UserActionController{}

	userActionController.AddMappings(r)
}

func createRecommendRecipesMappings(r *gin.RouterGroup, db *sql.DB) {
	recipeRepo := repository.NewRecommenderRepository()
	recipeService := service.NewRecommenderService(recipeRepo, db)
	recipeController := controller.NewRecommenderController(*recipeService)

	recipeController.AddMappings(r)
}

func createOnboardingMappings(config config.ApplicationConfig, r *gin.RouterGroup, db *sql.DB) {
	userRepo := repository.UserPreferenceRepository{}
	onboardingService := service.NewOnboardingService(config, userRepo)
	onboardingController := controller.NewOnboardingController(*onboardingService)

	onboardingController.AddMappings(r)
}
