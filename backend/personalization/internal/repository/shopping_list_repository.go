package repository

import (
	"database/sql"
	"fmt"
	"strconv"
	"time"
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

type ShoppingItem struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Image      string  `json:"image"`
	Price      float64 `json:"price"`
	Checked    bool    `json:"checked"`
	Quantity   int     `json:"quantity"`
	RecipeID   *string `json:"recipeId,omitempty"`
	RecipeName *string `json:"recipeName,omitempty"`
}

type RecipeGroup struct {
	RecipeName string         `json:"recipeName"`
	IsExpanded bool           `json:"isExpanded"`
	Items      []ShoppingItem `json:"items"`
}

type ShoppingListResponse struct {
	ID         string        `json:"id"`
	Date       time.Time     `json:"date"`
	TotalItems int           `json:"totalItems"`
	TotalPrice float64       `json:"totalPrice"`
	Groups     []RecipeGroup `json:"groups"`
}

func GetShoppingLists(db *sql.DB, userId string, completed bool) ([]ShoppingListResponse, error) {
	query := `
        SELECT 
            sl.id, sl.created_at,
            sli.id, sli.quantity, sli.checked,
            p.name, p.image_url, p.price,
            COALESCE(r.title, 'Misc Items') as recipe_name -- Handle nulls directly in SQL
        FROM shopping_lists sl
        JOIN shopping_list_items sli ON sl.id = sli.shopping_list_id
        JOIN products p ON sli.product_id = p.id
        LEFT JOIN recipes r ON sli.recipe_id = r.id
        WHERE sl.user_id = $1 AND sl.completed = $2
        ORDER BY recipe_name -- Order helps us group faster if we wanted, but map is safer
    `

	rows, err := db.Query(query, userId, completed)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	response := &ShoppingListResponse{
		Groups: []RecipeGroup{},
	}

	groupedMap := make(map[string][]ShoppingItem)

	var recipeOrder []string

	for rows.Next() {
		var (
			listID, itemID, qty int
			createdAt           time.Time
			checked             bool
			pName, pImg, rName  string
			pPrice              float64
		)

		if err := rows.Scan(&listID, &createdAt, &itemID, &qty, &checked, &pName, &pImg, &pPrice, &rName); err != nil {
			return nil, err
		}

		response.ID = strconv.Itoa(listID)
		response.Date = createdAt
		response.TotalItems += qty
		response.TotalPrice += pPrice * float64(qty)

		item := ShoppingItem{
			ID:       strconv.Itoa(itemID),
			Name:     pName,
			Image:    pImg,
			Price:    pPrice,
			Checked:  checked,
			Quantity: qty,
		}

		if _, exists := groupedMap[rName]; !exists {
			recipeOrder = append(recipeOrder, rName)
		}
		groupedMap[rName] = append(groupedMap[rName], item)
	}

	for _, recipeName := range recipeOrder {
		group := RecipeGroup{
			RecipeName: recipeName,
			IsExpanded: true,
			Items:      groupedMap[recipeName],
		}
		response.Groups = append(response.Groups, group)
	}

	if response.ID == "" {
		return []ShoppingListResponse{}, nil
	}

	return []ShoppingListResponse{*response}, nil
}
