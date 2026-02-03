package service

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"personalization/internal/client"
	"personalization/internal/config"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
)

func setupTestContext(method, path string, body string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	c.Request = req
	return c, w
}

func createTestService(db *sql.DB) RecipeService {
	cfg := config.ApplicationConfig{
		JWTSecret:         "test-secret",
		DBConnectionUrl:   "test-db-url",
		EmbedderServerUrl: "http://localhost:8000",
	}
	mlClient := client.NewClient()
	return NewRecipeService(cfg, db, mlClient)
}

func TestNewRecipeService(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	if service.DB != db {
		t.Error("Expected DB to be set correctly")
	}
	if service.MLClient == nil {
		t.Error("Expected MLClient to be initialized")
	}
	if service.Repo == nil {
		t.Error("Expected Repo to be initialized")
	}
}

func TestGetAdminStats_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	rows := sqlmock.NewRows([]string{"total", "today", "users"}).
		AddRow(100, 10, 5)
	mock.ExpectQuery("SELECT").WillReturnRows(rows)

	ctx, w := setupTestContext("GET", "/admin/stats", "")
	service.GetAdminStats(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["total_recipes"] != float64(100) {
		t.Errorf("Expected total_recipes 100, got %v", response["total_recipes"])
	}
	if response["imported_today"] != float64(10) {
		t.Errorf("Expected imported_today 10, got %v", response["imported_today"])
	}
	if response["active_users"] != float64(5) {
		t.Errorf("Expected active_users 5, got %v", response["active_users"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetAdminStats_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	mock.ExpectQuery("SELECT").WillReturnError(sql.ErrConnDone)

	ctx, w := setupTestContext("GET", "/admin/stats", "")
	service.GetAdminStats(ctx)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["error"] != "Failed to fetch stats" {
		t.Errorf("Expected error 'Failed to fetch stats', got '%v'", response["error"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetCategories_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("Italian").
		AddRow("Mexican").
		AddRow("Chinese")
	mock.ExpectQuery("SELECT name FROM categories").WillReturnRows(rows)

	ctx, w := setupTestContext("GET", "/categories", "")
	service.GetCategories(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	categories := response["categories"].([]interface{})
	if len(categories) != 3 {
		t.Errorf("Expected 3 categories, got %d", len(categories))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetCategories_WithQuery(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("Italian")
	mock.ExpectQuery("SELECT name FROM categories WHERE LOWER\\(name\\) LIKE").
		WithArgs("%ital%", 5).
		WillReturnRows(rows)

	ctx, w := setupTestContext("GET", "/categories?q=ital", "")
	ctx.Request.URL.RawQuery = "q=ital"
	service.GetCategories(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetCategories_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	mock.ExpectQuery("SELECT name FROM categories").WillReturnError(sql.ErrConnDone)

	ctx, w := setupTestContext("GET", "/categories", "")
	service.GetCategories(ctx)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["error"] != "Failed to list categories" {
		t.Errorf("Expected error 'Failed to list categories', got '%v'", response["error"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetKeywords_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("vegetarian").
		AddRow("vegan").
		AddRow("gluten-free")
	mock.ExpectQuery("SELECT name FROM keywords").WillReturnRows(rows)

	ctx, w := setupTestContext("GET", "/keywords", "")
	service.GetKeywords(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	keywords := response["keywords"].([]interface{})
	if len(keywords) != 3 {
		t.Errorf("Expected 3 keywords, got %d", len(keywords))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetKeywords_WithQuery(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("vegetarian").
		AddRow("vegan")
	mock.ExpectQuery("SELECT name FROM keywords WHERE LOWER\\(name\\) LIKE").
		WithArgs("%veg%", 5).
		WillReturnRows(rows)

	ctx, w := setupTestContext("GET", "/keywords?q=veg", "")
	ctx.Request.URL.RawQuery = "q=veg"
	service.GetKeywords(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetKeywords_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	mock.ExpectQuery("SELECT name FROM keywords").WillReturnError(sql.ErrConnDone)

	ctx, w := setupTestContext("GET", "/keywords", "")
	service.GetKeywords(ctx)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["error"] != "Failed to list keywords" {
		t.Errorf("Expected error 'Failed to list keywords', got '%v'", response["error"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestAddRecipe_InvalidJSON(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	ctx, w := setupTestContext("POST", "/recipes/add/", "invalid json")
	service.AddRecipe(ctx)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["error"] != "invalid request" {
		t.Errorf("Expected error 'invalid request', got '%v'", response["error"])
	}
}

func TestAddRecipe_DBTransactionError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	mock.ExpectBegin().WillReturnError(sql.ErrConnDone)

	body := `{"recipe_url": "https://example.com/recipe"}`
	ctx, w := setupTestContext("POST", "/recipes/add/", body)
	service.AddRecipe(ctx)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestAddReweRecipes_DBTransactionError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	mock.ExpectBegin().WillReturnError(sql.ErrConnDone)

	ctx, w := setupTestContext("POST", "/recipes/add/rewe/", "")
	service.AddReweRecipes(ctx)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestAddReweRecipes_CreateJobError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	mock.ExpectBegin()
	mock.ExpectQuery("INSERT INTO jobs").WillReturnError(sql.ErrConnDone)
	mock.ExpectRollback()

	ctx, w := setupTestContext("POST", "/recipes/add/rewe/", "")
	service.AddReweRecipes(ctx)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestAddReweRecipes_CommitError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	mock.ExpectBegin()
	rows := sqlmock.NewRows([]string{"id"}).AddRow(1)
	mock.ExpectQuery("INSERT INTO jobs").WillReturnRows(rows)
	mock.ExpectCommit().WillReturnError(sql.ErrConnDone)

	ctx, w := setupTestContext("POST", "/recipes/add/rewe/", "")
	service.AddReweRecipes(ctx)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestSearchRecipes_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	// The count query will fail
	mock.ExpectQuery("SELECT COUNT").WillReturnError(sql.ErrConnDone)

	ctx, w := setupTestContext("GET", "/recipes/search", "")
	service.SearchRecipes(ctx)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["error"] != "Failed to fetch recipes" {
		t.Errorf("Expected error 'Failed to fetch recipes', got '%v'", response["error"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestSearchRecipes_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	// Mock count query
	countRows := sqlmock.NewRows([]string{"count"}).AddRow(2)
	mock.ExpectQuery("SELECT COUNT").WillReturnRows(countRows)

	// Mock IDs query (new step in optimized search)
	idsRows := sqlmock.NewRows([]string{"id"}).AddRow(1).AddRow(2)
	mock.ExpectQuery("SELECT re.id FROM recipes re").WillReturnRows(idsRows)

	// Mock full data query with CTEs
	searchRows := sqlmock.NewRows([]string{
		"id", "title", "description", "instructions", "image",
		"cook_time", "prep_time", "total_time", "rating",
		"calories", "serving_size", "yields",
		"ingredients", "keywords", "allergens",
	}).
		AddRow(1, "Pasta Carbonara", "Delicious pasta", "Cook pasta...", "http://img.com/pasta.jpg",
			20, 10, 30, 4.5, "500", "2 servings", "4 portions",
			"pasta, eggs, bacon", "italian, quick", "gluten, eggs").
		AddRow(2, "Tacos", "Mexican tacos", "Prepare filling...", "http://img.com/tacos.jpg",
			15, 10, 25, 4.8, "400", "2 servings", "4 portions",
			"tortilla, beef, salsa", "mexican, quick", "gluten")
	mock.ExpectQuery("WITH SelectedRecipes AS").WillReturnRows(searchRows)

	ctx, w := setupTestContext("GET", "/recipes/search", "")
	service.SearchRecipes(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["total_count"] != float64(2) {
		t.Errorf("Expected total_count 2, got %v", response["total_count"])
	}

	recipes := response["recipes"].([]interface{})
	if len(recipes) != 2 {
		t.Errorf("Expected 2 recipes, got %d", len(recipes))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetCategories_CustomLimit(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("Italian").
		AddRow("Mexican")
	mock.ExpectQuery("SELECT name FROM categories ORDER BY name LIMIT").
		WithArgs(10).
		WillReturnRows(rows)

	ctx, w := setupTestContext("GET", "/categories?limit=10", "")
	ctx.Request.URL.RawQuery = "limit=10"
	service.GetCategories(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetKeywords_CustomLimit(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("vegetarian").
		AddRow("vegan")
	mock.ExpectQuery("SELECT name FROM keywords ORDER BY name LIMIT").
		WithArgs(10).
		WillReturnRows(rows)

	ctx, w := setupTestContext("GET", "/keywords?limit=10", "")
	ctx.Request.URL.RawQuery = "limit=10"
	service.GetKeywords(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetCategories_InvalidLimit(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	// Invalid limit (-1) should default to 5
	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("Italian")
	mock.ExpectQuery("SELECT name FROM categories ORDER BY name LIMIT").
		WithArgs(5).
		WillReturnRows(rows)

	ctx, w := setupTestContext("GET", "/categories?limit=-1", "")
	ctx.Request.URL.RawQuery = "limit=-1"
	service.GetCategories(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetKeywords_InvalidLimit(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestService(db)

	// Invalid limit (100, > 50) should default to 5
	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("vegetarian")
	mock.ExpectQuery("SELECT name FROM keywords ORDER BY name LIMIT").
		WithArgs(5).
		WillReturnRows(rows)

	ctx, w := setupTestContext("GET", "/keywords?limit=100", "")
	ctx.Request.URL.RawQuery = "limit=100"
	service.GetKeywords(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}
