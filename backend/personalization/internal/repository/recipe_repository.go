package repository

import (
	"database/sql"
	"fmt"
	"regexp"
	"strings"
)

type Nutrients struct {
	ServingSize string `json:"servingSize"`
	Calories    string `json:"calories"`
}

type Recipe struct {
	Category    string `json:"category"`
	CookTime    int    `json:"cook_time"`
	Description string `json:"description"`
	Image       string `json:"image"`

	Ingredients  []string  `json:"ingredients"`
	Instructions string    `json:"instructions"`
	KeyWords     []string  `json:"keywords"`
	Nutrients    Nutrients `json:"nutrients"`

	PrepTime  int     `json:"prep_time"`
	Ratings   float64 `json:"ratings"`
	TotalTime int     `json:"total_time"`

	Title  string `json:"title"`
	Yields string `json:"yields"`
}

func (r Recipe) String() string {
	ingredientsStr := strings.Join(r.Ingredients, ", ")

	keywordsStr := strings.Join(r.KeyWords, ", ")

	// We explicitly label each part so the model understands the context.
	return fmt.Sprintf(
		"Title: %s. Description: %s. Category: %s. Ingredients: %s. Instructions: %s. Keywords: %s. Nutrition: %s calories per %s. Time: %d minutes total (%d prep, %d cook). Yields: %s.",
		r.Title,
		r.Description,
		r.Category,
		ingredientsStr,
		r.Instructions,
		keywordsStr,
		r.Nutrients.Calories,
		r.Nutrients.ServingSize,
		r.TotalTime,
		r.PrepTime,
		r.CookTime,
		r.Yields,
	)
}

// SaveRecipe inserts a recipe or returns the existing id when a recipe with the same title already exists.
func SaveRecipe(recipe *Recipe, tx *sql.Tx) (int, error) {
	var recipeID int
	stmt := `
	INSERT INTO recipes (title, description, instructions, cook_time, prep_time, total_time, image, rating, serving_size, calories, yields)
	VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
	ON CONFLICT (title) DO NOTHING
	RETURNING id
	`
	err := tx.QueryRow(stmt,
		recipe.Title,
		recipe.Description,
		recipe.Instructions,
		recipe.CookTime,
		recipe.PrepTime,
		recipe.TotalTime,
		recipe.Image,
		recipe.Ratings,
		recipe.Nutrients.ServingSize,
		recipe.Nutrients.Calories,
		recipe.Yields,
	).Scan(&recipeID)

	if err != nil {
		return -1, err
	}
	return recipeID, nil
}

// SaveCategories ensures category rows exist and links them to the recipe.
func SaveCategories(recipeId int, recipe Recipe, tx *sql.Tx) error {
	stmtCategory := `
		WITH ins AS (
		  INSERT INTO categories (name) VALUES ($1)
		  ON CONFLICT (name) DO NOTHING
		  RETURNING id
		)
		SELECT id FROM ins
		UNION ALL
		SELECT id FROM categories WHERE name = $1
		LIMIT 1;
		`
	stmtRecipeCategory := `INSERT INTO recipe_categories (recipe_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`

	for _, raw := range strings.Split(recipe.Category, ",") {
		category := strings.TrimSpace(raw)
		if category == "" {
			continue
		}

		var categoryID int
		if err := tx.QueryRow(stmtCategory, category).Scan(&categoryID); err != nil {
			return err
		}

		if _, err := tx.Exec(stmtRecipeCategory, recipeId, categoryID); err != nil {
			return err
		}
	}
	return nil
}

// SaveKeywords ensures keyword rows exist and links them to the recipe.
func SaveKeywords(recipeId int, recipe Recipe, tx *sql.Tx) error {
	stmtKeyword := `
		WITH ins AS (
		  INSERT INTO keywords (name) VALUES ($1)
		  ON CONFLICT (name) DO NOTHING
		  RETURNING id
		)
		SELECT id FROM ins
		UNION ALL
		SELECT id FROM keywords WHERE name = $1
		LIMIT 1;
		`
	stmtRecipeKeyword := `INSERT INTO recipe_keywords (recipe_id, keyword_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`

	for _, raw := range recipe.KeyWords {
		keyword := strings.TrimSpace(raw)
		if keyword == "" {
			continue
		}

		var keywordID int
		if err := tx.QueryRow(stmtKeyword, keyword).Scan(&keywordID); err != nil {
			return err
		}

		if _, err := tx.Exec(stmtRecipeKeyword, recipeId, keywordID); err != nil {
			return err
		}
	}
	return nil
}

var ingredientRe = regexp.MustCompile(`^\s*(\d+([.,]\d+)?(/\d+)?)?\s*([A-Za-zÄÖÜäöüß%°µ/.\-()]+)?\s+([^()]+?)(\s*\((.+)\))?\s*$`)

// parseIngredient parses an ingredient line and returns pointers for qty, unit, name and comment.
// Missing parts are returned as nil.
func parseIngredient(line string) (qty, unit, name, comment *string) {
	m := ingredientRe.FindStringSubmatch(line)
	if m == nil {
		s := strings.TrimSpace(line)
		if s == "" {
			return nil, nil, nil, nil
		}
		return nil, nil, &s, nil
	}

	// m indices:
	// 1 = qty, 4 = unit, 5 = name, 7 = comment
	get := func(idx int) *string {
		if idx >= len(m) {
			return nil
		}
		v := strings.TrimSpace(m[idx])
		if v == "" {
			return nil
		}
		return &v
	}

	q := get(1)
	if q != nil {
		v := strings.ReplaceAll(*q, ",", ".")
		q = &v
	}

	return q, get(4), get(5), get(7)
}

func SaveIngredients(recipeId int, recipe Recipe, tx *sql.Tx) error {
	stmtIngredient := `
			WITH ins AS (
				INSERT INTO ingredients (name)
				VALUES ($1)
				ON CONFLICT (name) DO NOTHING
				RETURNING id
			)	
			SELECT id FROM ins
			UNION ALL
			SELECT id FROM ingredients WHERE name = $1
			LIMIT 1;`
	stmtRecipeIngredient := `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) values ($1, $2, $3, $4) ON CONFLICT DO NOTHING`

	// Insert into ingredients table
	for _, ingredient := range recipe.Ingredients {
		qty, unit, name, _ := parseIngredient(ingredient)

		var ingredientID int

		err := tx.QueryRow(stmtIngredient, name).Scan(&ingredientID)

		if err != nil {
			return err
		}

		// TODO: Do we need the quantity and unit?
		_, err = tx.Exec(stmtRecipeIngredient, recipeId, ingredientID, qty, unit)

		if err != nil {
			return err
		}
	}

	return nil
}
