package migrations

import (
	"bufio"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"os"
	"regexp"
	"strings"

	"github.com/pressly/goose/v3"
)

type Recipe struct {
	Author           string          `json:"author"`
	CanonicalURL     string          `json:"canonical_url"`
	Category         string          `json:"category"` // Comma-separated string
	CookTime         int             `json:"cook_time"`
	Description      string          `json:"description"`
	Host             string          `json:"host"`
	Image            string          `json:"image"`
	// Use []string for ingredients list
	Ingredients      []string        `json:"ingredients"` 
	Instructions     string          `json:"instructions"`
	PrepTime         int             `json:"prep_time"`
	Title            string          `json:"title"`
	Yields           string          `json:"yields"`
	// Note: We ignore complex types like ingredient_groups and nutrients for simplicity
}

func init() {
	goose.AddMigrationContext(upSeedRecipesTable, downSeedRecipesTable)
}

func upSeedRecipesTable(ctx context.Context, tx *sql.Tx) error {
	if tx == nil {
		return errors.New("No transaction could be established")
	}

	f, err := os.Open("data/recipes.jsonl")
	
	if err != nil {
		return err
	}

	defer f.Close()

	scanner := bufio.NewScanner(f)

	batchSize := 500
	recipeCount := 0

	for scanner.Scan() {
		if recipeCount % batchSize == 0 {
			if err := tx.Commit(); err != nil {
					return err	
			}
		}

		line := scanner.Bytes()
		
		var recipe Recipe

		err = json.Unmarshal(line, &recipe)
		
		// Unable to unmarshal JSON line
		if err != nil {
			return err
		}

		// CREATE TABLE recipes (
		// 	id INT SERIAL PRIMARY KEY,
		// 	title TEXT,
		// 	description TEXT,
		// 	instructions TEXT,
		// 	cook_time INT,
		// 	prep_time INT,
		// 	image VARCHAR(255),
		// 	yields TEXT
		// )

		// Insert recipe into the database
		var recipeID int
		
		err = tx.QueryRowContext(ctx, `
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
			err := tx.QueryRowContext(ctx, `
			INSERT INTO categories (name) values ($1) 
			ON CONFLICT (name) DO NOTHING
			RETURNING id
			`, category,
			).Scan(&categoryID)

			if err != nil {
				return err
			}

			_, err = tx.ExecContext(ctx, `
			INSERT INTO recipe_categories (recipe_id, category_id) values ($1, $2)
			`, recipeID, categoryID)


			if err != nil {
				return err
			}

		}

		var ingredientRegex = regexp.MustCompile(`^(\d+[\.,]?\d*)\s*([a-zA-Zäöüß]{1,6})?\s*(.*)$`)

		stmtIngredient := `INSERT INTO ingredients (name) values ($1) RETURNING id`
		stmtRecipeIngredient := `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) values ($1, $2, $3, $4)`

		// Insert into ingredients table
		for _, ingredient := range recipe.Ingredients {
			// parse unit, name, quantity from ingredient string if needed
			matches := ingredientRegex.FindStringSubmatch(ingredient)

			amount := 0.0
			unit := ""
			name := ingredient

			if len(matches) == 4 {
				
			}

			var ingredientID int

			err := tx.QueryRowContext(ctx, stmtIngredient, name).Scan(&ingredientID)

			if err != nil {
				return err
			}

			_, err = tx.ExecContext(ctx, stmtRecipeIngredient, recipeID, ingredientID, amount, unit)

			if err != nil {
				return err
			}
		}


		recipeCount++
	}

	return nil
}

func downSeedRecipesTable(ctx context.Context, tx *sql.Tx) error {
	// This code is executed when the migration is rolled back.
	return nil
}
