package controller

import (
	"authorization/auth"
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthorizationController struct {
	auth.AuthenticationService
}

func (controller *AuthorizationController) AddMappings(db *sql.DB, r *gin.Engine) {
	controller.loginMapping(db, r)
	controller.registerMapping(db, r)
	controller.profileMapping(db, r)
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

		cookieDomain := ".decidish.win"
        cookieSameSite := http.SameSiteLaxMode

        if strings.Contains(c.Request.Host, "localhost") {
            cookieDomain = ""                   // Host-only for dev
            cookieSameSite = http.SameSiteNoneMode // Needed for Chrome to accept it on localhost
        }

        // 2. CONFIGURE COOKIE
        cookie := http.Cookie{
            Name:     "auth_token",
            Value:    jwtToken,
            Path:     "/",
            
            // Critical for cross-subdomain support:
            Domain:   cookieDomain, 
            
            SameSite: cookieSameSite, 
            
            Secure:   true,
            HttpOnly: true,
            
            MaxAge:   3600 * 24, 
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
				"error": fmt.Sprintf("Error registering user: %s, %s", registerBody.Username, err.Error()),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Successfully registered user",
		})
	})
}

func (controller *AuthorizationController) profileMapping(db *sql.DB, r *gin.Engine) {
	r.GET("/me", func(c *gin.Context) {
		cookie, err := c.Request.Cookie("auth_token")
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing auth token"})
			return
		}

		claims := &auth.CustomClaims{}
		token, err := jwt.ParseWithClaims(cookie.Value, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(controller.JWTSecret), nil
		})
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid auth token"})
			return
		}

		var (
			id        int
			username  string
			name      string
			createdAt time.Time
		)

		err = db.QueryRow("SELECT id, username, name, created_at FROM users WHERE id=$1", claims.UserID).Scan(&id, &username, &name, &createdAt)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user profile"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"id":         id,
			"user_id":    claims.UserID,
			"username":   username,
			"email":      username, // currently username acts as email
			"name":       name,
			"created_at": createdAt,
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
	}

	return "", sql.ErrNoRows
}

func (controller *AuthorizationController) registerRequestHandler(db *sql.DB, loginBody auth.LoginRequestBody) error {
	passwordToHash := loginBody.Password

	password, err := bcrypt.GenerateFromPassword([]byte(passwordToHash), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = db.Exec(
		"INSERT INTO users (username, password_hash, name) VALUES ($1, $2, $3)", loginBody.Username, password, loginBody.Name)
	if err != nil {
		return err
	}

	return nil
}
