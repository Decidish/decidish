package repository

import (
	"database/sql"
	migrations "personalization/db/scripts"
	"strings"
)

type RecommenderRepository struct {
	Db *sql.DB
}

func (repo RecommenderRepository) GetRecommendedRecipesForUser(userId string) ([]migrations.Recipe, error) {
	query, err := repo.Db.Query(`
		WITH recommender AS ( 
		    SELECT re.recipe_id, r.embedding <=> re.embedding as dist 
			FROM recipe_embeddings re, (SELECT embedding
		    FROM user_embeddings
		    WHERE user_id = $1) r
			ORDER BY dist
			LIMIT 20
		 ), RecipeKeywords AS (
			SELECT
				rk.recipe_id,
				STRING_AGG(k.name, ', ') AS all_keywords
			FROM recipe_keywords rk
			JOIN keywords k ON rk.keyword_id = k.id
			GROUP BY rk.recipe_id
		),
		RecipeIngredients AS (
			SELECT
				ri.recipe_id,
				STRING_AGG(i.name, ', ') AS all_ingredients
			FROM recipe_ingredients ri
			JOIN ingredients i ON ri.ingredient_id = i.id
			GROUP BY ri.recipe_id
		),
		RecipeCategories AS (
			SELECT
				rca.recipe_id,
				STRING_AGG(c.name, ', ') AS all_categories
			FROM recipe_categories rca
			JOIN categories c ON rca.category_id = c.id
			GROUP BY rca.recipe_id
		)
		
		SELECT
			re.title,
			re.description,
			re.instructions,
			re.cook_time,
			re.prep_time,
			re.total_time,
			re.image,
			re.rating,
			re.serving_size,
			re.calories,
			re.yields,
			rkd.all_keywords AS keywords_condensed,
			rid.all_ingredients AS ingredients_condensed,
			rcd.all_categories AS categories_condensed
		
		FROM recipes re
		JOIN recommender r ON r.recipe_id = re.id
		LEFT JOIN RecipeKeywords rkd ON re.id = rkd.recipe_id
		LEFT JOIN RecipeIngredients rid ON re.id = rid.recipe_id
		LEFT JOIN RecipeCategories rcd ON re.id = rcd.recipe_id`, userId)

	defer query.Close()

	if err != nil {
		return nil, err
	}

	var recipes []migrations.Recipe

	for query.Next() {
		var recipe migrations.Recipe

		var keywordsStr sql.NullString
		var ingredientsStr sql.NullString
		var categoriesStr sql.NullString

		if err := query.Scan(
			&recipe.Title,
			&recipe.Description,
			&recipe.Instructions,
			&recipe.CookTime,
			&recipe.PrepTime,
			&recipe.TotalTime,
			&recipe.Image,
			&recipe.Ratings,
			&recipe.Nutrients.ServingSize,
			&recipe.Nutrients.Calories,
			&recipe.Yields,
			&keywordsStr,
			&ingredientsStr,
			&categoriesStr); err != nil {
			return nil, err
		}

		recipe.KeyWords = strings.Split(keywordsStr.String, ", ")
		recipe.Ingredients = strings.Split(ingredientsStr.String, ", ")
		recipe.Category = categoriesStr.String

		recipes = append(recipes, recipe)
	}

	return recipes, nil
}
