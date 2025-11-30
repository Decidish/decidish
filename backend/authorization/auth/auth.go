package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type LoginRequestBody struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthenticationService struct {
	JWTSecret string
}

// CustomClaims represents the data we want to embed in the JWT.
type CustomClaims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

// GenerateToken creates a signed JWT for the given user ID.
func (service AuthenticationService) GenerateToken(userID string) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour) // Token expires in 24 hours

	claims := &CustomClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			// Issued At: time when the token was created
			IssuedAt: jwt.NewNumericDate(time.Now()),
			// Expiration Time
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	// Create the token with the claims and the signing method (HS256)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign the token with the secret key
	tokenString, err := token.SignedString([]byte(service.JWTSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}
