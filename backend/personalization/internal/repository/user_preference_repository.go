package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/lib/pq"
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

// CartItemInput represents a single item to add to shopping list
type CartItemInput struct {
	ProductId int
	Quantity  int
	RecipeId  int
}

// AddItemsToShoppingListBatch adds multiple items to shopping list in a single efficient batch operation
// Uses atomic INSERT ON CONFLICT for race-condition-safe get-or-create of shopping list
func AddItemsToShoppingListBatch(tx *sql.Tx, userId string, items []CartItemInput) error {
	if len(items) == 0 {
		return nil
	}

	// Step 1: Deduplicate items by (productId, recipeId) - sum quantities for duplicates
	// This is necessary because PostgreSQL ON CONFLICT cannot affect the same row twice in one INSERT
	type itemKey struct {
		productId int
		recipeId  int
	}
	deduped := make(map[itemKey]int) // key -> total quantity
	for _, item := range items {
		key := itemKey{productId: item.ProductId, recipeId: item.RecipeId}
		deduped[key] += item.Quantity
	}

	// Convert back to arrays
	dedupedItems := make([]CartItemInput, 0, len(deduped))
	for key, qty := range deduped {
		dedupedItems = append(dedupedItems, CartItemInput{
			ProductId: key.productId,
			Quantity:  qty,
			RecipeId:  key.recipeId,
		})
	}

	// Step 2: Atomic get-or-create the active shopping list using INSERT ON CONFLICT
	// This uses the partial unique index idx_shopping_lists_active_user (user_id WHERE completed = FALSE)
	// to handle concurrent requests safely without race conditions
	var listId int
	err := tx.QueryRow(`
		INSERT INTO shopping_lists (user_id, completed)
		VALUES ($1, FALSE)
		ON CONFLICT (user_id) WHERE completed = FALSE
		DO UPDATE SET user_id = EXCLUDED.user_id
		RETURNING id
	`, userId).Scan(&listId)

	if err != nil {
		return fmt.Errorf("failed to get or create shopping list: %w", err)
	}

	// Step 3: Batch insert all items using a single query with UNNEST
	// This is much faster than individual inserts
	productIds := make([]int, len(dedupedItems))
	quantities := make([]int, len(dedupedItems))
	recipeIds := make([]int, len(dedupedItems))

	for i, item := range dedupedItems {
		productIds[i] = item.ProductId
		quantities[i] = item.Quantity
		recipeIds[i] = item.RecipeId
	}

	_, err = tx.Exec(`
		INSERT INTO shopping_list_items (shopping_list_id, product_id, quantity, recipe_id)
		SELECT $1, unnest($2::int[]), unnest($3::int[]), unnest($4::int[])
		ON CONFLICT (shopping_list_id, product_id, recipe_id) 
		DO UPDATE SET 
			quantity = shopping_list_items.quantity + EXCLUDED.quantity, 
			checked = FALSE
	`, listId, pq.Array(productIds), pq.Array(quantities), pq.Array(recipeIds))

	if err != nil {
		return fmt.Errorf("failed to batch add items to list: %w", err)
	}

	return nil
}

