package repository

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type SavedRecipe struct {
	ID      int       `json:"id"`
	UserID  string    `json:"user_id"`
	Recipe  Recipe    `json:"recipe"`
	SavedAt time.Time `json:"saved_at"`
}

const MAX_SAVED_RECIPES = 99 // Maximum saved recipes per user

// SaveRecipe saves a recipe for a user. If already saved, it updates the saved_at timestamp.
// If the user exceeds MAX_SAVED_RECIPES, the oldest recipes are deleted first.
func SaveRecipe(tx *sql.Tx, userId string, recipeId int) error {
	// Delete oldest recipes if we're at the limit (to make room for the new one)
	_, err := tx.Exec(`
		DELETE FROM saved_recipes
		WHERE id IN (
			SELECT id FROM saved_recipes
			WHERE user_id = $1 AND recipe_id != $2
			ORDER BY saved_at ASC
			LIMIT GREATEST(0, (SELECT COUNT(*) FROM saved_recipes WHERE user_id = $1) - $3 + 1)
		)
	`, userId, recipeId, MAX_SAVED_RECIPES)

	if err != nil {
		return fmt.Errorf("failed to cleanup old saved recipes: %w", err)
	}

	_, err = tx.Exec(`
		INSERT INTO saved_recipes (user_id, recipe_id, saved_at)
		VALUES ($1, $2, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id, recipe_id) 
		DO UPDATE SET saved_at = CURRENT_TIMESTAMP
	`, userId, recipeId)

	if err != nil {
		return fmt.Errorf("failed to save recipe: %w", err)
	}

	return nil
}

// SaveRecipes saves multiple recipes for a user in a single operation
// If the user exceeds MAX_SAVED_RECIPES, the oldest recipes are deleted first.
func SaveRecipes(tx *sql.Tx, userId string, recipeIds []int) error {
	if len(recipeIds) == 0 {
		return nil
	}

	// Deduplicate recipe IDs
	seen := make(map[int]bool)
	uniqueIds := make([]int, 0)
	for _, id := range recipeIds {
		if !seen[id] && id > 0 {
			seen[id] = true
			uniqueIds = append(uniqueIds, id)
		}
	}

	if len(uniqueIds) == 0 {
		return nil
	}

	// Build placeholders for the recipe IDs to exclude from deletion
	excludePlaceholders := make([]string, len(uniqueIds))
	deleteArgs := make([]interface{}, 0, len(uniqueIds)+2)
	deleteArgs = append(deleteArgs, userId)
	for i, id := range uniqueIds {
		excludePlaceholders[i] = fmt.Sprintf("$%d", i+2)
		deleteArgs = append(deleteArgs, id)
	}
	deleteArgs = append(deleteArgs, MAX_SAVED_RECIPES-len(uniqueIds))

	// Delete oldest recipes if we're at the limit (to make room for the new ones)
	deleteQuery := fmt.Sprintf(`
		DELETE FROM saved_recipes
		WHERE id IN (
			SELECT id FROM saved_recipes
			WHERE user_id = $1 AND recipe_id NOT IN (%s)
			ORDER BY saved_at ASC
			LIMIT GREATEST(0, (SELECT COUNT(*) FROM saved_recipes WHERE user_id = $1) - $%d)
		)
	`, strings.Join(excludePlaceholders, ", "), len(uniqueIds)+2)

	_, err := tx.Exec(deleteQuery, deleteArgs...)
	if err != nil {
		return fmt.Errorf("failed to cleanup old saved recipes: %w", err)
	}

	// Build VALUES clause for insert
	valueStrings := make([]string, 0, len(uniqueIds))
	valueArgs := make([]interface{}, 0, len(uniqueIds)+1)
	valueArgs = append(valueArgs, userId)

	for i, recipeId := range uniqueIds {
		valueStrings = append(valueStrings, fmt.Sprintf("($1, $%d, CURRENT_TIMESTAMP)", i+2))
		valueArgs = append(valueArgs, recipeId)
	}

	query := fmt.Sprintf(`
		INSERT INTO saved_recipes (user_id, recipe_id, saved_at)
		VALUES %s
		ON CONFLICT (user_id, recipe_id) 
		DO UPDATE SET saved_at = CURRENT_TIMESTAMP
	`, strings.Join(valueStrings, ", "))

	_, err = tx.Exec(query, valueArgs...)
	if err != nil {
		return fmt.Errorf("failed to save recipes: %w", err)
	}

	return nil
}

// UnsaveRecipe removes a recipe from saved recipes
func UnsaveRecipe(tx *sql.Tx, userId string, recipeId int) error {
	_, err := tx.Exec(`
		DELETE FROM saved_recipes
		WHERE user_id = $1 AND recipe_id = $2
	`, userId, recipeId)

	if err != nil {
		return fmt.Errorf("failed to unsave recipe: %w", err)
	}

	return nil
}

