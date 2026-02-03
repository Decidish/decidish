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
	Query       string
	Cuisine     string
	Categories  []string
	Keywords    []string
	MaxTime     string
	MaxCalories string
	Page        int
	Limit       int
}

type SearchResult struct {
	Recipes    []Recipe `json:"recipes"`
	TotalCount int      `json:"total_count"`
	TotalPages int      `json:"total_pages"`
}

func (r *RecipeRepository) SearchRecipes(params SearchParams) (*SearchResult, error) {
	// Build WHERE conditions for filtering recipes
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

	// -- Filter: Categories (match ALL selected) --
	if len(params.Categories) > 0 {
		placeholders := make([]string, 0, len(params.Categories))
		for range params.Categories {
			placeholders = append(placeholders, fmt.Sprintf("$%d", argId))
			argId++
		}
		subquery := fmt.Sprintf(
			"SELECT rc2.recipe_id FROM recipe_categories rc2 JOIN categories c2 ON rc2.category_id = c2.id WHERE LOWER(c2.name) IN (%s) GROUP BY rc2.recipe_id HAVING COUNT(DISTINCT LOWER(c2.name)) = %d",
			strings.Join(placeholders, ", "), len(params.Categories),
		)
		conditions = append(conditions, fmt.Sprintf("re.id IN (%s)", subquery))
		for _, cat := range params.Categories {
			args = append(args, strings.ToLower(cat))
		}
	}

	// -- Filter: Keywords (match ALL selected) --
	if len(params.Keywords) > 0 {
		placeholders := make([]string, 0, len(params.Keywords))
		for range params.Keywords {
			placeholders = append(placeholders, fmt.Sprintf("$%d", argId))
			argId++
		}
		subquery := fmt.Sprintf(
			"SELECT rk2.recipe_id FROM recipe_keywords rk2 JOIN keywords k2 ON rk2.keyword_id = k2.id WHERE LOWER(k2.name) IN (%s) GROUP BY rk2.recipe_id HAVING COUNT(DISTINCT LOWER(k2.name)) = %d",
			strings.Join(placeholders, ", "), len(params.Keywords),
		)
		conditions = append(conditions, fmt.Sprintf("re.id IN (%s)", subquery))
		for _, kw := range params.Keywords {
			args = append(args, strings.ToLower(kw))
		}
	} else if params.Cuisine != "" && params.Cuisine != "all" {
		// Backward compatibility: single cuisine filter via subquery (avoids join)
		conditions = append(conditions, fmt.Sprintf(
			"re.id IN (SELECT rc.recipe_id FROM recipe_categories rc JOIN categories c ON rc.category_id = c.id WHERE LOWER(c.name) = $%d)",
			argId,
		))
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

	// -- Filter: Max Calories --
	if params.MaxCalories != "" && params.MaxCalories != "all" {
		var calVal int
		fmt.Sscanf(params.MaxCalories, "%d", &calVal)
		if calVal > 0 {
			conditions = append(conditions, fmt.Sprintf("(CASE WHEN re.calories ~ '^[0-9]+$' THEN re.calories::int ELSE 0 END) <= $%d", argId))
			args = append(args, calVal)
			argId++
		}
	}

	// Build WHERE clause
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	// Step 1: Get total count (lightweight query on recipes table only)
	countQuery := "SELECT COUNT(*) FROM recipes re" + whereClause
	var total int
	err := r.db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	// Early return if no results
	if total == 0 {
		return &SearchResult{
			Recipes:    []Recipe{},
			TotalCount: 0,
			TotalPages: 0,
		}, nil
	}

	// Step 2: Get paginated recipe IDs only (fast)
	offset := (params.Page - 1) * params.Limit
	idsQuery := fmt.Sprintf("SELECT re.id FROM recipes re%s ORDER BY re.id LIMIT %d OFFSET %d", whereClause, params.Limit, offset)

	idRows, err := r.db.Query(idsQuery, args...)
	if err != nil {
		return nil, err
	}

	var recipeIDs []int
	for idRows.Next() {
		var id int
		if err := idRows.Scan(&id); err != nil {
			idRows.Close()
			return nil, err
		}
		recipeIDs = append(recipeIDs, id)
	}
	idRows.Close()

	if len(recipeIDs) == 0 {
		return &SearchResult{
			Recipes:    []Recipe{},
			TotalCount: total,
			TotalPages: (total + params.Limit - 1) / params.Limit,
		}, nil
	}

	// Step 3: Fetch full recipe data with aggregates for only the paginated IDs
	// Build placeholders for the IN clause
	idPlaceholders := make([]string, len(recipeIDs))
	idArgs := make([]interface{}, len(recipeIDs))
	for i, id := range recipeIDs {
		idPlaceholders[i] = fmt.Sprintf("$%d", i+1)
		idArgs[i] = id
	}

	// Query with CTEs scoped to only the selected recipe IDs
	// Note: We reference SelectedRecipes CTE in subqueries, so we only need placeholders once
	fullQuery := fmt.Sprintf(`
		WITH SelectedRecipes AS (
			SELECT id FROM recipes WHERE id IN (%s)
		),
		RecipeIngredients AS (
			SELECT 
				ri.recipe_id,
				STRING_AGG(COALESCE(ri.original, i.name), '\n') AS all_ingredients
			FROM recipe_ingredients ri
			JOIN ingredients i ON ri.ingredient_id = i.id
			WHERE ri.recipe_id IN (SELECT id FROM SelectedRecipes)
			GROUP BY ri.recipe_id
		),
		RecipeKeywords AS (
			SELECT 
				rk.recipe_id,
				STRING_AGG(k.name, '\n') AS all_keywords
			FROM recipe_keywords rk
			JOIN keywords k ON rk.keyword_id = k.id
			WHERE rk.recipe_id IN (SELECT id FROM SelectedRecipes)
			GROUP BY rk.recipe_id
		),
		RecipeAllergens AS (
			SELECT
				ri.recipe_id,
				STRING_AGG(DISTINCT a.name, '\n') AS all_allergens
			FROM recipe_ingredients ri
			JOIN ingredients_allergens ia ON ri.ingredient_id = ia.ingredient_id
			JOIN allergens a ON ia.allergen_id = a.id
			WHERE ri.recipe_id IN (SELECT id FROM SelectedRecipes) AND a.name != 'None'
			GROUP BY ri.recipe_id
		)
		SELECT 
			re.id, 
			re.title, 
			COALESCE(re.description, '') as description,
			COALESCE(re.instructions, '') as instructions,
			COALESCE(re.image, '') as image, 
			COALESCE(re.cook_time, 0) as cook_time, 
			COALESCE(re.prep_time, 0) as prep_time, 
			COALESCE(re.total_time, 0) as total_time, 
			COALESCE(re.rating, 0) as rating, 
			COALESCE(re.calories, '') as calories, 
			COALESCE(re.serving_size, '') as serving_size,
			COALESCE(re.yields, '') as yields,
			COALESCE(ri.all_ingredients, '') as ingredients,
			COALESCE(rk.all_keywords, '') as keywords,
			COALESCE(ra.all_allergens, '') as allergens
		FROM SelectedRecipes sr
		JOIN recipes re ON re.id = sr.id
		LEFT JOIN RecipeIngredients ri ON re.id = ri.recipe_id
		LEFT JOIN RecipeKeywords rk ON re.id = rk.recipe_id
		LEFT JOIN RecipeAllergens ra ON re.id = ra.recipe_id
		ORDER BY re.id
	`, strings.Join(idPlaceholders, ", "))

	rows, err := r.db.Query(fullQuery, idArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// 5. Scan Results
	recipes := make([]Recipe, 0) // Initialize as empty slice, not nil
	for rows.Next() {
		var rec Recipe
		var ingredientsStr, keywordsStr, allergensStr string
		err := rows.Scan(
			&rec.ID, &rec.Title, &rec.Description, &rec.Instructions, &rec.Image,
			&rec.CookTime, &rec.PrepTime, &rec.TotalTime, &rec.Ratings,
			&rec.Nutrients.Calories, &rec.Nutrients.ServingSize,
			&rec.Yields, &ingredientsStr, &keywordsStr, &allergensStr,
		)
		if err != nil {
			return nil, err
		}

		// Parse ingredients string to slice
		if ingredientsStr != "" {
			rec.Ingredients = strings.Split(ingredientsStr, "\\n")
		} else {
			rec.Ingredients = []string{}
		}

		// Parse keywords string to slice
		if keywordsStr != "" {
			rec.KeyWords = strings.Split(keywordsStr, "\\n")
		} else {
			rec.KeyWords = []string{}
		}

		if allergensStr != "" {
			rec.Allergies = strings.Split(allergensStr, "\\n")
		} else {
			rec.Allergies = []string{}
		}

		recipes = append(recipes, rec)
	}

	totalPages := (total + params.Limit - 1) / params.Limit

	return &SearchResult{
		Recipes:    recipes,
		TotalCount: total,
		TotalPages: totalPages,
	}, nil
}

// ListCategories returns category names filtered by query (ILIKE) with limit
func (r *RecipeRepository) ListCategories(query string, limit int) ([]string, error) {
	var rows *sql.Rows
	var err error
	if query != "" {
		like := "%" + strings.ToLower(query) + "%"
		rows, err = r.db.Query("SELECT name FROM categories WHERE LOWER(name) LIKE $1 ORDER BY name LIMIT $2", like, limit)
	} else {
		rows, err = r.db.Query("SELECT name FROM categories ORDER BY name LIMIT $1", limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cats []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		cats = append(cats, name)
	}
	return cats, nil
}

// ListKeywords returns keyword names filtered by query (ILIKE) with limit
func (r *RecipeRepository) ListKeywords(query string, limit int) ([]string, error) {
	var rows *sql.Rows
	var err error
	if query != "" {
		like := "%" + strings.ToLower(query) + "%"
		rows, err = r.db.Query("SELECT name FROM keywords WHERE LOWER(name) LIKE $1 ORDER BY name LIMIT $2", like, limit)
	} else {
		rows, err = r.db.Query("SELECT name FROM keywords ORDER BY name LIMIT $1", limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var kws []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		kws = append(kws, name)
	}
	return kws, nil
}
