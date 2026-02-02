package controller

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
)

func setupTestRouter(controller *JobController) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	controller.AddMappings(r)
	return r
}

func TestGetJobStatus_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	controller := &JobController{DB: db}
	router := setupTestRouter(controller)

	// Setup mock expectations
	createdAt := time.Now()
	updatedAt := time.Now()
	rows := sqlmock.NewRows([]string{"id", "name", "status", "processed_items", "total_items", "error_message", "created_at", "updated_at"}).
		AddRow(1, "test_job", "completed", 10, 10, nil, createdAt, updatedAt)
	mock.ExpectQuery("SELECT id, name, status, processed_items, total_items, error_message, created_at, updated_at FROM jobs WHERE id = \\$1").
		WithArgs(1).
		WillReturnRows(rows)

	// Make request
	req, _ := http.NewRequest("GET", "/jobs/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assertions
	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["name"] != "test_job" {
		t.Errorf("Expected job name 'test_job', got '%v'", response["name"])
	}
	if response["status"] != "completed" {
		t.Errorf("Expected status 'completed', got '%v'", response["status"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetJobStatus_InvalidID(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	controller := &JobController{DB: db}
	router := setupTestRouter(controller)

	req, _ := http.NewRequest("GET", "/jobs/invalid", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["error"] != "Invalid job ID" {
		t.Errorf("Expected error 'Invalid job ID', got '%v'", response["error"])
	}
}

func TestGetJobStatus_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	controller := &JobController{DB: db}
	router := setupTestRouter(controller)

	mock.ExpectQuery("SELECT id, name, status, processed_items, total_items, error_message, created_at, updated_at FROM jobs WHERE id = \\$1").
		WithArgs(999).
		WillReturnError(sql.ErrNoRows)

	req, _ := http.NewRequest("GET", "/jobs/999", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["error"] != "Job not found" {
		t.Errorf("Expected error 'Job not found', got '%v'", response["error"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetJobStatus_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	controller := &JobController{DB: db}
	router := setupTestRouter(controller)

	mock.ExpectQuery("SELECT id, name, status, processed_items, total_items, error_message, created_at, updated_at FROM jobs WHERE id = \\$1").
		WithArgs(1).
		WillReturnError(sql.ErrConnDone)

	req, _ := http.NewRequest("GET", "/jobs/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetReweHistory_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	controller := &JobController{DB: db}
	router := setupTestRouter(controller)

	createdAt := time.Now()
	updatedAt := time.Now()
	rows := sqlmock.NewRows([]string{"id", "name", "status", "processed_items", "total_items", "error_message", "created_at", "updated_at"}).
		AddRow(1, "add_rewe_recipes", "completed", 50, 50, nil, createdAt, updatedAt).
		AddRow(2, "add_rewe_recipes", "running", 25, 100, nil, createdAt, updatedAt)
	mock.ExpectQuery("SELECT id, name, status, processed_items, total_items, error_message, created_at, updated_at FROM jobs WHERE name = 'add_rewe_recipes' ORDER BY created_at DESC").
		WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/recipes/history/rewe", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response []map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(response) != 2 {
		t.Errorf("Expected 2 jobs, got %d", len(response))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetReweHistory_Empty(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	controller := &JobController{DB: db}
	router := setupTestRouter(controller)

	rows := sqlmock.NewRows([]string{"id", "name", "status", "processed_items", "total_items", "error_message", "created_at", "updated_at"})
	mock.ExpectQuery("SELECT id, name, status, processed_items, total_items, error_message, created_at, updated_at FROM jobs WHERE name = 'add_rewe_recipes' ORDER BY created_at DESC").
		WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/recipes/history/rewe", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	// Should return empty array, not null
	if w.Body.String() != "[]" {
		t.Errorf("Expected empty array '[]', got '%s'", w.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetReweHistory_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	controller := &JobController{DB: db}
	router := setupTestRouter(controller)

	mock.ExpectQuery("SELECT id, name, status, processed_items, total_items, error_message, created_at, updated_at FROM jobs WHERE name = 'add_rewe_recipes' ORDER BY created_at DESC").
		WillReturnError(sql.ErrConnDone)

	req, _ := http.NewRequest("GET", "/recipes/history/rewe", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["error"] != "Failed to fetch rewe history" {
		t.Errorf("Expected error 'Failed to fetch rewe history', got '%v'", response["error"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetUrlHistory_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	controller := &JobController{DB: db}
	router := setupTestRouter(controller)

	createdAt := time.Now()
	rows := sqlmock.NewRows([]string{"id", "name", "url", "status", "created_at"}).
		AddRow(1, "add_recipe", "https://example.com/recipe1", "completed", createdAt).
		AddRow(2, "add_recipe", "https://example.com/recipe2", "failed", createdAt)
	mock.ExpectQuery("SELECT id, name, url, status, created_at FROM jobs WHERE name = 'add_recipe' ORDER BY created_at DESC LIMIT 50").
		WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/recipes/history/url", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response []map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(response) != 2 {
		t.Errorf("Expected 2 logs, got %d", len(response))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetUrlHistory_Empty(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	controller := &JobController{DB: db}
	router := setupTestRouter(controller)

	rows := sqlmock.NewRows([]string{"id", "name", "url", "status", "created_at"})
	mock.ExpectQuery("SELECT id, name, url, status, created_at FROM jobs WHERE name = 'add_recipe' ORDER BY created_at DESC LIMIT 50").
		WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/recipes/history/url", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	// Should return empty array, not null
	if w.Body.String() != "[]" {
		t.Errorf("Expected empty array '[]', got '%s'", w.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetUrlHistory_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	controller := &JobController{DB: db}
	router := setupTestRouter(controller)

	mock.ExpectQuery("SELECT id, name, url, status, created_at FROM jobs WHERE name = 'add_recipe' ORDER BY created_at DESC LIMIT 50").
		WillReturnError(sql.ErrConnDone)

	req, _ := http.NewRequest("GET", "/recipes/history/url", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["error"] != "Failed to fetch url history" {
		t.Errorf("Expected error 'Failed to fetch url history', got '%v'", response["error"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestCleanupDeprecatedData_Success(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	controller := NewJobController(db)
	router := setupTestRouter(controller)

	req, _ := http.NewRequest("POST", "/jobs/cleanup", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// The cleanup runs asynchronously, so we just check the immediate response
	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["status"] != "started" {
		t.Errorf("Expected status 'started', got '%v'", response["status"])
	}
	if response["message"] != "Cleanup job has been triggered successfully" {
		t.Errorf("Expected message 'Cleanup job has been triggered successfully', got '%v'", response["message"])
	}
}

func TestNewJobController(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	controller := NewJobController(db)

	if controller.DB != db {
		t.Error("Expected DB to be set correctly")
	}

	if controller.CleanupService == nil {
		t.Error("Expected CleanupService to be initialized")
	}
}

func TestAddMappings(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	controller := NewJobController(db)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	controller.AddMappings(router)

	// Test that routes are registered by checking if they respond (not 404)
	routes := router.Routes()

	expectedRoutes := map[string]string{
		"/jobs/:id":             "GET",
		"/recipes/history/rewe": "GET",
		"/recipes/history/url":  "GET",
		"/jobs/cleanup":         "POST",
	}

	for _, route := range routes {
		if method, exists := expectedRoutes[route.Path]; exists {
			if route.Method != method {
				t.Errorf("Route %s expected method %s, got %s", route.Path, method, route.Method)
			}
			delete(expectedRoutes, route.Path)
		}
	}

	if len(expectedRoutes) > 0 {
		t.Errorf("Missing routes: %v", expectedRoutes)
	}
}
