package config

import "os"

type ApplicationConfig struct {
	JWTSecret       string
	DBConnectionUrl string
}

func (config *ApplicationConfig) LoadConfiguration() {
	config.JWTSecret = os.Getenv("JWT_SECRET")
	config.DBConnectionUrl = os.Getenv("DATABASE_URL")
}
