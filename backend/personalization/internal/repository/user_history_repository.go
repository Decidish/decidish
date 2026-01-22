package repository

import (
	"database/sql"
	"time"
)

type UserHistory struct {
	ID              int       `json:"id"`
	UserID          string    `json:"user_id"`
	Action          bool      `json:"action"`
	RecipeID        int       `json:"recipe_id"`
	ActionTimestamp time.Time `json:"action_timestamp"`
}

func AddUserHistory(tx *sql.Tx, userId string, recipeId int, action bool) error {
	_, err := tx.Exec(`
		INSERT INTO user_history (user_id, recipe_id, action)
		VALUES ($1, $2, $3)
	`, userId, recipeId, action)

	if err != nil {
		return err
	}

	return nil
}

func GetUserHistory(db *sql.DB, userId string) ([]UserHistory, error) {
	rows, err := db.Query(`
		SELECT id, user_id, recipe_id, action, action_timestamp
		FROM user_history
		WHERE user_id = $1
		ORDER BY action_timestamp DESC
	`, userId)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var histories []UserHistory
	for rows.Next() {
		var history UserHistory
		if err := rows.Scan(&history.ID, &history.UserID, &history.RecipeID, &history.Action, &history.ActionTimestamp); err != nil {
			return nil, err
		}
		histories = append(histories, history)
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
