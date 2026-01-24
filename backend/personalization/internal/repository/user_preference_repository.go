package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
)

type AdditionalInfo struct {
	Allergies        []string  `json:"allergies"`
	MinCookingTime   int       `json:"min_cooking_time"`
	MaxCookingTime   int       `json:"max_cooking_time"`
	Budget           int       `json:"budget"`
	SkillLevel       string    `json:"skill_level"`
	PreferenceVector []float64 `json:"preference_vector"`
}

func GetUserMarketId(db *sql.DB, userId string) (int64, error) {
	var marketId int64
	// Adjust table name 'user_preferences' and column 'user_id' if different
	query := `SELECT market_id FROM user_preferences WHERE user_id = $1`

	err := db.QueryRow(query, userId).Scan(&marketId)
	if err != nil {
		return 0, err
	}
	return marketId, nil
}

func AddItemToShoppingList(tx *sql.Tx, userId string, productId int, quantity int, recipeId int) error {
	var listId int

	err := tx.QueryRow(`
        SELECT id 
        FROM shopping_lists 
        WHERE user_id = $1 AND completed = FALSE
        LIMIT 1
        FOR UPDATE
    `, userId).Scan(&listId)

	if err != nil {
		if err == sql.ErrNoRows {
			err = tx.QueryRow(`
                INSERT INTO shopping_lists (user_id, completed)
                VALUES ($1, FALSE)
                RETURNING id
            `, userId).Scan(&listId)

			if err != nil {
				return fmt.Errorf("failed to create new shopping list: %w", err)
			}
		} else {
			return fmt.Errorf("failed to query active shopping list: %w", err)
		}
	}

	_, err = tx.Exec(`
        INSERT INTO shopping_list_items (shopping_list_id, product_id, quantity, recipe_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (shopping_list_id, product_id, recipe_id) 
        DO UPDATE SET 
            quantity = shopping_list_items.quantity + EXCLUDED.quantity, 
            checked = FALSE
    `, listId, productId, quantity, recipeId)

	if err != nil {
		return fmt.Errorf("failed to add item to list: %w", err)
	}

	return nil
}

func UpdateMarketId(tx *sql.Tx, userId string, marketId string) error {
	_, err := tx.Exec(`
	UPDATE user_preferences
	SET market_id = $1
	WHERE user_id = $2
	`, marketId, userId)

	if err != nil {
		return err
	}

	return nil
}

func AddOrUpdateEmbeddings(tx *sql.Tx, userId string, embedding []float64) error {
	embeddingBytes, _ := json.Marshal(embedding)
	embeddingString := string(embeddingBytes)

	_, err := tx.Exec(`
	INSERT INTO user_embeddings (user_id, embedding)
	VALUES ($1, $2)
	ON CONFLICT (user_id) DO UPDATE
	SET embedding = EXCLUDED.embedding
	`,
		userId, embeddingString)

	if err != nil {
		return err
	}

	return nil
}

func AddUserPreference(tx *sql.Tx, userId string, userInfo AdditionalInfo) error {
	vectorBytes, _ := json.Marshal(userInfo.PreferenceVector)
	vectorString := string(vectorBytes)

	_, err := tx.Exec(`
	INSERT INTO user_preferences (
		user_id, 
		min_cooking_time, 
        max_cooking_time,
		allergies,
	    budget, skill_level, preferences_vec)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	ON CONFLICT (user_id) DO UPDATE
	SET min_cooking_time = EXCLUDED.min_cooking_time,
        max_cooking_time = EXCLUDED.max_cooking_time,
	    allergies = EXCLUDED.allergies,
	    budget = EXCLUDED.budget,
	    skill_level = EXCLUDED.skill_level,
	    preferences_vec = EXCLUDED.preferences_vec
	`,
		userId, userInfo.MinCookingTime, userInfo.MaxCookingTime,
		strings.Join(userInfo.Allergies, ","),
		userInfo.Budget,
		userInfo.SkillLevel,
		vectorString)

	if err != nil {
		return err
	}

	return nil
}
