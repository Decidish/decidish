package controller

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

type mockUserService struct {
	called bool
}

func (m *mockUserService) CreateUserPreferences(c *gin.Context) {
	m.called = true
	c.JSON(201, gin.H{"ok": true})
}

func (service mockUserService) IsUserEmbeddingReady(ctx *gin.Context) {}

func (m *mockUserService) SetSelectedUserMarketId(c *gin.Context) {}

func TestOnboardingEndpoint_CallsService(t *testing.T) {
	// Arrange
	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("/")

	mock := &mockUserService{}
	ctrl := NewUserController(mock)
	ctrl.AddMappings(group)

	req := httptest.NewRequest("POST", "/user/preferences", nil)
	w := httptest.NewRecorder()

	// Act
	router.ServeHTTP(w, req)

	// Assert
	if w.Code != 201 {
		t.Fatalf("expected status 201, got %d, body: %s", w.Code, w.Body.String())
	}
	if !mock.called {
		t.Fatalf("expected CreateUserPreferences to be called")
	}
}
