package repository

import (
	"database/sql"
	migrations "personalization/db/scripts"
)

type RecommenderRepository struct {
	db *sql.DB
}

func (repo RecommenderRepository) GetRecommendedRecipesForUser(user_id string) ([]migrations.Recipe, error) {
	var user_vector string
	
	err := repo.db.QueryRow(`
	SELECT embedding
	FROM user_embeddings
	WHERE user_id = $1
	`, user_id).Scan(&user_vector)

	if err != nil {
		return nil, err
	}

	_, err = repo.db.Query(`
	SELECT r.embedding <=> $1::vector
	FROM recipe_embeddings r
	`, user_vector)

	// return rows, nil
	// TODO: Create recipe objects here to return and unmarshal even for client
	return nil, nil
}