// GetSavedRecipes returns all saved recipes for a user with full recipe details
func GetSavedRecipes(db *sql.DB, userId string) ([]SavedRecipe, error) {
	rows, err := db.Query(`
		WITH RecipeKeywords AS (
			SELECT
				rk.recipe_id,
				STRING_AGG(k.name, ', ') AS all_keywords
			FROM recipe_keywords rk
			JOIN keywords k ON rk.keyword_id = k.id
			GROUP BY rk.recipe_id
		),
		RecipeIngredients AS (
			SELECT
				ri.recipe_id,
				STRING_AGG(ri.original, ', ') AS all_ingredients
			FROM recipe_ingredients ri
			GROUP BY ri.recipe_id
		),
		RecipeAllergens AS (
			SELECT
				ri.recipe_id,
				STRING_AGG(DISTINCT a.name, ', ') AS all_allergens
			FROM recipe_ingredients ri
			JOIN ingredients_allergens ia ON ri.ingredient_id = ia.ingredient_id
			JOIN allergens a ON ia.allergen_id = a.id
			WHERE a.name != 'None'
			GROUP BY ri.recipe_id
		),
		RecipeCategories AS (
			SELECT
				rca.recipe_id,
				STRING_AGG(c.name, ', ') AS all_categories
			FROM recipe_categories rca
			JOIN categories c ON rca.category_id = c.id
			GROUP BY rca.recipe_id
		)
		SELECT
			sr.id,
			sr.user_id,
			sr.saved_at,
			re.id,
			COALESCE(re.title, ''),
			COALESCE(re.description, ''),
			COALESCE(re.image, ''),
			COALESCE(re.cook_time, 0),
			COALESCE(re.prep_time, 0),
			COALESCE(re.total_time, 0),
			COALESCE(re.yields, ''),
			COALESCE(re.rating, 0),
			COALESCE(re.serving_size, ''),
			COALESCE(re.calories, ''),
			COALESCE(re.instructions, ''),
			COALESCE(rcd.all_categories, ''),
			COALESCE(rkd.all_keywords, ''),
			COALESCE(rid.all_ingredients, ''),
			COALESCE(ral.all_allergens, '')
		FROM saved_recipes sr
		JOIN recipes re ON sr.recipe_id = re.id
		LEFT JOIN RecipeKeywords rkd ON re.id = rkd.recipe_id
		LEFT JOIN RecipeIngredients rid ON re.id = rid.recipe_id
		LEFT JOIN RecipeAllergens ral ON re.id = ral.recipe_id
		LEFT JOIN RecipeCategories rcd ON re.id = rcd.recipe_id
		WHERE sr.user_id = $1
		ORDER BY sr.saved_at DESC
	`, userId)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var savedRecipes []SavedRecipe
	for rows.Next() {
		var sr SavedRecipe
		var r Recipe
		var keywordsStr, ingredientsStr, allergiesStr, categoriesStr string

		if err := rows.Scan(
			&sr.ID,
			&sr.UserID,
			&sr.SavedAt,
			&r.ID,
			&r.Title,
			&r.Description,
			&r.Image,
			&r.CookTime,
			&r.PrepTime,
			&r.TotalTime,
			&r.Yields,
			&r.Ratings,
			&r.Nutrients.ServingSize,
			&r.Nutrients.Calories,
			&r.Instructions,
			&categoriesStr,
			&keywordsStr,
			&ingredientsStr,
			&allergiesStr,
		); err != nil {
			return nil, err
		}

		if keywordsStr != "" {
			r.KeyWords = strings.Split(keywordsStr, ", ")
		} else {
			r.KeyWords = []string{}
		}
		if ingredientsStr != "" {
			r.Ingredients = strings.Split(ingredientsStr, ", ")
		} else {
			r.Ingredients = []string{}
		}
		if allergiesStr != "" {
			r.Allergies = strings.Split(allergiesStr, ", ")
		} else {
			r.Allergies = []string{}
		}
		if categoriesStr != "" {
			r.Category = categoriesStr
		}

		sr.Recipe = r
		savedRecipes = append(savedRecipes, sr)
	}

	return savedRecipes, rows.Err()
}

// GetSavedRecipeIds returns just the recipe IDs for a user (useful for quick checks)
func GetSavedRecipeIds(db *sql.DB, userId string) ([]int, error) {
	rows, err := db.Query(`
		SELECT recipe_id
		FROM saved_recipes
		WHERE user_id = $1
		ORDER BY saved_at DESC
	`, userId)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var recipeIds []int
	for rows.Next() {
		var recipeId int
		if err := rows.Scan(&recipeId); err != nil {
			return nil, err
		}
		recipeIds = append(recipeIds, recipeId)
	}

	return recipeIds, rows.Err()
}

// IsRecipeSaved checks if a recipe is saved by a user
func IsRecipeSaved(db *sql.DB, userId string, recipeId int) (bool, error) {
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM saved_recipes 
			WHERE user_id = $1 AND recipe_id = $2
		)
	`, userId, recipeId).Scan(&exists)

	if err != nil {
		return false, err
	}

	return exists, nil
}
