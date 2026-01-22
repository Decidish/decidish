package repository

import (
	"database/sql"
	"time"
)

type Job struct {
	ID             int       `json:"id"`
	Name           string    `json:"name"`
	Status         string    `json:"status"`
	ProcessedItems int       `json:"processed_items"`
	TotalItems     int       `json:"total_items"`
	ErrorMessage   string    `json:"error_message"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func CreateJob(tx *sql.Tx, name string, status string) (int, error) {
	var id int
	err := tx.QueryRow(`
		INSERT INTO jobs (name, status, processed_items, total_items) 
		VALUES ($1, $2, 0, 0) 
		RETURNING id`,
		name, status).Scan(&id)
	if err != nil {
		return -1, err
	}
	return id, nil
}

func GetJobByID(db *sql.DB, id int) (*Job, error) {
	job := &Job{}
	var errMsg sql.NullString // Handle potential NULLs safely

	err := db.QueryRow(`
		SELECT id, name, status, processed_items, total_items, error_message, created_at, updated_at 
		FROM jobs WHERE id = $1`, 
		id).Scan(&job.ID, &job.Name, &job.Status, &job.ProcessedItems, &job.TotalItems, &errMsg, &job.CreatedAt, &job.UpdatedAt)
	
	if err != nil {
		return nil, err
	}
	job.ErrorMessage = errMsg.String
	return job, nil
}

func (r *JobRepository) GetReweJobs() ([]model.Job, error) {
	rows, err := r.DB.Query(`
		SELECT id, name, status, processed_items, total_items, error_message, created_at, updated_at 
		FROM jobs 
		WHERE name = 'add_rewe_recipes' 
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []model.Job
	for rows.Next() {
		var j model.Job
		// Handle NULL error_message 
		var errMsg sql.NullString 
		
		if err := rows.Scan(&j.ID, &j.Name, &j.Status, &j.ProcessedItems, &j.TotalItems, &errMsg, &j.CreatedAt, &j.UpdatedAt); err != nil {
			return nil, err
		}
		if errMsg.Valid {
			j.ErrorMessage = &errMsg.String
		}
		jobs = append(jobs, j)
	}
	return jobs, nil
}