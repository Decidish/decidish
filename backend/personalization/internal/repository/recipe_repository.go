package repository

import (
	"database/sql"
	"fmt"
	"strings"
)

type RecipeRepository struct {
	db *sql.DB
}

func NewRecipeRepository(db *sql.DB) *RecipeRepository {
	return &RecipeRepository{db: db}
}

type SearchParams struct {
	Query      string
	Cuisine    string
	Difficulty string
	MaxTime    string
	Page       int
	Limit      int
}

type SearchResult struct {
	Recipes    []Recipe `json:"recipes"`
	TotalCount int      `json:"total_count"`
	TotalPages int      `json:"total_pages"`
}

func (r *RecipeRepository) SearchRecipes(params SearchParams) (*SearchResult, error) {
	// Base Query
	baseQuery := `
		SELECT DISTINCT 
            re.id, 
            re.title, 
			COALESCE(re.instructions, '') as instructions,
            COALESCE(re.description, '') as description, 
            COALESCE(re.image, '') as image, 
            COALESCE(re.cook_time, 0) as cook_time, 
            COALESCE(re.prep_time, 0) as prep_time, 
            COALESCE(re.total_time, 0) as total_time, 
            COALESCE(re.rating, 0) as rating, 
            COALESCE(re.calories, '') as calories, 
            COALESCE(re.serving_size, '') as serving_size
        FROM recipes re
    `
	countQuery := `SELECT COUNT(DISTINCT re.id) FROM recipes re`

	// Dynamic Joins & Conditions
	var joins []string
	var conditions []string
	var args []interface{}
	argId := 1

	// Exclude the "General Items" placeholder (ID 0)
	conditions = append(conditions, "re.id != 0")

	// -- Filter: Query (Title or Description) --
	if params.Query != "" {
		conditions = append(conditions, fmt.Sprintf("(LOWER(re.title) LIKE $%d OR LOWER(re.description) LIKE $%d)", argId, argId))
		term := "%" + strings.ToLower(params.Query) + "%"
		args = append(args, term)
		argId++
	}

	// -- Filter: Cuisine (Category) --
	if params.Cuisine != "" && params.Cuisine != "all" {
		joins = append(joins, "JOIN recipe_categories rc ON re.id = rc.recipe_id")
		joins = append(joins, "JOIN categories c ON rc.category_id = c.id")
		conditions = append(conditions, fmt.Sprintf("LOWER(c.name) = $%d", argId))
		args = append(args, strings.ToLower(params.Cuisine))
		argId++
	}

	// -- Filter: Max Time --
	if params.MaxTime != "" && params.MaxTime != "all" {
		var timeVal int
		fmt.Sscanf(params.MaxTime, "%d", &timeVal)
		if timeVal > 0 {
			conditions = append(conditions, fmt.Sprintf("re.total_time <= $%d", argId))
			args = append(args, timeVal)
			argId++
		}
	}

	// Assemble Query Parts
	joinClause := strings.Join(joins, " ")
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	// Execute Count (for pagination)
	var total int
	err := r.db.QueryRow(countQuery+joinClause+whereClause, args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	// Add Pagination to Main Query
	offset := (params.Page - 1) * params.Limit
	query := baseQuery + joinClause + whereClause + fmt.Sprintf(" ORDER BY re.id LIMIT %d OFFSET %d", params.Limit, offset)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// 5. Scan Results
	var recipes []Recipe
	for rows.Next() {
		var rec Recipe
		err := rows.Scan(
			&rec.ID, &rec.Title, &rec.Description, &rec.Instructions, &rec.Image,
			&rec.CookTime, &rec.PrepTime, &rec.TotalTime, &rec.Ratings,
			&rec.Nutrients.Calories, &rec.Nutrients.ServingSize,
		)
		if err != nil {
			return nil, err
		}
		// Initialize slices to avoid null in JSON
		rec.Ingredients = []string{}
		rec.KeyWords = []string{}
		recipes = append(recipes, rec)
	}

	totalPages := (total + params.Limit - 1) / params.Limit

	return &SearchResult{
		Recipes:    recipes,
		TotalCount: total,
		TotalPages: totalPages,
	}, nil
}
