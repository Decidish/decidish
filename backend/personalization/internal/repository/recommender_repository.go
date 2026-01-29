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
	Allergies    []string  `json:"allergies"`
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
	querySQL := `
        WITH user_vec AS (
            SELECT embedding 
            FROM user_embeddings 
            WHERE user_id = $1
        ),
        candidates AS (
            SELECT 
                re.recipe_id, 
                (uv.embedding <=> re.embedding) as dist
            FROM recipe_embeddings re
            JOIN user_vec uv ON true
            WHERE re.recipe_id NOT IN (
                SELECT recipe_id
                FROM user_history
                WHERE user_id = $1
                AND action_timestamp > NOW() - INTERVAL '7 days'
            )
            ORDER BY dist ASC
            LIMIT 1000
        ),
        recommender AS (
            SELECT recipe_id 
            FROM candidates
            ORDER BY (dist + (RANDOM() * 0.1)) ASC
            LIMIT 20
        ),
        RecipeKeywords AS (
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
				STRING_AGG(ri.original, ', ') AS all_ingredients,
				STRING_AGG(i.name, ', ') AS all_allergens
			FROM recipe_ingredients ri
					JOIN ingredients_allergens a ON ri.ingredient_id = a.ingredient_id
					JOIN allergens i ON a.allergen_id = i.id
			WHERE i.name != 'None'
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
            COALESCE(re.cook_time, 0),
            COALESCE(re.prep_time, 0),
            COALESCE(re.total_time, 0),
            re.image,
            COALESCE(re.rating, 0),
            re.serving_size,
            re.calories,
            re.yields,
            COALESCE(rkd.all_keywords, ''),
            COALESCE(rid.all_ingredients, ''),
            COALESCE(rid.all_allergens, ''),
            COALESCE(rcd.all_categories, '')
        
        FROM recommender r
        JOIN recipes re ON r.recipe_id = re.id
        LEFT JOIN RecipeKeywords rkd ON re.id = rkd.recipe_id
        LEFT JOIN RecipeIngredients rid ON re.id = rid.recipe_id
        LEFT JOIN RecipeCategories rcd ON re.id = rcd.recipe_id`

	rows, err := tx.Query(querySQL, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var recipes []Recipe

	for rows.Next() {
		var recipe Recipe
		var keywordsStr, ingredientsStr, allergiesStr, categoriesStr string

		// Using standard scan.
		// Note: I switched sql.NullString to string with COALESCE in SQL
		// to simplify the Go code, but you can revert if you prefer NullString.
		if err := rows.Scan(
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
			&allergiesStr,
			&categoriesStr,
		); err != nil {
			return nil, err
		}

		if keywordsStr != "" {
			recipe.KeyWords = strings.Split(keywordsStr, ", ")
		} else {
			recipe.KeyWords = []string{}
		}

		if ingredientsStr != "" {
			recipe.Ingredients = strings.Split(ingredientsStr, ", ")
		} else {
			recipe.Ingredients = []string{}
		}

		if allergiesStr != "" {
			recipe.Allergies = strings.Split(allergiesStr, ", ")
		} else {
			recipe.Allergies = []string{}
		}

		recipe.Category = categoriesStr
		recipes = append(recipes, recipe)
	}

	return recipes, nil
}
