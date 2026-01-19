package repository

import (
	"database/sql"
)

type AdditionalInfo struct {
	Allergies   []string `json:"allergies"`
	CookingTime string   `json:"cooking_time"`
	Budget      string   `json:"budget"`
	SkillLevel  string   `json:"skill_level"`
	PreferenceVector []float64 `json:"preference_vector"`
}

func AddUserPreferenceVector(tx *sql.Tx, userId string, userInfo AdditionalInfo) error {
	return nil;
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
