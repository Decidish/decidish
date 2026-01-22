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

func GetReweJobs(db *sql.DB) ([]Job, error) {
	rows, err := db.Query(`
		SELECT id, name, status, processed_items, total_items, error_message, created_at, updated_at 
		FROM jobs 
		WHERE name = 'add_rewe_recipes' 
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []Job
	for rows.Next() {
		var j Job
		// Handle NULL error_message 
		var errMsg sql.NullString 
		
		if err := rows.Scan(&j.ID, &j.Name, &j.Status, &j.ProcessedItems, &j.TotalItems, &errMsg, &j.CreatedAt, &j.UpdatedAt); err != nil {
			return nil, err
		}
		if errMsg.Valid {
            j.ErrorMessage = errMsg.String
        }
		jobs = append(jobs, j)
	}
	return jobs, nil
}

func CreateLog(db *sql.DB, logType, identifier, status string, jobId int) error {
    _, err := db.Exec(`
        INSERT INTO import_logs (type, identifier, status, job_id, created_at)
        VALUES ($1, $2, $3, $4, NOW())`,
        logType, identifier, status, jobId,
    )
    return err
}

func GetUrlImportHistory(db *sql.DB) ([]ImportLog, error) {
    rows, err := db.Query(`
        SELECT id, type, identifier, status, created_at 
        FROM import_logs 
        WHERE type = 'url'
        ORDER BY created_at DESC LIMIT 50`)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var logs []ImportLog
    for rows.Next() {
        var l ImportLog
        if err := rows.Scan(&l.ID, &l.Type, &l.Identifier, &l.Status, &l.CreatedAt); err != nil {
            return nil, err
        }
        logs = append(logs, l)
    }
    return logs, nil
}