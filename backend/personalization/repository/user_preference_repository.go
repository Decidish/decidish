package repository

import (
	"database/sql"
	"fmt"
	"strings"
)

type UserPreferences struct {
	PostalCode         string   `json:"postal_code"`
	WeeklyBudget       float64  `json:"weekly_budget"`
	CookFrequency      int      `json:"cook_frequency"`
	DietaryPreferences []string `json:"diet_preferences"`
	Allergies          []string `json:"allergies"`
	ServingPerMeal     int      `json:"serving_per_meal"`
	CookingSkill       string   `json:"cooking_skill"`
}

func (prefs UserPreferences) String() string {
	core := fmt.Sprintf(
		"This user lives in postal code %s and cooks %d times per week. They are looking for recipes.",
		prefs.PostalCode,
		prefs.CookFrequency,
	)

	constraints := fmt.Sprintf(
		"Serving size is %d portions per meal. They classify their cooking skill as '%s'.",
		prefs.ServingPerMeal,
		prefs.CookingSkill,
	)

	budget := fmt.Sprintf(
		"They have a target weekly budget of %.2f. Their dietary preferences include: %s.",
		prefs.WeeklyBudget,
		strings.Join(prefs.DietaryPreferences, ", "),
	)

	allergies := ""
	if len(prefs.Allergies) > 0 {
		allergies = fmt.Sprintf("CRITICAL RESTRICTION: They must avoid all recipes containing: %s.",
			strings.Join(prefs.Allergies, ", "),
		)
	}

	return strings.Join([]string{core, constraints, budget, allergies}, " ")
}

type UserPreferenceRepository struct {
	Db *sql.DB
}

func NewUserPreferenceRepository(db *sql.DB) *UserPreferenceRepository {
	return &UserPreferenceRepository{
		Db: db,
	}
}

func (repository *UserPreferenceRepository) Save(userId string, preferences UserPreferences) error {
	_, err := repository.Db.Exec(`
	INSERT INTO user_preferences (
	                              user_id, postal_code, weekly_budget, 
	                              cook_frequency, dietary_preferences, allergies, 
	                              servings_per_meal, cooking_skill)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`,
		userId, preferences.PostalCode, preferences.WeeklyBudget,
		preferences.CookFrequency, strings.Join(preferences.DietaryPreferences, ","),
		strings.Join(preferences.Allergies, ","), preferences.ServingPerMeal,
		preferences.CookingSkill)
	if err != nil {
		return err
	}

	return nil
}
