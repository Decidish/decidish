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

func createTestUserService(db *sql.DB) *service.UserService {
	cfg := config.ApplicationConfig{
		JWTSecret:         "test-secret",
		DBConnectionUrl:   "test-db-url",
		EmbedderServerUrl: "http://localhost:8000",
	}
	mlClient := client.NewClient()
	return service.NewUserService(cfg, db, mlClient)
}

func createTestShoppingListService(db *sql.DB) *service.ShoppingListService {
	cfg := config.ApplicationConfig{
		JWTSecret:         "test-secret",
		DBConnectionUrl:   "test-db-url",
		EmbedderServerUrl: "http://localhost:8000",
	}
	return service.NewShoppingListService(cfg, db)
}

func createTestSavedRecipesService(db *sql.DB) *service.SavedRecipesService {
	cfg := config.ApplicationConfig{
		JWTSecret:         "test-secret",
		DBConnectionUrl:   "test-db-url",
		EmbedderServerUrl: "http://localhost:8000",
	}
	return service.NewSavedRecipesService(cfg, db)
}

func setupUserControllerTestRouter(controller *UserController) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Add middleware to set user_id
	r.Use(func(c *gin.Context) {
		c.Set("user_id", "test-user")
		c.Next()
	})

	group := r.Group("/")
	controller.AddMappings(group)

	return r
}

func TestNewUserController(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	userService := createTestUserService(db)
	shoppingService := createTestShoppingListService(db)
	savedRecipesService := createTestSavedRecipesService(db)

	controller := NewUserController(*userService, *shoppingService, *savedRecipesService)

	if controller == nil {
		t.Error("Expected controller to be initialized")
	}
}

func TestUserController_AddMappings(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	userService := createTestUserService(db)
	shoppingService := createTestShoppingListService(db)
	savedRecipesService := createTestSavedRecipesService(db)

	controller := NewUserController(*userService, *shoppingService, *savedRecipesService)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("/")
	controller.AddMappings(group)

	routes := router.Routes()

	// Verify routes are registered
	if len(routes) == 0 {
		t.Error("Expected routes to be registered")
	}

	// Verify expected routes exist
	expectedPaths := []string{
		"/user/preferences",
		"/user/market",
		"/user/isembedded",
		"/user/add-to-list",
		"/user/active/list",
		"/user/update/item",
		"/user/shopping/history",
		"/user/history",
		"/user/saved-recipes",
		"/user/saved-recipes/ids",
	}

	foundPaths := make(map[string]bool)
	for _, route := range routes {
		foundPaths[route.Path] = true
	}

	for _, path := range expectedPaths {
		if !foundPaths[path] {
			t.Errorf("Expected route %s to be registered", path)
		}
	}
}

