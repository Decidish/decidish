package controller

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"personalization/internal/client"
	"personalization/internal/config"
	"personalization/internal/service"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
)

func setupRecipeTestRouter(controller *RecipeController) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	controller.AddMappings(r)
	return r
}

func createTestRecipeService(db *sql.DB) service.RecipeService {
	cfg := config.ApplicationConfig{
		JWTSecret:         "test-secret",
		DBConnectionUrl:   "test-db-url",
		EmbedderServerUrl: "http://localhost:8000",
	}
	mlClient := client.NewClient()
	return service.NewRecipeService(cfg, db, mlClient)
}

func TestNewRecipeController(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)

	if controller == nil {
		t.Error("Expected controller to be initialized")
	}
}

func TestRecipeController_AddMappings(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	controller.AddMappings(router)

	routes := router.Routes()

	expectedRoutes := map[string]string{
		"/recipes/add/":      "POST",
		"/recipes/add/rewe/": "POST",
		"/admin/stats":       "GET",
		"/recipes/search":    "GET",
		"/categories":        "GET",
		"/keywords":          "GET",
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

func TestRecipeController_GetAdminStats_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	rows := sqlmock.NewRows([]string{"total", "today", "users"}).
		AddRow(150, 20, 10)
	mock.ExpectQuery("SELECT").WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/admin/stats", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["total_recipes"] != float64(150) {
		t.Errorf("Expected total_recipes 150, got %v", response["total_recipes"])
	}
	if response["imported_today"] != float64(20) {
		t.Errorf("Expected imported_today 20, got %v", response["imported_today"])
	}
	if response["active_users"] != float64(10) {
		t.Errorf("Expected active_users 10, got %v", response["active_users"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecipeController_GetAdminStats_Error(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	mock.ExpectQuery("SELECT").WillReturnError(sql.ErrConnDone)

	req, _ := http.NewRequest("GET", "/admin/stats", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecipeController_GetCategories_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("Italian").
		AddRow("Mexican").
		AddRow("Indian")
	mock.ExpectQuery("SELECT name FROM categories").WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/categories", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

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

func TestRecipeController_GetCategories_WithQueryParam(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("Italian")
	mock.ExpectQuery("SELECT name FROM categories WHERE LOWER\\(name\\) LIKE").
		WithArgs("%ital%", 5).
		WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/categories?q=ital", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecipeController_GetCategories_Error(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	mock.ExpectQuery("SELECT name FROM categories").WillReturnError(sql.ErrConnDone)

	req, _ := http.NewRequest("GET", "/categories", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecipeController_GetKeywords_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("vegetarian").
		AddRow("vegan").
		AddRow("quick")
	mock.ExpectQuery("SELECT name FROM keywords").WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/keywords", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

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

func TestRecipeController_GetKeywords_WithQueryParam(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("vegetarian").
		AddRow("vegan")
	mock.ExpectQuery("SELECT name FROM keywords WHERE LOWER\\(name\\) LIKE").
		WithArgs("%veg%", 5).
		WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/keywords?q=veg", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecipeController_GetKeywords_Error(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	mock.ExpectQuery("SELECT name FROM keywords").WillReturnError(sql.ErrConnDone)

	req, _ := http.NewRequest("GET", "/keywords", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecipeController_SearchRecipes_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	// Mock count query
	countRows := sqlmock.NewRows([]string{"count"}).AddRow(1)
	mock.ExpectQuery("SELECT COUNT").WillReturnRows(countRows)

	// Mock IDs query (new step in optimized search)
	idsRows := sqlmock.NewRows([]string{"id"}).AddRow(1)
	mock.ExpectQuery("SELECT re.id FROM recipes re").WillReturnRows(idsRows)

	// Mock full data query with CTEs
	searchRows := sqlmock.NewRows([]string{
		"id", "title", "description", "instructions", "image",
		"cook_time", "prep_time", "total_time", "rating",
		"calories", "serving_size", "yields",
		"ingredients", "keywords", "allergens",
	}).
		AddRow(1, "Test Recipe", "A test recipe", "Cook it...", "http://img.com/test.jpg",
			15, 5, 20, 4.5, "300", "2 servings", "2 portions",
			"ingredient1, ingredient2", "keyword1, keyword2", "allergen1")
	mock.ExpectQuery("WITH SelectedRecipes AS").WillReturnRows(searchRows)

	req, _ := http.NewRequest("GET", "/recipes/search", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["total_count"] != float64(1) {
		t.Errorf("Expected total_count 1, got %v", response["total_count"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecipeController_SearchRecipes_WithQueryParam(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	// Mock count query with search term
	countRows := sqlmock.NewRows([]string{"count"}).AddRow(1)
	mock.ExpectQuery("SELECT COUNT").WithArgs("%pasta%").WillReturnRows(countRows)

	// Mock IDs query (new step in optimized search)
	idsRows := sqlmock.NewRows([]string{"id"}).AddRow(1)
	mock.ExpectQuery("SELECT re.id FROM recipes re").WithArgs("%pasta%").WillReturnRows(idsRows)

	// Mock full data query with CTEs - only 1 arg since there's only 1 recipe ID
	searchRows := sqlmock.NewRows([]string{
		"id", "title", "description", "instructions", "image",
		"cook_time", "prep_time", "total_time", "rating",
		"calories", "serving_size", "yields",
		"ingredients", "keywords", "allergens",
	}).
		AddRow(1, "Pasta", "Pasta dish", "Cook pasta...", "http://img.com/pasta.jpg",
			20, 10, 30, 4.5, "400", "2 servings", "4 portions",
			"pasta, tomato", "italian", "gluten")
	mock.ExpectQuery("WITH SelectedRecipes AS").WithArgs(1).WillReturnRows(searchRows)

	req, _ := http.NewRequest("GET", "/recipes/search?q=pasta", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecipeController_SearchRecipes_Error(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	mock.ExpectQuery("SELECT COUNT").WillReturnError(sql.ErrConnDone)

	req, _ := http.NewRequest("GET", "/recipes/search", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecipeController_AddRecipe_InvalidJSON(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	req, _ := http.NewRequest("POST", "/recipes/add/", strings.NewReader("invalid json"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

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

func TestRecipeController_AddRecipe_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	mock.ExpectBegin().WillReturnError(sql.ErrConnDone)

	body := `{"recipe_url": "https://example.com/recipe"}`
	req, _ := http.NewRequest("POST", "/recipes/add/", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecipeController_AddReweRecipes_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	mock.ExpectBegin().WillReturnError(sql.ErrConnDone)

	req, _ := http.NewRequest("POST", "/recipes/add/rewe/", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecipeController_SearchRecipes_WithPagination(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	// Mock count query
	countRows := sqlmock.NewRows([]string{"count"}).AddRow(50)
	mock.ExpectQuery("SELECT COUNT").WillReturnRows(countRows)

	// Mock IDs query - page 2 with limit 10
	idsRows := sqlmock.NewRows([]string{"id"}).AddRow(11)
	mock.ExpectQuery("SELECT re.id FROM recipes re").WillReturnRows(idsRows)

	// Mock full data query with CTEs - only 1 arg since there's only 1 recipe ID
	searchRows := sqlmock.NewRows([]string{
		"id", "title", "description", "instructions", "image",
		"cook_time", "prep_time", "total_time", "rating",
		"calories", "serving_size", "yields",
		"ingredients", "keywords", "allergens",
	}).
		AddRow(11, "Recipe 11", "Description", "Instructions", "http://img.com/11.jpg",
			15, 5, 20, 4.0, "300", "2 servings", "2 portions",
			"ingredient", "keyword", "allergen")
	mock.ExpectQuery("WITH SelectedRecipes AS").WithArgs(11).WillReturnRows(searchRows)

	req, _ := http.NewRequest("GET", "/recipes/search?page=2&limit=10", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["total_count"] != float64(50) {
		t.Errorf("Expected total_count 50, got %v", response["total_count"])
	}

	// 50 total / 10 per page = 5 pages
	if response["total_pages"] != float64(5) {
		t.Errorf("Expected total_pages 5, got %v", response["total_pages"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecipeController_GetCategories_WithLimitParam(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("Cat1").
		AddRow("Cat2")
	mock.ExpectQuery("SELECT name FROM categories ORDER BY name LIMIT").
		WithArgs(20).
		WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/categories?limit=20", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecipeController_GetKeywords_WithLimitParam(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recipeService := createTestRecipeService(db)
	controller := NewRecipeController(recipeService)
	router := setupRecipeTestRouter(controller)

	rows := sqlmock.NewRows([]string{"name"}).
		AddRow("Kw1").
		AddRow("Kw2")
	mock.ExpectQuery("SELECT name FROM keywords ORDER BY name LIMIT").
		WithArgs(20).
		WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/keywords?limit=20", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}
