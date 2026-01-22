package repository

import (
	"time"
	"database/sql"
)

type ImportLog struct {
	ID           int       `json:"id"`
	Type         string    `json:"source"` // 'url' or 'file'
	Identifier   string    `json:"name"`   // The URL or Filename
	Status       string    `json:"status"`
	RecipeName   string    `json:"recipe_name"`
	CreatedAt    time.Time `json:"timestamp"`
	ErrorMessage string    `json:"error,omitempty"`
}

type ImportRepository struct {
	DB *sql.DB
}

func NewImportRepository(db *sql.DB) *ImportRepository {
	return &ImportRepository{DB: db}
}

// CreateLog records a URL or File import attempt
func (r *ImportRepository) CreateLog(log ImportLog) error {
	_, err := r.DB.Exec(`
		INSERT INTO import_logs (type, identifier, status, recipe_name, error_message, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())`,
		log.Type, log.Identifier, log.Status, log.RecipeName, log.ErrorMessage,
	)
	return err
}

// GetHistory fetches the last 50 imports
func (r *ImportRepository) GetHistory() ([]ImportLog, error) {
	rows, err := r.DB.Query(`SELECT id, type, identifier, status, recipe_name, created_at, error_message FROM import_logs ORDER BY created_at DESC LIMIT 50`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []ImportLog
	for rows.Next() {
		var l ImportLog
		if err := rows.Scan(&l.ID, &l.Type, &l.Identifier, &l.Status, &l.RecipeName, &l.CreatedAt, &l.ErrorMessage); err != nil {
			continue
		}
		logs = append(logs, l)
	}
	return logs, nil
}