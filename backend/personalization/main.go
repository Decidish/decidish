package main

import (
	"log"
	"net/http"
	"personalization/config"
	"personalization/db/driver"

	"github.com/gin-gonic/gin"
)

func main() {
	// Create application configuration from the env variables
	appConfig := config.ApplicationConfig{}

	appConfig.LoadConfiguration()

	dbDriver := driver.DBDriver{
		MigrationDir:  "db/migrations",
		Name:          "postgres",
		ConnectionUrl: appConfig.DBConnectionUrl,
	}

	// Connect to the database
	db := dbDriver.ConnectDB()

	defer db.Close()

	// Run database migrations
	dbDriver.RunMigrations(db)

	r := gin.Default()

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})


	if err := r.Run(":8082"); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}
