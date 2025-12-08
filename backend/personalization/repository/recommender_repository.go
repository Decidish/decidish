package repository

import (
	"database/sql"
	migrations "personalization/db/scripts"
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
		 )
		SELECT re.title, 
		       re.description, 
		       re.instructions, 
		       re.cook_time,
		       re.prep_time, 
		       re.total_time, 
		       re.image,
		       re.rating,
		       re.serving_size,
		       re.calories,
		       re.yields
		FROM recommender r, recipes re
		WHERE r.recipe_id = re.id`, userId)

	defer query.Close()

	if err != nil {
		return nil, err
	}

	var recipes []migrations.Recipe

	for query.Next() {
		var recipe migrations.Recipe

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
			&recipe.Yields); err != nil {
			return nil, err
		}

		recipes = append(recipes, recipe)
	}

	return recipes, nil
}
