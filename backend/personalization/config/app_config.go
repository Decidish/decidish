package config

import (
	"errors"
	"os"
)

type ApplicationConfig struct {
	JWTSecret          string
	DBConnectionUrl    string
	KafkaConnectionUrl string
}

func (config *ApplicationConfig) LoadConfiguration() {
	config.JWTSecret = os.Getenv("JWT_SECRET")

	if config.JWTSecret == "" {
		// throw an error or set a default value
		panic(errors.New("JWT_SECRET environment variable is required"))
	}

	config.DBConnectionUrl = os.Getenv("DATABASE_URL")

	if config.DBConnectionUrl == "" {
		// throw an error or set a default value
		panic(errors.New("DATABASE_URL environment variable is required"))
	}

	config.KafkaConnectionUrl = os.Getenv("KAFKA_CONNECTION_URL")

	if config.KafkaConnectionUrl == "" {
		panic(errors.New("KAFKA_CONNECTION_URL environment variable is required"))
	}
}
