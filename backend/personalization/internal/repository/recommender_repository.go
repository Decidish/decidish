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

// func SearchRecipes(db *sql.DB, params SearchParams) ([]Recipe, int, error) {
// 	baseQuery := `
//         SELECT
//             r.id, r.title, r.description, r.image, r.cook_time, r.total_time,
//             -- Get the first category as "Cuisine"
//             COALESCE((
//                 SELECT c.name FROM recipe_categories rc
//                 JOIN categories c ON rc.category_id = c.id
//                 WHERE rc.recipe_id = r.id LIMIT 1
//             ), 'General') as cuisine,
//             -- Get ingredients as a JSON list (Required for your frontend modal)
//             COALESCE((
//                 SELECT json_agg(json_build_object(
//                     'id', i.id,
//                     'name', i.name,
//                     'quantity', ri.quantity,
//                     'unit', ri.unit
//                 ))
//                 FROM recipe_ingredients ri
//                 JOIN ingredients i ON ri.ingredient_id = i.id
//                 WHERE ri.recipe_id = r.id
//             ), '[]') as ingredients
//         FROM recipes r
//     `

// 	// Build WHERE clauses dynamically
// 	var wheres []string
// 	var args []interface{}
// 	argId := 1

// 	// Filter: Search Text (Title)
// 	if params.Query != "" {
// 		wheres = append(wheres, fmt.Sprintf("r.title ILIKE $%d", argId))
// 		args = append(args, "%"+params.Query+"%")
// 		argId++
// 	}

// 	// Filter: Max Time
// 	if params.MaxTime > 0 {
// 		wheres = append(wheres, fmt.Sprintf("r.cook_time <= $%d", argId))
// 		args = append(args, params.MaxTime)
// 		argId++
// 	}

// 	// Filter: Cuisine (Category)
// 	if params.Cuisine != "" && params.Cuisine != "all" {
// 		wheres = append(wheres, fmt.Sprintf("EXISTS (SELECT 1 FROM recipe_categories rc JOIN categories c ON rc.category_id = c.id WHERE rc.recipe_id = r.id AND c.name = $%d)", argId))
// 		args = append(args, params.Cuisine)
// 		argId++
// 	}

// 	// Filter: Difficulty (Keyword)
// 	if params.Difficulty != "" && params.Difficulty != "all" {
// 		wheres = append(wheres, fmt.Sprintf("EXISTS (SELECT 1 FROM recipe_keywords rk JOIN keywords k ON rk.keyword_id = k.id WHERE rk.recipe_id = r.id AND k.name = $%d)", argId))
// 		args = append(args, params.Difficulty)
// 		argId++
// 	}

// 	// Assemble Query
// 	queryStr := baseQuery
// 	if len(wheres) > 0 {
// 		queryStr += " WHERE " + strings.Join(wheres, " AND ")
// 	}

// 	// Add Pagination
// 	// First, get total count for pagination UI
// 	countQuery := "SELECT COUNT(*) FROM (" + queryStr + ") as search_results"
// 	var total int
// 	err := db.QueryRow(countQuery, args...).Scan(&total)
// 	if err != nil {
// 		return nil, 0, err
// 	}

// 	// Add Limit/Offset
// 	offset := (params.Page - 1) * params.Limit
// 	queryStr += fmt.Sprintf(" ORDER BY r.id LIMIT $%d OFFSET $%d", argId, argId+1)
// 	args = append(args, params.Limit, offset)

// 	// Execute Main Query
// 	rows, err := db.Query(queryStr, args...)
// 	if err != nil {
// 		return nil, 0, err
// 	}
// 	defer rows.Close()

// 	var results []Recipe
// 	for rows.Next() {
// 		var r Recipe
// 		// Note: We need a dummy var for the scan if description/image can be null
// 		// but for simplicity
// 		if err := rows.Scan(&r.ID, &r.Title, &r.Description, &r.Image, &r.CookTime, &r.TotalTime, &r.Ingredients); err != nil {
// 			return nil, 0, err
// 		}
// 		// Fallback for difficulty (hardcoded for now as it wasn't in the main select)
// 		r.KeyWords = "Medium"
// 		results = append(results, r)
// 	}

// 	return results, total, nil
// }

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
