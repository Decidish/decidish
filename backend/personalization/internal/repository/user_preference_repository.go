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
	Budget           int    	`json:"budget"`
	SkillLevel       string    `json:"skill_level"`
	PreferenceVector []float64 `json:"preference_vector"`
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