// AddItemToShoppingList adds a single item to shopping list (kept for backwards compatibility)
func AddItemToShoppingList(tx *sql.Tx, userId string, productId int, quantity int, recipeId int) error {
	return AddItemsToShoppingListBatch(tx, userId, []CartItemInput{{
		ProductId: productId,
		Quantity:  quantity,
		RecipeId:  recipeId,
	}})
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
	    budget, skill_level, preferences_vec)
	VALUES ($1, $2, $3, $4, $5, $6)
	ON CONFLICT (user_id) DO UPDATE
	SET min_cooking_time = EXCLUDED.min_cooking_time,
        max_cooking_time = EXCLUDED.max_cooking_time,
	    budget = EXCLUDED.budget,
	    skill_level = EXCLUDED.skill_level,
	    preferences_vec = EXCLUDED.preferences_vec
	`,
		userId, userInfo.MinCookingTime, userInfo.MaxCookingTime,
		userInfo.Budget,
		userInfo.SkillLevel,
		vectorString)

	_, err = tx.Exec(`DELETE FROM user_allergens WHERE user_id = $1`, userId)
	if err != nil {
		return err
	}

	for allergen := range userInfo.Allergies {
		// find allergen id from allergens table
		var allergenId int
		err = tx.QueryRow(`
		SELECT id
		FROM allergens
		WHERE name = $1
		LIMIT 1
		`, userInfo.Allergies[allergen]).Scan(&allergenId)

		if err != nil {
			return err
		}

		_, err = tx.Exec(`
		INSERT INTO user_allergens (user_id, allergen_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, allergen_id) DO NOTHING
		`, userId, allergenId)

		if err != nil {
			return err
		}
	}
	

	if err != nil {
		return err
	}

	return nil
}

type UserPreferencesWithMarket struct {
	MinCookingTime   int       `json:"min_cooking_time"`
	MaxCookingTime   int       `json:"max_cooking_time"`
	Allergies        string    `json:"allergies"`
	Budget           int       `json:"budget"`
	SkillLevel       string    `json:"skill_level"`
	MarketId         *int64    `json:"market_id"`
	PreferenceVector []float64 `json:"preference_vector"`
	MarketName       *string   `json:"market_name"`
	MarketStreet     *string   `json:"market_street"`
	MarketCity       *string   `json:"market_city"`
	MarketZipCode    *string   `json:"market_zip_code"`
	MarketLatitude   *float64  `json:"market_latitude"`
	MarketLongitude  *float64  `json:"market_longitude"`
}

func GetUserPreferences(db *sql.DB, userId string) (*UserPreferencesWithMarket, error) {
	var prefs UserPreferencesWithMarket
	var prefsVecBytes []byte

	err := db.QueryRow(`
		WITH UserAllergies AS (
		SELECT 
			ua.user_id,
			string_agg(a.name, ',') AS allergies
		FROM user_allergens ua
		JOIN allergens a ON ua.allergen_id = a.id
		WHERE ua.user_id = $1
		GROUP BY ua.user_id
		)

		SELECT 
			up.min_cooking_time,
			up.max_cooking_time,
			COALESCE(ual.allergies, '') AS allergies,
			up.budget,
			up.skill_level,
			up.market_id,
			up.preferences_vec,
			m.name AS market_name,
			a.street,
			a.city,
			a.zip_code,
			a.latitude,
			a.longitude
		FROM user_preferences up
		LEFT JOIN UserAllergies ual ON up.user_id = ual.user_id
		LEFT JOIN markets m ON up.market_id::BIGINT = m.id 
		LEFT JOIN addresses a ON m.address_id = a.id
		WHERE up.user_id = $1;
	`, userId).Scan(
		&prefs.MinCookingTime,
		&prefs.MaxCookingTime,
		&prefs.Allergies,
		&prefs.Budget,
		&prefs.SkillLevel,
		&prefs.MarketId,
		&prefsVecBytes,
		&prefs.MarketName,
		&prefs.MarketStreet,
		&prefs.MarketCity,
		&prefs.MarketZipCode,
		&prefs.MarketLatitude,
		&prefs.MarketLongitude,
	)

	if err != nil {
		return nil, err
	}

	// Unmarshal the JSON bytes into the float64 slice
	if len(prefsVecBytes) > 0 {
		err = json.Unmarshal(prefsVecBytes, &prefs.PreferenceVector)
		if err != nil {
			return nil, err
		}
	}

	return &prefs, nil
}

// func (repository *UserPreferenceRepository) Save(tx *sql.Tx, userId string, preferences UserPreferences) error {
// 	_, err := tx.Exec(`
// 	INSERT INTO user_preferences (
// 	                              user_id, postal_code, weekly_budget,
// 	                              cook_frequency, dietary_preferences, allergies,
// 	                              servings_per_meal, cooking_skill)
// 	VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
// 	ON CONFLICT (user_id) DO UPDATE
// 	SET postal_code = EXCLUDED.postal_code,
// 	    weekly_budget = EXCLUDED.weekly_budget,
// 	    cook_frequency = EXCLUDED.cook_frequency,
// 	    dietary_preferences = EXCLUDED.dietary_preferences,
// 	    allergies = EXCLUDED.allergies,
// 	    servings_per_meal = EXCLUDED.servings_per_meal,
// 	    cooking_skill = EXCLUDED.cooking_skill
// 	`,
// 		userId, preferences.PostalCode, preferences.WeeklyBudget,
// 		preferences.CookFrequency, strings.Join(preferences.DietaryPreferences, ","),
// 		strings.Join(preferences.Allergies, ","), preferences.ServingPerMeal,
// 		preferences.CookingSkill)
// 	if err != nil {
// 		return err
// 	}

// 	return nil
// }