func TestUserController_IsUserEmbeddingReady_True(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	userService := createTestUserService(db)
	shoppingService := createTestShoppingListService(db)
	savedRecipesService := createTestSavedRecipesService(db)

	controller := NewUserController(*userService, *shoppingService, *savedRecipesService)
	router := setupUserControllerTestRouter(controller)

	rows := sqlmock.NewRows([]string{"exists"}).AddRow(true)
	mock.ExpectQuery("SELECT true").
		WithArgs("test-user").
		WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/user/isembedded", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["ready"] != true {
		t.Errorf("Expected ready to be true, got %v", response["ready"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestUserController_IsUserEmbeddingReady_False(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	userService := createTestUserService(db)
	shoppingService := createTestShoppingListService(db)
	savedRecipesService := createTestSavedRecipesService(db)

	controller := NewUserController(*userService, *shoppingService, *savedRecipesService)
	router := setupUserControllerTestRouter(controller)

	mock.ExpectQuery("SELECT true").
		WithArgs("test-user").
		WillReturnError(sql.ErrNoRows)

	req, _ := http.NewRequest("GET", "/user/isembedded", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["ready"] != false {
		t.Errorf("Expected ready to be false, got %v", response["ready"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestUserController_GetUserSelectedMarket_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	userService := createTestUserService(db)
	shoppingService := createTestShoppingListService(db)
	savedRecipesService := createTestSavedRecipesService(db)

	controller := NewUserController(*userService, *shoppingService, *savedRecipesService)
	router := setupUserControllerTestRouter(controller)

	rows := sqlmock.NewRows([]string{"market_id"}).AddRow(int64(123))
	mock.ExpectQuery("SELECT market_id FROM user_preferences").
		WithArgs("test-user").
		WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/user/market", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["marketId"] != float64(123) {
		t.Errorf("Expected marketId 123, got '%v'", response["marketId"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestUserController_GetUserSelectedMarket_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	userService := createTestUserService(db)
	shoppingService := createTestShoppingListService(db)
	savedRecipesService := createTestSavedRecipesService(db)

	controller := NewUserController(*userService, *shoppingService, *savedRecipesService)
	router := setupUserControllerTestRouter(controller)

	mock.ExpectQuery("SELECT market_id FROM user_preferences").
		WithArgs("test-user").
		WillReturnError(sql.ErrNoRows)

	req, _ := http.NewRequest("GET", "/user/market", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestUserController_SetSelectedUserMarketId_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	userService := createTestUserService(db)
	shoppingService := createTestShoppingListService(db)
	savedRecipesService := createTestSavedRecipesService(db)

	controller := NewUserController(*userService, *shoppingService, *savedRecipesService)
	router := setupUserControllerTestRouter(controller)

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE user_preferences").
		WithArgs("market-456", "test-user").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	body := `{"market_id": "market-456"}`
	req, _ := http.NewRequest("POST", "/user/market", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestUserController_RecordUserAction_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	userService := createTestUserService(db)
	shoppingService := createTestShoppingListService(db)
	savedRecipesService := createTestSavedRecipesService(db)

	controller := NewUserController(*userService, *shoppingService, *savedRecipesService)
	router := setupUserControllerTestRouter(controller)

	mock.ExpectBegin()
	mock.ExpectQuery("WITH deleted AS").
		WithArgs("test-user", 456, true, 99).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
	mock.ExpectCommit()

	req, _ := http.NewRequest("POST", "/user/record/like/456", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestUserController_RecordUserAction_InvalidAction(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	userService := createTestUserService(db)
	shoppingService := createTestShoppingListService(db)
	savedRecipesService := createTestSavedRecipesService(db)

	controller := NewUserController(*userService, *shoppingService, *savedRecipesService)
	router := setupUserControllerTestRouter(controller)

	req, _ := http.NewRequest("POST", "/user/record/invalid/456", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestUserController_SaveRecipe_InvalidJSON(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	userService := createTestUserService(db)
	shoppingService := createTestShoppingListService(db)
	savedRecipesService := createTestSavedRecipesService(db)

	controller := NewUserController(*userService, *shoppingService, *savedRecipesService)
	router := setupUserControllerTestRouter(controller)

	req, _ := http.NewRequest("POST", "/user/saved-recipes", strings.NewReader("invalid"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestUserController_AddProductsToShoppingList_InvalidJSON(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	userService := createTestUserService(db)
	shoppingService := createTestShoppingListService(db)
	savedRecipesService := createTestSavedRecipesService(db)

	controller := NewUserController(*userService, *shoppingService, *savedRecipesService)
	router := setupUserControllerTestRouter(controller)

	req, _ := http.NewRequest("POST", "/user/add-to-list", strings.NewReader("invalid"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestUserController_CreateUserPreferences_InvalidJSON(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	userService := createTestUserService(db)
	shoppingService := createTestShoppingListService(db)
	savedRecipesService := createTestSavedRecipesService(db)

	controller := NewUserController(*userService, *shoppingService, *savedRecipesService)
	router := setupUserControllerTestRouter(controller)

	req, _ := http.NewRequest("POST", "/user/preferences", strings.NewReader("invalid"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestUserController_GetSavedRecipeIds_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	userService := createTestUserService(db)
	shoppingService := createTestShoppingListService(db)
	savedRecipesService := createTestSavedRecipesService(db)

	controller := NewUserController(*userService, *shoppingService, *savedRecipesService)
	router := setupUserControllerTestRouter(controller)

	rows := sqlmock.NewRows([]string{"recipe_id"}).
		AddRow(100).
		AddRow(200)
	mock.ExpectQuery("SELECT recipe_id FROM saved_recipes").
		WithArgs("test-user").
		WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/user/saved-recipes/ids", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response []int
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(response) != 2 {
		t.Errorf("Expected 2 recipe IDs, got %d", len(response))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestUserController_IsRecipeSaved_True(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	userService := createTestUserService(db)
	shoppingService := createTestShoppingListService(db)
	savedRecipesService := createTestSavedRecipesService(db)

	controller := NewUserController(*userService, *shoppingService, *savedRecipesService)
	router := setupUserControllerTestRouter(controller)

	rows := sqlmock.NewRows([]string{"exists"}).AddRow(true)
	mock.ExpectQuery("SELECT EXISTS").
		WithArgs("test-user", 123).
		WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/user/saved-recipes/123/check", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["saved"] != true {
		t.Errorf("Expected saved to be true, got %v", response["saved"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestUserController_IsRecipeSaved_False(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	userService := createTestUserService(db)
	shoppingService := createTestShoppingListService(db)
	savedRecipesService := createTestSavedRecipesService(db)

	controller := NewUserController(*userService, *shoppingService, *savedRecipesService)
	router := setupUserControllerTestRouter(controller)

	rows := sqlmock.NewRows([]string{"exists"}).AddRow(false)
	mock.ExpectQuery("SELECT EXISTS").
		WithArgs("test-user", 456).
		WillReturnRows(rows)

	req, _ := http.NewRequest("GET", "/user/saved-recipes/456/check", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["saved"] != false {
		t.Errorf("Expected saved to be false, got %v", response["saved"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}
