package repository

import (
	"database/sql"
	"fmt"
)

func UpdateShoppingListItem(tx *sql.Tx, userId string, itemId string, checked *bool) error {
	_, err := tx.Exec(`
	UPDATE shopping_list_items
	SET checked = COALESCE($1, checked)
	WHERE id = $2
	AND shopping_list_id = (
		SELECT id FROM shopping_lists
		WHERE user_id = $3
		AND completed = FALSE
		LIMIT 1
	)
	`, checked, itemId, userId)

	if err != nil {
		return fmt.Errorf("failed to update shopping list item: %w", err)
	}

	return nil
}

func DeleteShoppingListItem(tx *sql.Tx, userId string, itemId string) error {
	_, err := tx.Exec(`
	DELETE FROM shopping_list_items
	WHERE id = $1
	AND shopping_list_id = (
		SELECT id FROM shopping_lists
		WHERE user_id = $2
		AND completed = FALSE
		LIMIT 1
	)
	`, itemId, userId)

	if err != nil {
		return fmt.Errorf("failed to delete shopping list item: %w", err)
	}

	return nil
}

func MarkShoppingListCompleted(db *sql.DB, userId string, listId string) error {
	_, err := db.Exec(`
	UPDATE shopping_lists
	SET 
		completed = TRUE,
		completed_at = NOW()
	WHERE id = $1
	AND user_id = $2
	AND completed = FALSE
	`, listId, userId)

	if err != nil {
		return fmt.Errorf("failed to mark shopping list as completed: %w", err)
	}

	return nil
}