package middleware

import (
	"fmt"
	"net/http"
	"personalization/config"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type CustomClaims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

func AuthMiddleware(config config.ApplicationConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		cookie, err := c.Cookie("auth_token")
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"message": "Cookie not found",
			})
			return
		}

		token, err := jwt.ParseWithClaims(cookie, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}

			return []byte(config.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"message": "Invalid token",
			})
			return
		}

		claims, ok := token.Claims.(*CustomClaims)

		if !ok || "" == claims.UserID {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"message": "No user id found",
			})
		}

		// Set the user id in the context
		c.Set("user_id", claims.UserID)

		c.Next()
	}
}
