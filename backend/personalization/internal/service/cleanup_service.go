package service

import (
	"database/sql"
	"log"
	"personalization/internal/repository"
	"time"
)

const (
	// TTL for jobs in weeks - jobs older than this will be deleted
	TTL_WEEKS_JOBS = 1 // 1 week
	// TTL for user history in weeks - history older than this will be deleted
	TTL_WEEKS_USER_HISTORY = 8 // 2 months
)

type CleanupService struct {
	DB *sql.DB
}

func NewCleanupService(db *sql.DB) *CleanupService {
	return &CleanupService{DB: db}
}

// CleanupDeprecatedData deletes old jobs and user history based on configured TTLs
func (s *CleanupService) CleanupDeprecatedData() error {
	log.Println("Starting cleanup of deprecated data...")

	// Cleanup old jobs
	jobsCutoff := time.Now().AddDate(0, 0, -7*TTL_WEEKS_JOBS)
	deletedJobs, err := repository.DeleteDeprecatedJobs(s.DB, jobsCutoff)
	if err != nil {
		log.Printf("Error deleting deprecated jobs: %v", err)
		return err
	}
	log.Printf("Deleted %d deprecated jobs (created before %v)", deletedJobs, jobsCutoff)

	// Cleanup old user history
	historyCutoff := time.Now().AddDate(0, 0, -7*TTL_WEEKS_USER_HISTORY)
	deletedHistory, err := repository.DeleteDeprecatedUserHistory(s.DB, historyCutoff)
	if err != nil {
		log.Printf("Error deleting deprecated user history: %v", err)
		return err
	}
	log.Printf("Deleted %d deprecated user history entries (action_timestamp before %v)", deletedHistory, historyCutoff)

	log.Printf("Cleanup completed: %d jobs, %d history entries removed", deletedJobs, deletedHistory)
	return nil
}
