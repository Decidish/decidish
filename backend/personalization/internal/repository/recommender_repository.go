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
	query := `
        SELECT 
            (SELECT COUNT(*) FROM recipes) as total,
			(
				(SELECT COALESCE(SUM(processed_items), 0) FROM jobs WHERE created_at >= CURRENT_DATE) 
			)
			as today,
			(SELECT COUNT(DISTINCT user_id) FROM user_history WHERE action_timestamp >= NOW() - INTERVAL '1 month') as users
    `

	err := db.QueryRow(query).Scan(&total, &today, &users)
	if err != nil {
		return 0, 0, 0, err
	}
	return total, today, users, nil
}

func (repo RecommenderRepository) GetRecommendedRecipesForUser(tx *sql.Tx, userId string) ([]Recipe, error) {
	querySQL := `
	WITH recursive user_vec AS (
        SELECT ue.embedding, up.max_cooking_time
        FROM user_embeddings ue
		JOIN user_preferences up ON ue.user_id = up.user_id
        WHERE ue.user_id = $1
    ),

    candidates AS (
        SELECT 
            re.recipe_id, 
            (uv.embedding <=> re.embedding) as dist,
            MIN(rc.cuisine_id) as primary_cuisine_id
        FROM recipe_embeddings re
        CROSS JOIN user_vec uv
		JOIN recipes r_meta ON re.recipe_id = r_meta.id
        LEFT JOIN recipe_cuisine rc ON re.recipe_id = rc.recipe_id
        WHERE NOT EXISTS (
            SELECT 1
            FROM user_history uh
            WHERE uh.user_id = $1
            AND uh.recipe_id = re.recipe_id
            AND uh.action_timestamp > NOW() - INTERVAL '7 days'
        )
		AND r_meta.total_time <= uv.max_cooking_time
		AND NOT EXISTS (
                SELECT 1
                FROM recipe_ingredients ri
                JOIN ingredients_allergens ia ON ri.ingredient_id = ia.ingredient_id
                JOIN user_allergens ua ON ia.allergen_id = ua.allergen_id
                WHERE ri.recipe_id = re.recipe_id
                AND ua.user_id = $1
            )
        GROUP BY re.recipe_id, re.embedding, uv.embedding
        ORDER BY dist ASC
        LIMIT 100
    ),

    recommender_recursion AS (
        (
            SELECT 
                c.recipe_id,
                c.dist,
                c.primary_cuisine_id,
                ARRAY[c.recipe_id] as visited_ids,
                ARRAY[c.primary_cuisine_id] as visited_cats,
                1 as depth
            FROM candidates c
            ORDER BY c.dist ASC
            LIMIT 1
        )
        UNION ALL
        (
            SELECT 
                next_c.recipe_id,
                next_c.dist,
                next_c.primary_cuisine_id,
                prev.visited_ids || next_c.recipe_id,
                prev.visited_cats || next_c.primary_cuisine_id,
                prev.depth + 1
            FROM recommender_recursion prev
            CROSS JOIN LATERAL (
                SELECT c.*
                FROM candidates c
                WHERE NOT (c.recipe_id = ANY(prev.visited_ids))
                ORDER BY 
                    c.dist * (
                        CASE 
                            WHEN c.primary_cuisine_id = ANY(prev.visited_cats) THEN 2.5 
                            ELSE 1.0 
                        END
                    ) ASC
                LIMIT 1
            ) next_c
            WHERE prev.depth < 20 -- Stop when we have 20 recipes
        )
    ),

    recommender AS (
        SELECT recipe_id 
        FROM recommender_recursion
    ),

    RecipeKeywords AS (
        SELECT
            rk.recipe_id,
            STRING_AGG(k.name, ', ') AS all_keywords
        FROM recommender r
        JOIN recipe_keywords rk ON r.recipe_id = rk.recipe_id
        JOIN keywords k ON rk.keyword_id = k.id
        GROUP BY rk.recipe_id
    ),
    RecipeIngredients AS (
        SELECT
            ri.recipe_id,
            STRING_AGG(ri.original, ', ') AS all_ingredients,
            STRING_AGG(DISTINCT i.name, ', ') AS all_allergens
        FROM recommender r
        JOIN recipe_ingredients ri ON r.recipe_id = ri.recipe_id
        LEFT JOIN ingredients_allergens a ON ri.ingredient_id = a.ingredient_id
        LEFT JOIN allergens i ON a.allergen_id = i.id AND i.name != 'None'
        GROUP BY ri.recipe_id
    ),
    RecipeCategories AS (
        SELECT
            rca.recipe_id,
            STRING_AGG(c.name, ', ') AS all_categories
        FROM recommender r
        JOIN recipe_categories rca ON r.recipe_id = rca.recipe_id
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
    FROM recommender_recursion r -- Use recursion result to keep order
    JOIN recipes re ON r.recipe_id = re.id
    LEFT JOIN RecipeKeywords rkd ON re.id = rkd.recipe_id
    LEFT JOIN RecipeIngredients rid ON re.id = rid.recipe_id
    LEFT JOIN RecipeCategories rcd ON re.id = rcd.recipe_id
    ORDER BY r.depth ASC; -- IMPORTANT: Preserve the MMR selection order`

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
