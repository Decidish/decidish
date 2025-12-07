package migrations

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"os"
	"personalization/config"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

const (
	LocalFilename = "db/scripts/recipes.jsonl" // The name of the file to save locally
)

func DownloadRecipesIfNotPresent(config config.ApplicationConfig) error {
	if _, err := os.Stat(LocalFilename); err == nil {
		log.Printf("File %s already exists locally. Skipping download.", LocalFilename)
		return nil
	} else if !errors.Is(err, os.ErrNotExist) {
		// An error other than 'file not found' occurred (e.g., permissions issue).
		return errors.New("error checking local file existence: " + err.Error())
	}

	log.Printf("File %s not found locally. Starting download from MinIO...", LocalFilename)

	minioClient, err := minio.New(config.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(config.MinioAccessKey, config.MinioSecretKey, ""),
		Secure: config.MinioUseSSL,
	})
	if err != nil {
		return errors.New("failed to initialize MinIO client: " + err.Error())
	}

	// FGetObject securely downloads the object and saves it directly to the specified local file path.
	err = minioClient.FGetObject(
		context.Background(),
		config.MinioRecipesBucket,
		config.MinioRecipesObjectName,
		LocalFilename,
		minio.GetObjectOptions{},
	)
	if err != nil {
		// Log the error response code if possible to aid in troubleshooting permission issues.
		log.Printf("MinIO download failed. Check permissions (s3:GetObject) for user %s on object %s.", config.MinioAccessKey, config.MinioRecipesObjectName)
		return errors.New("failed to download recipes file from MinIO: " + err.Error())
	}

	log.Printf("Successfully downloaded %s to current directory.", LocalFilename)
	return nil
}

func ExecuteGoMigrations(config config.ApplicationConfig, db *sql.DB) error {
	goVersions := []string{"20251207182955"}

	start := time.Now()

	var existingId string
	err := db.QueryRow(
		`SELECT version_id FROM goose_db_version WHERE version_id = $1`,
		goVersions[0]).Scan(&existingId)

	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	if existingId != "" {
		log.Printf("Found existing goose_db_version %s.", existingId)
		return nil
	}

	err = DownloadRecipesIfNotPresent(config)

	err = UpSeedRecipesTable(db)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
	INSERT INTO decidish.public.goose_db_version (version_id, is_applied)
	VALUES ($1, $2)	
	`, "20251207182955", true)

	if err != nil {
		return err
	}

	end := time.Now()

	log.Printf("Migration took %s", end.Sub(start))

	return nil
}
