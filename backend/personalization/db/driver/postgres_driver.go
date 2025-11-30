package driver

import (
	"database/sql"
	"log"
	migrations "personalization/db/scripts"

	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"
)

type DBDriver struct {
	MigrationDir  string
	Name          string
	ConnectionUrl string
}

// RunMigrations connects to the DB and executes pending migrations.
func (d DBDriver) RunMigrations(db *sql.DB) {
	if err := goose.SetDialect(d.Name); err != nil {
		log.Fatalf("Goose failed to set dialect: %v", err)
	}

	if err := goose.Up(db, d.MigrationDir); err != nil {
		log.Fatalf("Goose failed to run migrations: %v", err)
	}

	if err := migrations.ExecuteGoMigrations(db); err != nil {
		log.Fatalf("Failed to execute go migrations: %v", err)
	}

	log.Println("Database migrations completed successfully.")
}

func (d DBDriver) ConnectDB() *sql.DB {
	db, err := sql.Open(d.Name, d.ConnectionUrl)
	if err != nil {
		log.Fatalf("Error opening database: %v", err)
	}
	if err = db.Ping(); err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}
	return db
}
