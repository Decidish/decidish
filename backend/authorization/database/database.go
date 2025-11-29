package database

import (
	"database/sql"
	"log"
	
	"github.com/pressly/goose/v3"
	_ "github.com/lib/pq"
)

const (
	// Directory where your .sql migration files are stored
	migrationsDir = "migrations"
	// Database driver name
	dbDriver = "postgres" 
	// Connection string
	dbConnStr = "user=postgres dbname=mydatabase password=secret host=localhost sslmode=disable" 
)

// RunMigrations connects to the DB and executes pending migrations.
func RunMigrations(db *sql.DB) {
	// 1. Set the dialect/driver
	if err := goose.SetDialect(dbDriver); err != nil {
		log.Fatalf("Goose failed to set dialect: %v", err)
	}

	// 2. Run all pending migrations in the specified directory
	// goose.Up() checks the goose_db_version table and only executes new migrations.
	if err := goose.Up(db, migrationsDir); err != nil {
		log.Fatalf("Goose failed to run migrations: %v", err)
	}

	log.Println("Database migrations completed successfully.")
}

func ConnectDB() *sql.DB {
	// ... (Your existing database connection logic) ...
	db, err := sql.Open(dbDriver, dbConnStr)
	if err != nil {
		log.Fatalf("Error opening database: %v", err)
	}
	if err = db.Ping(); err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}
	return db
}