package repository

import (
	"database/sql"
	"strings"
)

type Nutrients struct {
	ServingSize string `json:"servingSize"`
	Calories    string `json:"calories"`
}

type Recipe struct {
	ID          int    `json:"id"`
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

type RecommenderRepository struct{}

func NewRecommenderRepository() RecommenderRepository {
	return RecommenderRepository{}
}

// Returns (total_count, today_count, error)
func GetAdminStats(db *sql.DB) (int, int, int, error) {
	var total int // total of recipes in DB
	var today int // number of recipes imported today
	var users int // active users

	// Postgres syntax: CURRENT_DATE gets the start of today (00:00:00)
	// TODO: change query for users so we get the "active ones"
	//? do this only when you have the data for this
	query := `
        SELECT 
            (SELECT COUNT(*) FROM recipes) as total,
			(
				(SELECT COALESCE(SUM(processed_items), 0) FROM jobs WHERE created_at >= CURRENT_DATE) 
				+ 
				(SELECT COUNT(*) FROM import_logs WHERE created_at >= CURRENT_DATE) 
			)
			as today,
			-- (SELECT COUNT(*) FROM users) as users
			0 as users
    `

	err := db.QueryRow(query).Scan(&total, &today, &users)
	if err != nil {
		return 0, 0, 0, err
	}
	return total, today, users, nil
}

func (repo RecommenderRepository) GetRecommendedRecipesForUser(tx *sql.Tx, userId string) ([]Recipe, error) {
	query, err := tx.Query(`
		WITH recommender AS ( 
		    SELECT re.recipe_id, r.embedding <=> re.embedding as dist 
			FROM recipe_embeddings re, (SELECT embedding
		    FROM user_embeddings
		    WHERE user_id = $1) r
			ORDER BY dist
			LIMIT 20
		 ), RecipeKeywords AS (
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
		RecipeCategories AS (
			SELECT
				rca.recipe_id,
				STRING_AGG(c.name, ', ') AS all_categories
			FROM recipe_categories rca
			JOIN categories c ON rca.category_id = c.id
			GROUP BY rca.recipe_id
		)
		
		SELECT
			re.id,
			re.title,
			re.description,
			re.instructions,
			COALESCE(re.cook_time, 0),   -- Fix: If NULL, return 0
			COALESCE(re.prep_time, 0),   -- Fix: If NULL, return 0
			COALESCE(re.total_time, 0),  -- Fix: If NULL, return 0
			re.image,
			COALESCE(re.rating, 0),      -- Fix: If NULL, return 0
			re.serving_size,
			re.calories,
			re.yields,
			rkd.all_keywords AS keywords_condensed,
			rid.all_ingredients AS ingredients_condensed,
			rcd.all_categories AS categories_condensed
		
		FROM recipes re
		JOIN recommender r ON r.recipe_id = re.id
		LEFT JOIN RecipeKeywords rkd ON re.id = rkd.recipe_id
		LEFT JOIN RecipeIngredients rid ON re.id = rid.recipe_id
		LEFT JOIN RecipeCategories rcd ON re.id = rcd.recipe_id`, userId)

	if err != nil {
		return nil, err
	}

	defer query.Close()

	// var recipes []Recipe
	recipes := []Recipe{}

	for query.Next() {
		var recipe Recipe

		var keywordsStr sql.NullString
		var ingredientsStr sql.NullString
		var categoriesStr sql.NullString

		if err := query.Scan(
			&recipe.ID,
			&recipe.Title,
			&recipe.Description,
			&recipe.Instructions,
			&recipe.CookTime,
			&recipe.PrepTime,
			&recipe.TotalTime,
			&recipe.Image,
			&recipe.Ratings,
			&recipe.Nutrients.ServingSize,
			&recipe.Nutrients.Calories,
			&recipe.Yields,
			&keywordsStr,
			&ingredientsStr,
			&categoriesStr); err != nil {
			return nil, err
		}

		recipe.KeyWords = strings.Split(keywordsStr.String, ", ")
		recipe.Ingredients = strings.Split(ingredientsStr.String, ", ")
		recipe.Category = categoriesStr.String

		recipes = append(recipes, recipe)
	}

	return recipes, nil
}
