package service

import (
	"fmt"
	"personalization/tests"
	"testing"

	"personalization/internal/config"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestProcessInBatches_WithMockDBAndEmbedder(t *testing.T) {
	// Arrange
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock db: %v", err)
	}
	defer db.Close()
	mock.ExpectBegin()
	mock.ExpectCommit()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("failed to begin tx: %v", err)
	}

	total := 200
	ids := make([]int, total)
	strs := make([]string, total)
	for i := 0; i < total; i++ {
		ids[i] = i + 1
		strs[i] = fmt.Sprintf("recipe-%d", i+1)
	}

	ts := tests.NewMockEmbedderServer()
	defer ts.Close()

	cfg := config.ApplicationConfig{
		EmbedderServerUrl: ts.URL,
	}

	// Act
	if err := processInBatches(cfg, ids, strs, tx); err != nil {
		t.Fatalf("processInBatches returned error: %v", err)
	}

	// Assert
	if err := tx.Commit(); err != nil {
		t.Fatalf("tx commit failed: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("there were unfulfilled expectations: %v", err)
	}
}
