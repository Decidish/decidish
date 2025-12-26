package main

import (
	"database/sql"
	"log"
	"personalization/db/driver"
	"personalization/middleware"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Create application configuration from the env variables
	appConfig := setupAppConfig()

	dbDriver := driver.DBDriver{
		MigrationDir:  "db/migrations",
		Name:          "postgres",
		ConnectionUrl: appConfig.DBConnectionUrl,
	}

	// Connect to the database
	db := connectDB(appConfig)

	defer func(db *sql.DB) {
		_ = db.Close()
	}(db)
	// Run database migrations
	dbDriver.RunMigrations(db)

	r := gin.Default()

	// Cors Settings for Security
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:8081"},
		AllowMethods:     []string{"PUT", "PATCH", "POST", "GET", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	createRecipeMappings(appConfig, r, db)

	// Enables prometheus metrics
	enablePrometheusMetrics(r)

	// Authentication needed
	protected := r.Group("/api/v1")

	protected.Use(middleware.AuthMiddleware(appConfig))
	{
		createUserActionMappings(protected)
		createRecommendRecipesMappings(protected, db)
		createOnboardingMappings(appConfig, protected, db)
	}

	if err := r.Run(":8082"); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}
