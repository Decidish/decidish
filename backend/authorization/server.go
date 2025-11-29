package main

import (
	"authorization/database"
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin" // New dependency
)

type LoginRequestBody struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func handleLoginRequest(body LoginRequestBody, db *sql.DB) error {
	rows, err := db.Query("SELECT password FROM users WHERE username=$1", body.Username)

	if err != nil {
		return err
	}

	defer rows.Close()

	if rows.Next() {
		var storedPassword string
		if err := rows.Scan(&storedPassword); err != nil {
			return err
		}
		
		// Here you would normally compare hashed passwords
		if storedPassword == body.Password {
			return nil // Successful login
		} else {
			return sql.ErrNoRows // Invalid password
		}
	} else {
		return sql.ErrNoRows // User not found
	}
}

func main() {
    r := gin.Default()

	db := database.ConnectDB()

	// Run defined migrations
	database.RunMigrations(db)


    r.POST("/login", func(c *gin.Context) {
		var loginBody LoginRequestBody

		err := c.ShouldBindJSON(&loginBody)

		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}
		
		err = handleLoginRequest(loginBody, db)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
			return
		}

        c.JSON(http.StatusOK, gin.H{
            "message": "Successfully logged in",
        })
    })
    r.Run(":8080") // Listen and serve on 0.0.0.0:8080
}