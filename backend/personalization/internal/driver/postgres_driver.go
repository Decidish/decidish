package driver

import (
	"database/sql"
	"log"
	"time"

	_ "github.com/lib/pq"
)

type DBDriver struct {
	Name          string
	ConnectionUrl string
}

func (d DBDriver) ConnectDB() *sql.DB {
	db, err := sql.Open(d.Name, d.ConnectionUrl)
	if err != nil {
		log.Fatalf("Error opening database: %v", err)
	}
	if err = db.Ping(); err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}

	// Configure connection pool for high concurrency
	// These settings are critical for handling 100+ concurrent users
	db.SetMaxOpenConns(100)                // Max open connections to DB
	db.SetMaxIdleConns(25)                 // Keep 25 idle connections ready
	db.SetConnMaxLifetime(5 * time.Minute) // Recycle connections every 5 minutes
	db.SetConnMaxIdleTime(1 * time.Minute) // Close idle connections after 1 minute

	log.Printf("Database connection pool configured: MaxOpen=100, MaxIdle=25")
	return db
}
