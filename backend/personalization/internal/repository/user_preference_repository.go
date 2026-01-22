package repository

import (
	"database/sql"
	"encoding/json"
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

func AddProductToUserCart(tx *sql.Tx, userId string, productId int, quantity int, recipeId int) error {
	_, err := tx.Exec(`
	INSERT INTO user_cart (user_id, product_id, quantity, recipe_id)
	VALUES ($1, $2, $3, $4)
	ON CONFLICT (user_id, recipe_id, product_id) 
	DO UPDATE SET quantity = EXCLUDED.quantity
	`, userId, productId, quantity, recipeId)

	if err != nil {
		return err
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

type ShoppingItem struct {
	Id             int     `json:"id"`
	Name           string  `json:"name"`
	Image          string  `json:"image"`
	Price          float64 `json:"price"`
	Category       string  `json:"category"`
	Checked        bool    `json:"checked"`
	IngredientName string  `json:"ingredient_name,omitempty"`
}

type Product struct {
	Id     int     `json:"id"`
	Name   string  `json:"name"`
	Brand  string  `json:"brand"`
	Image  string  `json:"image"`
	Price  float64 `json:"price"`
	Weight string  `json:"weight"`
	Unit   string  `json:"unit"`
}

type ShoppingList struct {
	Id         int            `json:"id"`
	Date       string         `json:"date"`
	TotalItems int            `json:"total_items"`
	TotalPrice float64        `json:"total_price"`
	Recipes    []string       `json:"recipes"`
	Items      []ShoppingItem `json:"items"`
	Completed  bool           `json:"completed"`
}

//func GetUserCartItems(db *sql.DB, id string) (interface{}, interface{}) {
//	return nil, nil
//}
