package controller

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

type mockOnboardingService struct {
	called bool
}

func (m *mockOnboardingService) CreateUserPreferences(c *gin.Context) {
	m.called = true
	c.JSON(201, gin.H{"ok": true})
}

func TestOnboardingEndpoint_CallsService(t *testing.T) {
	// Arrange
	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("/")

	mock := &mockOnboardingService{}
	ctrl := NewOnboardingController(mock)
	ctrl.AddMappings(group)

	req := httptest.NewRequest("POST", "/onboarding", nil)
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
