package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
	"github.com/lib/pq"
)

// Recipe represents a recipe row in the DB.
type Recipe struct {
	ID          int64     `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Ingredients []string  `json:"ingredients"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Repository wraps a sql.DB connection pool.
type Repository struct {
	db *sql.DB
}

// NewRepository opens a connection pool to Postgres using the provided DSN.
// Example DSN: "postgres://user:pass@localhost:5432/dbname?sslmode=disable"
func NewRepository(dsn string) (*Repository, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("open postgres: %w", err)
	}

	// Optional sensible defaults; tune as needed.
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)

	// verify connection with a short timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}

	return &Repository{db: db}, nil
}

// Close closes the underlying DB pool.
func (r *Repository) Close() error {
	if r == nil || r.db == nil {
		return nil
	}
	return r.db.Close()
}

// GetRecipeByID fetches a recipe by id.
func (r *Repository) GetRecipeByID(ctx context.Context, id int64) (*Recipe, error) {
	const q = `
SELECT id, title, description, ingredients, created_at, updated_at
  FROM recipes
 WHERE id = $1
`
	row := r.db.QueryRowContext(ctx, q, id)
	var rec Recipe
	var ingredients pq.StringArray
	if err := row.Scan(&rec.ID, &rec.Title, &rec.Description, &ingredients, &rec.CreatedAt, &rec.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // not found; caller can decide
		}
		return nil, fmt.Errorf("scan recipe: %w", err)
	}
	rec.Ingredients = []string(ingredients)
	return &rec, nil
}

// ListRecipes returns a slice of recipes with pagination.
func (r *Repository) ListRecipes(ctx context.Context, limit, offset int) ([]*Recipe, error) {
	const q = `
SELECT id, title, description, ingredients, created_at, updated_at
  FROM recipes
 ORDER BY id DESC
 LIMIT $1 OFFSET $2
`
	rows, err := r.db.QueryContext(ctx, q, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("query recipes: %w", err)
	}
	defer rows.Close()

	var out []*Recipe
	for rows.Next() {
		var rec Recipe
		var ingredients pq.StringArray
		if err := rows.Scan(&rec.ID, &rec.Title, &rec.Description, &ingredients, &rec.CreatedAt, &rec.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan recipe row: %w", err)
		}
		rec.Ingredients = []string(ingredients)
		out = append(out, &rec)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows err: %w", err)
	}
	return out, nil
}

// CreateRecipe inserts a new recipe and returns the new ID.
func (r *Repository) CreateRecipe(ctx context.Context, rec *Recipe) (int64, error) {
	const q = `
INSERT INTO recipes (title, description, ingredients, created_at, updated_at)
VALUES ($1, $2, $3, now(), now())
RETURNING id
`
	var id int64
	err := r.db.QueryRowContext(ctx, q, rec.Title, rec.Description, pq.Array(rec.Ingredients)).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("insert recipe: %w", err)
	}
	return id, nil
}

// UpdateRecipe updates title/description/ingredients and returns rows affected.
func (r *Repository) UpdateRecipe(ctx context.Context, rec *Recipe) (int64, error) {
	const q = `
UPDATE recipes
   SET title = $1, description = $2, ingredients = $3, updated_at = now()
 WHERE id = $4
`
	res, err := r.db.ExecContext(ctx, q, rec.Title, rec.Description, pq.Array(rec.Ingredients), rec.ID)
	if err != nil {
		return 0, fmt.Errorf("update recipe: %w", err)
	}
	ra, err := res.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("rows affected: %w", err)
	}
	return ra, nil
}

// DeleteRecipe deletes a recipe and returns rows affected.
func (r *Repository) DeleteRecipe(ctx context.Context, id int64) (int64, error) {
	const q = `DELETE FROM recipes WHERE id = $1`
	res, err := r.db.ExecContext(ctx, q, id)
	if err != nil {
		return 0, fmt.Errorf("delete recipe: %w", err)
	}
	ra, err := res.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("rows affected: %w", err)
	}
	return ra, nil
}