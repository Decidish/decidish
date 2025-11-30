package migrations

import (
	"bufio"
	"database/sql"
	"encoding/json"
	"errors"
	"os"
	"regexp"
	"strconv"
	"strings"
)

type Recipe struct {
	Author       string `json:"author"`
	CanonicalURL string `json:"canonical_url"`
	Category     string `json:"category"` // Comma-separated string
	CookTime     int    `json:"cook_time"`
	Description  string `json:"description"`
	Host         string `json:"host"`
	Image        string `json:"image"`
	// Use []string for ingredients list
	Ingredients  []string `json:"ingredients"`
	Instructions string   `json:"instructions"`
	PrepTime     int      `json:"prep_time"`
	Title        string   `json:"title"`
	Yields       string   `json:"yields"`
	// Note: We ignore complex types like ingredient_groups and nutrients for simplicity
}

func UpSeedRecipesTable(db *sql.DB) error {
	tx, err := db.Begin()

	if err != nil || tx == nil {
		return errors.New("no transaction could be established")
	}

	f, err := os.Open("data/recipes.jsonl")

	if err != nil {
		return err
	}

	defer f.Close()

	scanner := bufio.NewScanner(f)

	batchSize := 500
	recipeCount := 1

	for scanner.Scan() {
		if recipeCount%batchSize == 0 {
			if err := tx.Commit(); err != nil {
				return err
			}
			tx, err = db.Begin()
			if err != nil || tx == nil {
				return errors.New("no transaction could be established")
			}
		}

		line := scanner.Bytes()

		var recipe Recipe

		err = json.Unmarshal(line, &recipe)

		// Unable to unmarshal JSON line
		if err != nil {
			return err
		}

		// Insert recipe into the database
		var recipeID int

		err = tx.QueryRow(`
			INSERT INTO recipes (title, description, instructions, cook_time, prep_time, image, yields) 
			values ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id
			`,
			recipe.Title,
			recipe.Description,
			recipe.Instructions,
			recipe.CookTime,
			recipe.PrepTime,
			recipe.Image,
			recipe.Yields,
		).Scan(&recipeID)

		if err != nil {
			return err
		}

		// Insert categories into a separate table if needed
		for _, category := range strings.Split(recipe.Category, ",") {
			category = strings.TrimSpace(category)

			var categoryID int
			err := tx.QueryRow(`
			INSERT INTO categories (name) values ($1) 
			ON CONFLICT (name) DO NOTHING
			RETURNING id
			`, category,
			).Scan(&categoryID)

			if errors.Is(err, sql.ErrNoRows) {
				continue
			}

			if err != nil {
				return err
			}

			_, err = tx.Exec(`
			INSERT INTO recipe_categories (recipe_id, category_id) values ($1, $2)
			`, recipeID, categoryID)

			if err != nil {
				return err
			}

		}

		var ingredientRegex = regexp.MustCompile(`^(\d+[\.,]?\d*)\s*([a-zA-Zäöüß]{1,6})?\s*(.*)$`)

		stmtIngredient := `INSERT INTO ingredients (name) values ($1) ON CONFLICT DO NOTHING RETURNING id`
		stmtRecipeIngredient := `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) values ($1, $2, $3, $4)`

		// Insert into ingredients table
		for _, ingredient := range recipe.Ingredients {
			// parse unit, name, quantity from ingredient string if needed
			matches := ingredientRegex.FindStringSubmatch(ingredient)

			amount := 0.0
			unit := ""
			name := ingredient

			if len(matches) == 4 {
				amount, err = strconv.ParseFloat(matches[1], 64)

				if err != nil {
					return err
				}

				unit = matches[2]
				name = matches[3]
			}

			var ingredientID int

			err := tx.QueryRow(stmtIngredient, name).Scan(&ingredientID)

			if errors.Is(err, sql.ErrNoRows) {
				continue
			}

			if err != nil {
				return err
			}

			_, err = tx.Exec(stmtRecipeIngredient, recipeID, ingredientID, amount, unit)

			if err != nil {
				return err
			}
		}

		recipeCount++
	}

	tx.Commit()

	return nil
}
