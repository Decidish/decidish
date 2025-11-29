package controller

import (
	"authorization/auth"
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type AuthorizationController struct {
	auth.AuthenticationService
}

func (controller *AuthorizationController) AddMappings(db *sql.DB, r *gin.Engine) {
	controller.loginMapping(db, r)
	controller.registerMapping(db, r)
}

/**
Post Mappings for Login and Register
*/

func (controller *AuthorizationController) loginMapping(db *sql.DB, r *gin.Engine) {
	r.POST("/login", func(c *gin.Context) {
		var loginBody auth.LoginRequestBody

		err := c.ShouldBindJSON(&loginBody)

		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		jwtToken, err := controller.loginRequestHandler(db, loginBody)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
			return
		}

		expiration := time.Now().Add(24 * time.Hour)

		cookie := http.Cookie{
			Name:     "auth_token",
			Value:    jwtToken,
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteNoneMode,
			Expires:  expiration,
		}

		http.SetCookie(c.Writer, &cookie)

		c.JSON(http.StatusOK, gin.H{
			"message": "Successfully logged in",
		})
	})
}

func (controller *AuthorizationController) registerMapping(db *sql.DB, r *gin.Engine) {
	r.POST("/register", func(c *gin.Context) {
		var registerBody auth.LoginRequestBody

		err := c.ShouldBindJSON(&registerBody)

		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		err = controller.registerRequestHandler(db, registerBody)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": fmt.Sprintf("Error registering user: %s", registerBody.Username),
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Successfully registered user",
		})
	})
}

/**
Login and Register Handlers
*/

func (controller *AuthorizationController) loginRequestHandler(db *sql.DB, loginBody auth.LoginRequestBody) (string, error) {
	rows, err := db.Query("SELECT id, password_hash FROM users WHERE username=$1", loginBody.Username)

	if err != nil {
		return "", err
	}

	defer func(rows *sql.Rows) {
		_ = rows.Close()
	}(rows)

	if rows.Next() {
		var userId string
		var storedPassword []byte

		if err := rows.Scan(&userId, &storedPassword); err != nil {
			return "", err
		}

		err := bcrypt.CompareHashAndPassword(storedPassword, []byte(loginBody.Password))
		if err != nil {
			return "", sql.ErrNoRows
		}

		// Generate a JWT token
		token, err := controller.AuthenticationService.GenerateToken(userId)
		if err != nil {
			return "", err
		}

		return token, nil

	} else {
		return "", sql.ErrNoRows
	}
}

func (controller *AuthorizationController) registerRequestHandler(db *sql.DB, loginBody auth.LoginRequestBody) error {
	passwordToHash := loginBody.Password

	password, err := bcrypt.GenerateFromPassword([]byte(passwordToHash), bcrypt.MinCost)
	if err != nil {
		return err
	}

	_, err = db.Query(
		"INSERT INTO users (username, password_hash) VALUES ($1, $2)", loginBody.Username, password)
	if err != nil {
		return err
	}

	return nil
}
