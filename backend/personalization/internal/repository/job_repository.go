package repository

import "database/sql"

func CreateJob(tx *sql.Tx, name string, status string) (int, error) {
	var id int
	err := tx.QueryRow(`
    INSERT INTO jobs (name, status) 
    VALUES ($1, $2) 
    RETURNING id`,
		name, status).Scan(&id)

	if err != nil {
		return -1, err
	}
	return id, nil
}
