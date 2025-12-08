package config

import (
	"errors"
	"os"
)

type ApplicationConfig struct {
	JWTSecret              string
	DBConnectionUrl        string
	KafkaConnectionUrl     string
	MinioEndpoint          string
	MinioAccessKey         string
	MinioSecretKey         string
	MinioUseSSL            bool
	MinioRecipesBucket     string
	MinioRecipesObjectName string
	EmbedderServerUrl      string
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

	config.MinioEndpoint = os.Getenv("MINIO_ENDPOINT")

	if config.MinioEndpoint == "" {
		panic(errors.New("MINIO_ENDPOINT environment variable is required"))
	}

	config.MinioAccessKey = os.Getenv("MINIO_ACCESS_KEY")

	if config.MinioAccessKey == "" {
		panic(errors.New("MINIO_ACCESS_KEY environment variable is required"))
	}

	config.MinioSecretKey = os.Getenv("MINIO_SECRET_KEY")

	if config.MinioSecretKey == "" {
		panic(errors.New("MINIO_SECRET_KEY environment variable is required"))
	}

	config.MinioUseSSL = os.Getenv("MINIO_USE_SSL") == "true"

	config.MinioRecipesBucket = os.Getenv("MINIO_RECIPES_BUCKET")

	if config.MinioRecipesBucket == "" {
		panic(errors.New("MINIO_RECIPES_BUCKET environment variable is required"))
	}

	config.MinioRecipesObjectName = os.Getenv("MINIO_RECIPES_OBJECT")

	if config.MinioRecipesObjectName == "" {
		panic(errors.New("MINIO_RECIPES_OBJECT environment variable is required"))
	}

	config.EmbedderServerUrl = os.Getenv("EMBEDDER_SERVER_URL")

	if config.EmbedderServerUrl == "" {
		panic(errors.New("EMBEDDER_SERVER_URL environment variable is required"))
	}
}
