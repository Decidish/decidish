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

func setupUserTestContext(method, path string, body string) (*gin.Context, *httptest.ResponseRecorder) {
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

func createTestUserService(db *sql.DB) *UserService {
	cfg := config.ApplicationConfig{
		JWTSecret:         "test-secret",
		DBConnectionUrl:   "test-db-url",
		EmbedderServerUrl: "http://localhost:8000",
	}
	mlClient := client.NewClient()
	return NewUserService(cfg, db, mlClient)
}

func TestNewUserService(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestUserService(db)

	if service.DB != db {
		t.Error("Expected DB to be set correctly")
	}
	if service.MLClient == nil {
		t.Error("Expected MLClient to be initialized")
	}
}

func TestIsUserEmbeddingReady_True(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestUserService(db)

	rows := sqlmock.NewRows([]string{"exists"}).AddRow(true)
	mock.ExpectQuery("SELECT true").
		WithArgs("test-user-123").
		WillReturnRows(rows)

	ctx, w := setupUserTestContext("GET", "/user/isembedded", "")
	ctx.Set("user_id", "test-user-123")

	service.IsUserEmbeddingReady(ctx)

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

func TestIsUserEmbeddingReady_False(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestUserService(db)

	mock.ExpectQuery("SELECT true").
		WithArgs("test-user-456").
		WillReturnError(sql.ErrNoRows)

	ctx, w := setupUserTestContext("GET", "/user/isembedded", "")
	ctx.Set("user_id", "test-user-456")

	service.IsUserEmbeddingReady(ctx)

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

func TestIsUserEmbeddingReady_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestUserService(db)

	mock.ExpectQuery("SELECT true").
		WithArgs("test-user-789").
		WillReturnError(sql.ErrConnDone)

	ctx, w := setupUserTestContext("GET", "/user/isembedded", "")
	ctx.Set("user_id", "test-user-789")

	service.IsUserEmbeddingReady(ctx)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestSetSelectedUserMarketId_InvalidJSON(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestUserService(db)

	ctx, w := setupUserTestContext("POST", "/user/market", "invalid json")
	ctx.Set("user_id", "test-user")

	service.SetSelectedUserMarketId(ctx)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestSetSelectedUserMarketId_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestUserService(db)

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE user_preferences").
		WithArgs("market-123", "test-user").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	body := `{"market_id": "market-123"}`
	ctx, w := setupUserTestContext("POST", "/user/market", body)
	ctx.Set("user_id", "test-user")

	service.SetSelectedUserMarketId(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetUserSelectedMarket_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestUserService(db)

	rows := sqlmock.NewRows([]string{"market_id"}).AddRow(int64(456))
	mock.ExpectQuery("SELECT market_id FROM user_preferences").
		WithArgs("test-user").
		WillReturnRows(rows)

	ctx, w := setupUserTestContext("GET", "/user/market", "")
	ctx.Set("user_id", "test-user")

	service.GetUserSelectedMarket(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["marketId"] != float64(456) {
		t.Errorf("Expected marketId 456, got '%v'", response["marketId"])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetUserSelectedMarket_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestUserService(db)

	mock.ExpectQuery("SELECT market_id FROM user_preferences").
		WithArgs("test-user").
		WillReturnError(sql.ErrNoRows)

	ctx, w := setupUserTestContext("GET", "/user/market", "")
	ctx.Set("user_id", "test-user")

	service.GetUserSelectedMarket(ctx)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestGetUserSelectedMarket_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestUserService(db)

	mock.ExpectQuery("SELECT market_id FROM user_preferences").
		WithArgs("test-user").
		WillReturnError(sql.ErrConnDone)

	ctx, w := setupUserTestContext("GET", "/user/market", "")
	ctx.Set("user_id", "test-user")

	service.GetUserSelectedMarket(ctx)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecordUserAction_InvalidAction(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestUserService(db)

	ctx, w := setupUserTestContext("POST", "/user/record/invalid/123", "")
	ctx.Set("user_id", "test-user")
	ctx.Params = gin.Params{
		{Key: "action", Value: "invalid"},
		{Key: "recipeID", Value: "123"},
	}

	service.RecordUserAction(ctx)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["error"] != "invalid action. must be 'like', 'dislike', '1', '0', 'true', or 'false'" {
		t.Errorf("Expected specific error message, got '%v'", response["error"])
	}
}

func TestRecordUserAction_InvalidRecipeID(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestUserService(db)

	ctx, w := setupUserTestContext("POST", "/user/record/like/invalid", "")
	ctx.Set("user_id", "test-user")
	ctx.Params = gin.Params{
		{Key: "action", Value: "like"},
		{Key: "recipeID", Value: "invalid"},
	}

	service.RecordUserAction(ctx)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["error"] != "invalid recipe ID" {
		t.Errorf("Expected error 'invalid recipe ID', got '%v'", response["error"])
	}
}

func TestRecordUserAction_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestUserService(db)

	mock.ExpectBegin()
	mock.ExpectQuery("WITH deleted AS").
		WithArgs("test-user", 123, true, 99).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
	mock.ExpectCommit()

	ctx, w := setupUserTestContext("POST", "/user/record/like/123", "")
	ctx.Set("user_id", "test-user")
	ctx.Params = gin.Params{
		{Key: "action", Value: "like"},
		{Key: "recipeID", Value: "123"},
	}

	service.RecordUserAction(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestRecordUserAction_DislikeAction(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestUserService(db)

	mock.ExpectBegin()
	mock.ExpectQuery("WITH deleted AS").
		WithArgs("test-user", 456, false, 99).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(2))
	mock.ExpectCommit()

	ctx, w := setupUserTestContext("POST", "/user/record/dislike/456", "")
	ctx.Set("user_id", "test-user")
	ctx.Params = gin.Params{
		{Key: "action", Value: "dislike"},
		{Key: "recipeID", Value: "456"},
	}

	service.RecordUserAction(ctx)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Unfulfilled expectations: %v", err)
	}
}

func TestCreateUserPreferences_InvalidJSON(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer db.Close()

	service := createTestUserService(db)

	ctx, w := setupUserTestContext("POST", "/user/preferences", "invalid json")
	ctx.Set("user_id", "test-user")

	service.CreateUserPreferences(ctx)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}
