package migrations

import (
	"bufio"
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"personalization/config"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type Nutrients struct {
	ServingSize string `json:"servingSize"`
	Calories    string `json:"calories"`
}

type Recipe struct {
	Category    string `json:"category"`
	CookTime    int    `json:"cook_time"`
	Description string `json:"description"`
	Image       string `json:"image"`

	Ingredients  []string  `json:"ingredients"`
	Instructions string    `json:"instructions"`
	KeyWords     []string  `json:"keywords"`
	Nutrients    Nutrients `json:"nutrients"`

	PrepTime  int     `json:"prep_time"`
	Ratings   float64 `json:"ratings"`
	TotalTime int     `json:"total_time"`

	Title  string `json:"title"`
	Yields string `json:"yields"`
}

func (r Recipe) String() string {
	ingredientsStr := strings.Join(r.Ingredients, ", ")

	keywordsStr := strings.Join(r.KeyWords, ", ")

	// We explicitly label each part so the model understands the context.
	return fmt.Sprintf(
		"Title: %s. Description: %s. Category: %s. Ingredients: %s. Instructions: %s. Keywords: %s. Nutrition: %s calories per %s. Time: %d minutes total (%d prep, %d cook). Yields: %s.",
		r.Title,
		r.Description,
		r.Category,
		ingredientsStr,
		r.Instructions,
		keywordsStr,
		r.Nutrients.Calories,
		r.Nutrients.ServingSize,
		r.TotalTime,
		r.PrepTime,
		r.CookTime,
		r.Yields,
	)
}

func SaveRecipe(recipe *Recipe, tx *sql.Tx) (int, error) {
	var recipeID int

	err := tx.QueryRow(`
			INSERT INTO recipes (title, description, instructions, cook_time, prep_time, total_time, image, rating, serving_size, calories, yields) 
			values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			ON CONFLICT (title) DO UPDATE SET title = EXCLUDED.title
			RETURNING id
			`,
		recipe.Title,
		recipe.Description,
		recipe.Instructions,
		recipe.CookTime,
		recipe.PrepTime,
		recipe.TotalTime,
		recipe.Image,
		recipe.Ratings,
		recipe.Nutrients.ServingSize,
		recipe.Nutrients.Calories,
		recipe.Yields,
	).Scan(&recipeID)

	if err != nil {
		return -1, err
	}

	return recipeID, nil
}

func SaveCategories(recipeId int, recipe Recipe, tx *sql.Tx) error {
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
			`, recipeId, categoryID)

		if err != nil {
			return err
		}
	}

	return nil
}

func SaveKeywords(recipeId int, recipe Recipe, tx *sql.Tx) error {
	stmtKeyword := `INSERT INTO keywords (name) values ($1) 
                	ON CONFLICT (name) DO UPDATE set name = excluded.name 
                	RETURNING id`
	stmtRecipeKeyword := `INSERT INTO recipe_keywords (recipe_id, keyword_id) 
							values ($1, $2)
							ON CONFLICT DO NOTHING `

	for _, keyword := range recipe.KeyWords {
		var keywordID int

		err := tx.QueryRow(stmtKeyword, keyword).Scan(&keywordID)

		if err != nil {
			return err
		}

		_, err = tx.Exec(stmtRecipeKeyword, recipeId, keywordID)

		if err != nil {
			return err
		}
	}
	return nil
}

func processInBatches(config config.ApplicationConfig, recipeIds []int, recipeStrs []string) {
	const batchSize = 100

	if len(recipeIds) != len(recipeStrs) {
		fmt.Println("Error: ID slice and string slice lengths do not match.")
		return
	}
	totalItems := len(recipeIds)

	type EmbedRequest struct {
		RecipeIds  []int    `json:"recipe_ids"`
		RecipeStrs []string `json:"recipe_strs"`
	}

	for i := 0; i < totalItems; i += batchSize {
		endIndex := i + batchSize
		if endIndex > totalItems {
			endIndex = totalItems
		}

		batchIDs := recipeIds[i:endIndex]
		batchStrs := recipeStrs[i:endIndex]

		go func(ids []int, strs []string) {
			start := time.Now()

			jsonBody, err := json.Marshal(EmbedRequest{
				RecipeIds:  ids,
				RecipeStrs: strs,
			})
			if err != nil {
				fmt.Println("Error marshalling batch:", err)
				return
			}

			// 2. Post the request
			resp, err := http.Post(config.EmbedderServerUrl+"/process_batch", "application/json", bytes.NewBuffer(jsonBody))
			if err != nil {
				fmt.Println("Error posting batch:", err)
				return
			}
			defer resp.Body.Close()

			end := time.Now()
			fmt.Printf("Async batch (items: %d) request status: %s, duration: %v\n",
				len(ids), resp.Status, end.Sub(start))

		}(batchIDs, batchStrs)
	}
}

func SaveIngredients(recipeId int, recipe Recipe, tx *sql.Tx) error {
	var ingredientRegex = regexp.MustCompile(`^(\d+[\.,]?\d*)\s*([a-zA-ZäöüÄÖÜß\(\) ]*?)\s*(.*)$`)

	stmtIngredient := `INSERT INTO ingredients (name) values ($1) ON CONFLICT (name) DO UPDATE set name = excluded.name RETURNING id`
	stmtRecipeIngredient := `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) values ($1, $2, $3, $4) ON CONFLICT DO NOTHING `

	// Insert into ingredients table
	for _, ingredient := range recipe.Ingredients {
		// parse unit, name, quantity from ingredient string if needed
		matches := ingredientRegex.FindStringSubmatch(ingredient)

		amount := 0.0
		unit := ""
		name := ingredient

		if len(matches) == 4 {
			parsedAmount, err := strconv.ParseFloat(matches[1], 64)

			if err != nil {
				return err
			}

			amount = parsedAmount
			unit = matches[2]
			name = matches[3]
		}

		var ingredientID int

		err := tx.QueryRow(stmtIngredient, name).Scan(&ingredientID)

		if err != nil {
			return err
		}

		_, err = tx.Exec(stmtRecipeIngredient, recipeId, ingredientID, amount, unit)

		if err != nil {
			return err
		}
	}

	return nil
}

func UpSeedRecipesTable(config config.ApplicationConfig, db *sql.DB) error {
	tx, err := db.Begin()

	if err != nil || tx == nil {
		return errors.New("no transaction could be established")
	}

	f, err := os.Open(LocalFilename)

	if err != nil {
		return err
	}

	defer f.Close()

	scanner := bufio.NewScanner(f)
	recipeCount := 1

	var recipeIds []int
	var recipeStr []string

	for scanner.Scan() {

		line := scanner.Bytes()

		var recipe Recipe

		err = json.Unmarshal(line, &recipe)

		// Unable to unmarshal JSON line
		if err != nil {
			return err
		}

		// Insert recipe into the database
		recipeId, err := SaveRecipe(&recipe, tx)
		if err != nil {
			return err
		}

		// Insert categories into a separate table if needed
		err = SaveCategories(recipeId, recipe, tx)
		if err != nil {
			return err
		}

		// Insert keywords
		err = SaveKeywords(recipeId, recipe, tx)
		if err != nil {
			return err
		}

		// Insert ingredients
		err = SaveIngredients(recipeId, recipe, tx)
		if err != nil {
			return err
		}

		recipeIds = append(recipeIds, recipeId)
		recipeStr = append(recipeStr, recipe.String())
		recipeCount++
	}

	processInBatches(config, recipeIds, recipeStr)

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}
