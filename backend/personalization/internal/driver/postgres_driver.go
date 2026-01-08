package driver

import (
	"database/sql"
	"log"

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
	return db
}
