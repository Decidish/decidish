package controller

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"personalization/internal/repository"
	"personalization/internal/service"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
)

func setupRecommenderTestRouter(controller *RecommenderController) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Create a group and add mappings
	group := r.Group("/")
	controller.AddMappings(group)

	return r
}

func createTestRecommenderService(db *sql.DB) *service.RecommenderService {
	repo := repository.NewRecommenderRepository()
	return service.NewRecommenderService(repo, db)
}

func TestNewRecommenderController(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recommenderService := createTestRecommenderService(db)
	controller := NewRecommenderController(*recommenderService)

	if controller == nil {
		t.Error("Expected controller to be initialized")
	}
}

func TestRecommenderController_AddMappings(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recommenderService := createTestRecommenderService(db)
	controller := NewRecommenderController(*recommenderService)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("/")
	controller.AddMappings(group)

	routes := router.Routes()

	expectedRoutes := map[string]string{
		"/recipes/recommend": "GET",
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

func TestRecommenderController_RecommendRecipeForUser_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recommenderService := createTestRecommenderService(db)
	controller := NewRecommenderController(*recommenderService)

	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Add middleware to set user_id
	router.Use(func(c *gin.Context) {
		c.Set("user_id", "test-user-123")
		c.Next()
	})

	group := router.Group("/")
	controller.AddMappings(group)

	mock.ExpectBegin()

	rows := sqlmock.NewRows([]string{
		"id", "title", "description", "instructions",
		"cook_time", "prep_time", "total_time", "image",
		"rating", "serving_size", "calories", "yields",
		"all_keywords", "all_ingredients", "all_allergens", "all_categories",
	}).
		AddRow(1, "Recommended Recipe", "Delicious recipe", "Cook it well",
			25, 15, 40, "http://img.com/recommended.jpg",
			4.7, "3 servings", "450", "3 portions",
			"healthy, quick", "chicken, vegetables, rice", "none", "Healthy")

	mock.ExpectQuery("WITH recursive user_vec AS").
		WithArgs("test-user-123").
		WillReturnRows(rows)

	mock.ExpectCommit()

	req, _ := http.NewRequest("GET", "/recipes/recommend", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response []repository.Recipe
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(response) != 1 {
		t.Errorf("Expected 1 recipe, got %d", len(response))
	}

	if response[0].Title != "Recommended Recipe" {
		t.Errorf("Expected title 'Recommended Recipe', got '%s'", response[0].Title)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecommenderController_RecommendRecipeForUser_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recommenderService := createTestRecommenderService(db)
	controller := NewRecommenderController(*recommenderService)

	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Add middleware to set user_id
	router.Use(func(c *gin.Context) {
		c.Set("user_id", "test-user-456")
		c.Next()
	})

	group := router.Group("/")
	controller.AddMappings(group)

	mock.ExpectBegin()
	mock.ExpectQuery("WITH recursive user_vec AS").
		WithArgs("test-user-456").
		WillReturnError(sql.ErrConnDone)
	mock.ExpectRollback()

	req, _ := http.NewRequest("GET", "/recipes/recommend", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["error"] == nil {
		t.Error("Expected error in response")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecommenderController_RecommendRecipeForUser_MultipleRecipes(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recommenderService := createTestRecommenderService(db)
	controller := NewRecommenderController(*recommenderService)

	gin.SetMode(gin.TestMode)
	router := gin.New()

	router.Use(func(c *gin.Context) {
		c.Set("user_id", "test-user-multi")
		c.Next()
	})

	group := router.Group("/")
	controller.AddMappings(group)

	mock.ExpectBegin()

	rows := sqlmock.NewRows([]string{
		"id", "title", "description", "instructions",
		"cook_time", "prep_time", "total_time", "image",
		"rating", "serving_size", "calories", "yields",
		"all_keywords", "all_ingredients", "all_allergens", "all_categories",
	}).
		AddRow(1, "Italian Pasta", "Classic Italian", "Boil pasta...",
			20, 10, 30, "http://img.com/pasta.jpg",
			4.5, "2 servings", "500", "2 portions",
			"italian, pasta", "spaghetti, tomato, garlic", "gluten", "Italian").
		AddRow(2, "Thai Curry", "Spicy Thai curry", "Cook curry...",
			30, 15, 45, "http://img.com/curry.jpg",
			4.8, "4 servings", "400", "4 portions",
			"thai, spicy", "coconut milk, chicken, vegetables", "none", "Thai").
		AddRow(3, "Mexican Tacos", "Authentic tacos", "Prepare filling...",
			15, 20, 35, "http://img.com/tacos.jpg",
			4.6, "3 servings", "350", "6 tacos",
			"mexican, quick", "beef, tortilla, salsa", "gluten", "Mexican")

	mock.ExpectQuery("WITH recursive user_vec AS").
		WithArgs("test-user-multi").
		WillReturnRows(rows)

	mock.ExpectCommit()

	req, _ := http.NewRequest("GET", "/recipes/recommend", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response []repository.Recipe
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(response) != 3 {
		t.Errorf("Expected 3 recipes, got %d", len(response))
	}

	// Verify diversity - different categories
	categories := make(map[string]bool)
	for _, recipe := range response {
		categories[recipe.Category] = true
	}

	if len(categories) != 3 {
		t.Errorf("Expected 3 different categories for diversity, got %d", len(categories))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecommenderController_RecommendRecipeForUser_EmptyResult(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recommenderService := createTestRecommenderService(db)
	controller := NewRecommenderController(*recommenderService)

	gin.SetMode(gin.TestMode)
	router := gin.New()

	router.Use(func(c *gin.Context) {
		c.Set("user_id", "test-user-empty")
		c.Next()
	})

	group := router.Group("/")
	controller.AddMappings(group)

	mock.ExpectBegin()

	// Empty result
	rows := sqlmock.NewRows([]string{
		"id", "title", "description", "instructions",
		"cook_time", "prep_time", "total_time", "image",
		"rating", "serving_size", "calories", "yields",
		"all_keywords", "all_ingredients", "all_allergens", "all_categories",
	})

	mock.ExpectQuery("WITH recursive user_vec AS").
		WithArgs("test-user-empty").
		WillReturnRows(rows)

	mock.ExpectCommit()

	req, _ := http.NewRequest("GET", "/recipes/recommend", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecommenderController_RecommendRecipeForUser_WithAllergies(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	recommenderService := createTestRecommenderService(db)
	controller := NewRecommenderController(*recommenderService)

	gin.SetMode(gin.TestMode)
	router := gin.New()

	router.Use(func(c *gin.Context) {
		c.Set("user_id", "test-user-allergies")
		c.Next()
	})

	group := router.Group("/")
	controller.AddMappings(group)

	mock.ExpectBegin()

	// Recipe without common allergens (filtered by the query)
	rows := sqlmock.NewRows([]string{
		"id", "title", "description", "instructions",
		"cook_time", "prep_time", "total_time", "image",
		"rating", "serving_size", "calories", "yields",
		"all_keywords", "all_ingredients", "all_allergens", "all_categories",
	}).
		AddRow(1, "Allergen-Free Recipe", "Safe for all", "Easy preparation",
			15, 5, 20, "http://img.com/safe.jpg",
			4.9, "2 servings", "250", "2 portions",
			"allergen-free, healthy", "rice, vegetables, olive oil", "", "Healthy")

	mock.ExpectQuery("WITH recursive user_vec AS").
		WithArgs("test-user-allergies").
		WillReturnRows(rows)

	mock.ExpectCommit()

	req, _ := http.NewRequest("GET", "/recipes/recommend", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response []repository.Recipe
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(response) != 1 {
		t.Errorf("Expected 1 recipe, got %d", len(response))
	}

	// Verify no allergies in the returned recipe
	if len(response[0].Allergies) != 0 {
		t.Errorf("Expected 0 allergies, got %d", len(response[0].Allergies))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}
