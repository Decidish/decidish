package main

import (
	"authorization/auth"
	"authorization/config"
	"authorization/controller"
	"authorization/database"
	"log"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Note: Could not find .env file, relying on shell environment.")
	}

	r := gin.Default()

	appConfig := config.ApplicationConfig{}

	appConfig.LoadConfiguration()

	log.Println(appConfig)

	dbDriver := database.DBDriver{
		MigrationDir:  "migrations",
		Name:          "postgres",
		ConnectionUrl: appConfig.DBConnectionUrl,
	}

	db := dbDriver.ConnectDB()

	// Run defined migrations
	dbDriver.RunMigrations(db)

	authService := auth.AuthenticationService{
		JWTSecret: appConfig.JWTSecret,
	}

	authController := controller.AuthorizationController{
		AuthenticationService: authService,
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:8081"},
		AllowMethods:     []string{"PUT", "PATCH", "POST", "GET", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	authController.AddMappings(db, r)

	r.Run(":8083")
}
