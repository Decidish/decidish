package repository

import (
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestParseIngredient(t *testing.T) {
	// Arrange
	ingredient := "1 cup of sugar"

	// Act
	qty, unit, name, _ := parseIngredient(ingredient)

	// Assert
	if qty == nil || *qty != "1" {
		t.Errorf("Expected qty to be '1', got %v", qty)
	}

	if unit == nil || *unit != "cup" {
		t.Errorf("Expected unit to be 'cup', got %v", unit)
	}

	if name == nil || *name != "of sugar" {
		t.Errorf("Expected name to be 'of sugar', got %v", name)
	}
}

func TestSaveRecipe(t *testing.T) {
	// Arrange
	db, s, err := sqlmock.New()
	if err != nil {
		return
	}

	rows := sqlmock.NewRows([]string{"id"}).AddRow(1)

	s.ExpectBegin()
	s.ExpectQuery(regexp.QuoteMeta(`
			INSERT INTO recipes (title, description, instructions, cook_time, prep_time, total_time, image, rating, serving_size, calories, yields)
			values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			ON CONFLICT (title) DO NOTHING
			RETURNING id`)).WithArgs(
		"Test Recipe",
		"", "", 0, 0, 0, "", 0.0, "", "", "", // Ensure these match your actual inputs exactly
	).WillReturnRows(rows)
	s.ExpectCommit()

	tx, err := db.Begin()
	if err != nil {
		return
	}

	toSaveRecipe := &Recipe{
		Title: "Test Recipe",
	}

	// Act
	_, err = SaveRecipe(toSaveRecipe, tx)

	// Assert
	if err != nil {
		t.Fatal("Failed to save recipe:", err)
	}

	if err := tx.Commit(); err != nil {
		t.Fatalf("tx commit failed: %v", err)
	}

	if err := s.ExpectationsWereMet(); err != nil {
		t.Fatalf("there were unfulfilled expectations: %v", err)
	}
}
