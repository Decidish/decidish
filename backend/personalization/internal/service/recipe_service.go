package service

import (
	"bufio"
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"personalization/internal/config"
	"personalization/internal/repository"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type RecipeService struct {
	config config.ApplicationConfig
	DB     *sql.DB
}

func NewRecipeService(config config.ApplicationConfig, db *sql.DB) RecipeService {
	return RecipeService{
		config: config,
		DB:     db,
	}
}

func (service RecipeService) CreateRecipe(ctx *gin.Context) {
	log.Fatal("Not implemented yet!")
}

func (service RecipeService) SeedRecipeTableWithREWERecipes(ctx *gin.Context) {
	goVersions := []string{"20251207182955"}

	mu := sync.Mutex{}

	start := time.Now()

	mu.Lock()

	var existingId string
	err := service.DB.QueryRow(
		`SELECT version_id FROM goose_db_version WHERE version_id = $1`,
		goVersions[0]).Scan(&existingId)

	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"version_id": goVersions[0],
			"error":      err.Error(),
		})
		mu.Unlock()
		return
	}

	if existingId != "" {
		log.Printf("Found existing goose_db_version %s.", existingId)
		ctx.JSON(http.StatusOK, gin.H{
			"version_id": goVersions[0],
			"status":     "Already applied",
		})
		mu.Unlock()
		return
	}

	err = DownloadRecipesIfNotPresent(service.config)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"version_id": goVersions[0],
			"error":      err.Error(),
		})
		mu.Unlock()
		return
	}

	err = UpSeedRecipesTable(service.config, service.DB)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"version_id": goVersions[0],
			"error":      err.Error(),
		})
		mu.Unlock()
		return
	}

	_, err = service.DB.Exec(`
	INSERT INTO decidish.public.goose_db_version (version_id, is_applied)
	VALUES ($1, $2)	
	`, "20251207182955", true)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"version_id": goVersions[0],
			"error":      err.Error(),
		})
		mu.Unlock()
		return
	}

	end := time.Now()

	log.Printf("Migration took %s", end.Sub(start))

	ctx.JSON(http.StatusOK, gin.H{
		"version_id": goVersions[0],
		"status":     "Successfully Applied",
	})
}

func UpSeedRecipesTable(config config.ApplicationConfig, db *sql.DB) error {
	tx, err := db.Begin()

	if err != nil || tx == nil {
		return errors.New("no transaction could be established")
	}

	defer tx.Rollback()

	f, err := os.Open(LocalFilename)

	if err != nil {
		return err
	}

	defer f.Close()

	scanner := bufio.NewScanner(f)
	recipeCount := 1

	var recipeIds []int
	var recipeStr []string

	start := time.Now()
	for scanner.Scan() {

		line := scanner.Bytes()

		var recipe repository.Recipe

		err = json.Unmarshal(line, &recipe)

		// Unable to unmarshal JSON line
		if err != nil {
			return err
		}

		// Insert recipe into the database
		recipeId, err := repository.SaveRecipe(&recipe, tx)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				continue
			}
			return err
		}

		//Insert categories into a separate table if needed
		err = repository.SaveCategories(recipeId, recipe, tx)
		if err != nil {
			return err
		}

		// Insert keywords
		err = repository.SaveKeywords(recipeId, recipe, tx)
		if err != nil {
			return err
		}

		// Insert ingredients
		err = repository.SaveIngredients(recipeId, recipe, tx)
		if err != nil {
			return err
		}

		recipeIds = append(recipeIds, recipeId)
		recipeStr = append(recipeStr, recipe.String())
		recipeCount++
	}
	end := time.Now()
	fmt.Println("Seed recipes took", end.Sub(start))

	//processInBatches(config, recipeIds, recipeStr, tx)

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

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

func processInBatches(config config.ApplicationConfig, recipeIds []int, recipeStrs []string, tx *sql.Tx) error {
	const batchSize = 100

	if len(recipeIds) != len(recipeStrs) {
		return errors.New("number of recipes and String slice lengths do not match")
	}
	totalItems := len(recipeIds)

	type EmbedRequest struct {
		RecipeStrs []string `json:"text"`
	}
	type EmbedResponse struct {
		Device     string      `json:"device"`
		Model      string      `json:"model"`
		Embeddings [][]float64 `json:"embeddings"`
	}

	// concurrency control and error propagation
	sem := make(chan struct{}, 10)
	var wg sync.WaitGroup
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	errCh := make(chan error, 1)

	start := time.Now()

	// iterate up to totalItems (not fixed 200)
	for i := 0; i < totalItems; i += batchSize {
		if ctx.Err() != nil {
			break
		}

		wg.Add(1)
		sem <- struct{}{}

		startIndex := i
		go func() {
			defer wg.Done()
			defer func() { <-sem }()

			if ctx.Err() != nil {
				return
			}

			endIndex := startIndex + batchSize
			if endIndex > totalItems {
				endIndex = totalItems
			}
			if startIndex >= endIndex {
				return
			}

			batchIDs := recipeIds[startIndex:endIndex]
			batchStrs := recipeStrs[startIndex:endIndex]

			jsonBody, err := json.Marshal(EmbedRequest{RecipeStrs: batchStrs})
			if err != nil {
				select {
				case errCh <- fmt.Errorf("marshal batch: %w", err):
				default:
				}
				cancel()
				return
			}

			resp, err := http.Post(config.EmbedderServerUrl+"/embed", "application/json", bytes.NewBuffer(jsonBody))
			if err != nil {
				select {
				case errCh <- fmt.Errorf("post embed: %w", err):
				default:
				}
				cancel()
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				bodyBytes, _ := io.ReadAll(resp.Body)
				select {
				case errCh <- fmt.Errorf("embedder returned %d: %s", resp.StatusCode, string(bodyBytes)):
				default:
				}
				cancel()
				return
			}

			bodyBytes, err := io.ReadAll(resp.Body)
			if err != nil {
				select {
				case errCh <- fmt.Errorf("read body: %w", err):
				default:
				}
				cancel()
				return
			}

			var result EmbedResponse
			if err := json.Unmarshal(bodyBytes, &result); err != nil {
				select {
				case errCh <- fmt.Errorf("unmarshal embed response: %w", err):
				default:
				}
				cancel()
				return
			}

			for idx, embedding := range result.Embeddings {
				embJson, err := json.Marshal(embedding)
				if err != nil {
					log.Println("Error encoding embedding to JSON:", err)
					select {
					case errCh <- fmt.Errorf("encode embedding: %w", err):
					default:
					}
					cancel()
					return
				}

				_, err = tx.Exec(`INSERT INTO recipe_embeddings (recipe_id, embedding) VALUES ($1, $2)`, batchIDs[idx], embJson)
				if err != nil {
					log.Println("Error inserting embedding:", err)
					select {
					case errCh <- fmt.Errorf("insert embedding: %w", err):
					default:
					}
					cancel()
					return
				}
			}
		}()
	}

	wg.Wait()
	end := time.Now()
	fmt.Printf("Embeddings took duration: %v\n", end.Sub(start))

	// return the first error if any
	select {
	case e := <-errCh:
		return e
	default:
		return nil
	}
}
