package migrations

import (
	"database/sql"
	"errors"
)

func ExecuteGoMigrations(db *sql.DB) error {
	goVersions := []string{"20251130150754"}

	var existingId string
	err := db.QueryRow(
		`SELECT version_id FROM goose_db_version WHERE version_id = $1`,
		goVersions[0]).Scan(&existingId)
	if err == nil {
		// Version already applied, skip
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		// Unexpected error
		return err
	}

	// TODO: In the future we should consider multiple go versions
	err = UpSeedRecipesTable(db)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
	INSERT INTO decidish.public.goose_db_version (version_id, is_applied)
	VALUES ($1, $2)	
	`, goVersions[0], true)

	if err != nil {
		return err
	}

	return nil
}

	var existingId string
	err = db.QueryRow(
		`SELECT version_id FROM goose_db_version WHERE version_id = $1`,
		goVersions[0]).Scan(&existingId)
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	_, err = db.Exec(`
	INSERT INTO decidish.public.goose_db_version (version_id, is_applied)
	VALUES ($1, $2)	
	`, "20251130150754", true)

	if err != nil {
		return err
	}

	return nil
}
