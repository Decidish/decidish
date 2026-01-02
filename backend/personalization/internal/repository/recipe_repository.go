package repository

import (
	"database/sql"
	"errors"
	"fmt"
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

func SaveRecipe(recipe *Recipe, tx *sql.Tx) (int, error) {
	var recipeID int

	err := tx.QueryRow(`
			INSERT INTO recipes (title, description, instructions, cook_time, prep_time, total_time, image, rating, serving_size, calories, yields) 
			values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			ON CONFLICT (title) DO NOTHING
			RETURNING id
			`,
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

func SaveCategories(recipeId int, recipe Recipe, tx *sql.Tx) error {
	for _, category := range strings.Split(recipe.Category, ",") {
		category = strings.TrimSpace(category)

		var categoryID int
		err := tx.QueryRow(`
			INSERT INTO categories (name) values ($1) 
			ON CONFLICT (name) DO NOTHING
			RETURNING id
			`, category,
		).Scan(&categoryID)

		if errors.Is(err, sql.ErrNoRows) {
			continue
		}

		if err != nil {
			return err
		}

		_, err = tx.Exec(`
			INSERT INTO recipe_categories (recipe_id, category_id) values ($1, $2)
			`, recipeId, categoryID)

		if err != nil {
			return err
		}
	}

	return nil
}

func SaveKeywords(recipeId int, recipe Recipe, tx *sql.Tx) error {
	stmtKeyword := `INSERT INTO keywords (name) values ($1) 
                	ON CONFLICT (name) DO NOTHING 
                	RETURNING id`
	stmtRecipeKeyword := `INSERT INTO recipe_keywords (recipe_id, keyword_id) 
							values ($1, $2)
							ON CONFLICT DO NOTHING `

	for _, keyword := range recipe.KeyWords {
		var keywordID int

		err := tx.QueryRow(stmtKeyword, keyword).Scan(&keywordID)

		if errors.Is(err, sql.ErrNoRows) {
			continue
		}

		if err != nil {
			return err
		}

		_, err = tx.Exec(stmtRecipeKeyword, recipeId, keywordID)

		if err != nil {
			return err
		}
	}
	return nil
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
		name := ingredient

		// Execute crf

		var ingredientID int

		err := tx.QueryRow(stmtIngredient, name).Scan(&ingredientID)

		if err != nil {
			return err
		}

		// TODO: Do we need the quantity and unit?
		_, err = tx.Exec(stmtRecipeIngredient, recipeId, ingredientID, 0.0, "")

		if err != nil {
			return err
		}
	}

	return nil
}
