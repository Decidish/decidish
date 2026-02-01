package service

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"personalization/internal/repository"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
)

func setupRecommenderTestContext(method, path string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(method, path, nil)
	c.Request = req
	return c, w
}

func createTestRecommenderService(db *sql.DB) *RecommenderService {
	repo := repository.NewRecommenderRepository()
	return NewRecommenderService(repo, db)
}

func TestNewRecommenderService(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestRecommenderService(db)

	if service.DB != db {
		t.Error("Expected DB to be set correctly")
	}
}

func TestRecommendRecipeForUser_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestRecommenderService(db)

	mock.ExpectBegin()

	// Mock the query result
	rows := sqlmock.NewRows([]string{
		"id", "title", "description", "instructions",
		"cook_time", "prep_time", "total_time", "image",
		"rating", "serving_size", "calories", "yields",
		"all_keywords", "all_ingredients", "all_allergens", "all_categories",
	}).
		AddRow(1, "Test Recipe", "A test description", "Cook it well",
			20, 10, 30, "http://img.com/test.jpg",
			4.5, "2 servings", "400", "4 portions",
			"vegetarian, quick", "pasta, tomato, cheese", "gluten, dairy", "Italian").
		AddRow(2, "Another Recipe", "Another description", "Another instruction",
			15, 5, 20, "http://img.com/another.jpg",
			4.8, "4 servings", "300", "2 portions",
			"vegan", "rice, vegetables", "", "Asian")

	mock.ExpectQuery("WITH recursive user_vec AS").
		WithArgs("test-user-123").
		WillReturnRows(rows)

	mock.ExpectCommit()

	ctx, w := setupRecommenderTestContext("GET", "/recipes/recommend")
	ctx.Set("user_id", "test-user-123")

	service.RecommendRecipeForUser(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response []repository.Recipe
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(response) != 2 {
		t.Errorf("Expected 2 recipes, got %d", len(response))
	}

	if response[0].Title != "Test Recipe" {
		t.Errorf("Expected title 'Test Recipe', got '%s'", response[0].Title)
	}

	if len(response[0].KeyWords) != 2 {
		t.Errorf("Expected 2 keywords, got %d", len(response[0].KeyWords))
	}

	if len(response[0].Ingredients) != 3 {
		t.Errorf("Expected 3 ingredients, got %d", len(response[0].Ingredients))
	}

	if len(response[0].Allergies) != 2 {
		t.Errorf("Expected 2 allergies, got %d", len(response[0].Allergies))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecommendRecipeForUser_EmptyResult(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestRecommenderService(db)

	mock.ExpectBegin()

	// Return empty result set
	rows := sqlmock.NewRows([]string{
		"id", "title", "description", "instructions",
		"cook_time", "prep_time", "total_time", "image",
		"rating", "serving_size", "calories", "yields",
		"all_keywords", "all_ingredients", "all_allergens", "all_categories",
	})

	mock.ExpectQuery("WITH recursive user_vec AS").
		WithArgs("test-user-456").
		WillReturnRows(rows)

	mock.ExpectCommit()

	ctx, w := setupRecommenderTestContext("GET", "/recipes/recommend")
	ctx.Set("user_id", "test-user-456")

	service.RecommendRecipeForUser(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	// Should return null for empty slice (Go behavior)
	// or validate response is empty
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecommendRecipeForUser_DBQueryError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestRecommenderService(db)

	mock.ExpectBegin()
	mock.ExpectQuery("WITH recursive user_vec AS").
		WithArgs("test-user-789").
		WillReturnError(sql.ErrConnDone)
	mock.ExpectRollback()

	ctx, w := setupRecommenderTestContext("GET", "/recipes/recommend")
	ctx.Set("user_id", "test-user-789")

	service.RecommendRecipeForUser(ctx)

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

func TestRecommendRecipeForUser_NoUserId(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestRecommenderService(db)

	mock.ExpectBegin()

	ctx, _ := setupRecommenderTestContext("GET", "/recipes/recommend")
	// Don't set user_id - should panic

	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Expected panic for missing user_id")
		}
		mock.ExpectRollback()
	}()

	service.RecommendRecipeForUser(ctx)
}

func TestRecommendRecipeForUser_TransactionBeginError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestRecommenderService(db)

	mock.ExpectBegin().WillReturnError(sql.ErrConnDone)

	ctx, _ := setupRecommenderTestContext("GET", "/recipes/recommend")
	ctx.Set("user_id", "test-user")

	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Expected panic for transaction begin error")
		}
	}()

	service.RecommendRecipeForUser(ctx)
}

func TestRecommendRecipeForUser_WithEmptyStrings(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestRecommenderService(db)

	mock.ExpectBegin()

	// Test with empty strings for keywords, ingredients, allergens
	rows := sqlmock.NewRows([]string{
		"id", "title", "description", "instructions",
		"cook_time", "prep_time", "total_time", "image",
		"rating", "serving_size", "calories", "yields",
		"all_keywords", "all_ingredients", "all_allergens", "all_categories",
	}).
		AddRow(1, "Simple Recipe", "Simple description", "Simple instructions",
			10, 5, 15, "http://img.com/simple.jpg",
			3.5, "1 serving", "200", "1 portion",
			"", "", "", "") // Empty strings

	mock.ExpectQuery("WITH recursive user_vec AS").
		WithArgs("test-user-empty").
		WillReturnRows(rows)

	mock.ExpectCommit()

	ctx, w := setupRecommenderTestContext("GET", "/recipes/recommend")
	ctx.Set("user_id", "test-user-empty")

	service.RecommendRecipeForUser(ctx)

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

	// Empty strings should result in empty slices
	if len(response[0].KeyWords) != 0 {
		t.Errorf("Expected 0 keywords, got %d", len(response[0].KeyWords))
	}

	if len(response[0].Ingredients) != 0 {
		t.Errorf("Expected 0 ingredients, got %d", len(response[0].Ingredients))
	}

	if len(response[0].Allergies) != 0 {
		t.Errorf("Expected 0 allergies, got %d", len(response[0].Allergies))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecommendRecipeForUser_CommitError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestRecommenderService(db)

	mock.ExpectBegin()

	rows := sqlmock.NewRows([]string{
		"id", "title", "description", "instructions",
		"cook_time", "prep_time", "total_time", "image",
		"rating", "serving_size", "calories", "yields",
		"all_keywords", "all_ingredients", "all_allergens", "all_categories",
	}).
		AddRow(1, "Test Recipe", "Description", "Instructions",
			20, 10, 30, "http://img.com/test.jpg",
			4.5, "2 servings", "400", "4 portions",
			"keyword", "ingredient", "allergen", "category")

	mock.ExpectQuery("WITH recursive user_vec AS").
		WithArgs("test-user-commit").
		WillReturnRows(rows)

	mock.ExpectCommit().WillReturnError(sql.ErrConnDone)

	ctx, _ := setupRecommenderTestContext("GET", "/recipes/recommend")
	ctx.Set("user_id", "test-user-commit")

	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Expected panic for commit error")
		}
	}()

	service.RecommendRecipeForUser(ctx)
}
