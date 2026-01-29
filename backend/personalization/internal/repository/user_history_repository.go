package repository

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type UserHistory struct {
	ID              int       `json:"id"`
	UserID          string    `json:"user_id"`
	Action          bool      `json:"action"`
	Recipe          Recipe    `json:"recipe"`
	ActionTimestamp time.Time `json:"action_timestamp"`
}

const THRESHOLD = 99 // Max number of likes and dislikes per user

func AddUserHistory(tx *sql.Tx, userId string, recipeId int, action bool) (int, error) {
	var id int

	// Insert only if (userId, recipeId, action) combination does not already exist
	// If pair (userId, recipeId) exists with different action, allow insertion updating the action
	query := `
        WITH deleted AS (
            DELETE FROM user_history
            WHERE id IN (
                SELECT id
                FROM user_history
                WHERE user_id = $1
                  AND action = $3
                  AND recipe_id <> $2
                ORDER BY action_timestamp ASC
                LIMIT 1
            )
            AND (
                SELECT COUNT(*)
                FROM user_history
                WHERE user_id = $1
                  AND action = $3
            ) >= $4
        )
        INSERT INTO user_history (user_id, recipe_id, action)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, recipe_id)
        DO UPDATE SET
            action = EXCLUDED.action,
            action_timestamp = CURRENT_TIMESTAMP
        WHERE user_history.action IS DISTINCT FROM EXCLUDED.action
        RETURNING id
    `

	err := tx.QueryRow(query, userId, recipeId, action, THRESHOLD).Scan(&id)

    if err != nil {
        if err == sql.ErrNoRows {
            // This occurs if the INSERT conflicted, and the DO UPDATE was skipped 
            // because the action was identical. In this case, we retrieve the existing ID.
            err = tx.QueryRow(`
                SELECT id FROM user_history 
                WHERE user_id = $1 AND recipe_id = $2
            `, userId, recipeId).Scan(&id)
            
            if err != nil {
                return 0, fmt.Errorf("failed to fetch existing user history id: %w", err)
            }
            return id, nil
        }
        return 0, err
    }

    return id, nil
}

func GetUserHistory(db *sql.DB, userId string) ([]UserHistory, error) {
	rows, err := db.Query(`
		WITH history AS (
			SELECT id, user_id, recipe_id, action, action_timestamp
			FROM user_history
			WHERE user_id = $1
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
			h.id,
			h.user_id,
			h.action,
			h.action_timestamp,
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
			COALESCE(rid.all_ingredients, '')
		FROM history h
		JOIN recipes re ON h.recipe_id = re.id
		LEFT JOIN RecipeKeywords rkd ON re.id = rkd.recipe_id
		LEFT JOIN RecipeIngredients rid ON re.id = rid.recipe_id
		LEFT JOIN RecipeCategories rcd ON re.id = rcd.recipe_id
		ORDER BY h.action_timestamp DESC
	`, userId)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var histories []UserHistory
	for rows.Next() {
		var h UserHistory
		var r Recipe
		var keywordsStr, ingredientsStr, categoriesStr string

		if err := rows.Scan(
			&h.ID,
			&h.UserID,
			&h.Action,
			&h.ActionTimestamp,
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
		); err != nil {
			return nil, err
		}

		if keywordsStr != "" {
			r.KeyWords = strings.Split(keywordsStr, ", ")
		}
		if ingredientsStr != "" {
			r.Ingredients = strings.Split(ingredientsStr, ", ")
		}
		if categoriesStr != "" {
			r.Category = categoriesStr
		}

		h.Recipe = r
		histories = append(histories, h)
	}

	return histories, rows.Err()
}

func GetUserLikedRecipes(db *sql.DB, userId string) ([]int, error) {
	return getUserRecipes(db, userId, true)
}

func GetUserDislikedRecipes(db *sql.DB, userId string) ([]int, error) {
	return getUserRecipes(db, userId, false)
}

func getUserRecipes(db *sql.DB, userId string, like bool) ([]int, error) {
	rows, err := db.Query(`
		SELECT recipe_id
		FROM user_history
		WHERE user_id = $1 AND action = $2
		ORDER BY action_timestamp DESC
	`, userId, like)

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

func DeleteDeprecatedUserHistory(db *sql.DB, cutoff time.Time) (int64, error) {
	result, err := db.Exec(`
		DELETE FROM user_history 
		WHERE action_timestamp < $1`,
		cutoff)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}
