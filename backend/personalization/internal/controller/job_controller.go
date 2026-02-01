package controller

import (
	"database/sql"
	"log"
	"net/http"
	"personalization/internal/repository"
	"personalization/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type JobController struct {
	DB             *sql.DB
	CleanupService *service.CleanupService
}

func NewJobController(db *sql.DB) *JobController {
	return &JobController{
		DB:             db,
		CleanupService: service.NewCleanupService(db),
	}
}

func (c *JobController) GetJobStatus(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job ID"})
		return
	}

	job, err := repository.GetJobByID(c.DB, id)
	if err == sql.ErrNoRows {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	} else if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, job)
}

func (c *JobController) GetReweHistory(ctx *gin.Context) {
	jobs, err := repository.GetReweJobs(c.DB)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch rewe history"})
		return
	}
	// Return empty array instead of null if no jobs found
	if jobs == nil {
		ctx.JSON(http.StatusOK, []string{})
		return
	}
	ctx.JSON(http.StatusOK, jobs)
}

func (c *JobController) GetUrlHistory(ctx *gin.Context) {
	logs, err := repository.GetUrlImportHistory(c.DB)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch url history"})
		return
	}
	if logs == nil {
		ctx.JSON(http.StatusOK, []string{})
		return
	}
	ctx.JSON(http.StatusOK, logs)
}

func (c *JobController) CleanupDeprecatedData(ctx *gin.Context) {
	log.Println("Manual cleanup trigger requested")

	// Run cleanup asynchronously to avoid blocking the HTTP response
	go func() {
		if err := c.CleanupService.CleanupDeprecatedData(); err != nil {
			log.Printf("Error during cleanup execution: %v", err)
		}
	}()

	ctx.JSON(http.StatusOK, gin.H{
		"status":  "started",
		"message": "Cleanup job has been triggered successfully",
	})
}

func (controller JobController) AddMappings(r *gin.Engine) {
	r.GET("/jobs/:id", controller.GetJobStatus)
	r.GET("/recipes/history/rewe", controller.GetReweHistory)
	r.GET("/recipes/history/url", controller.GetUrlHistory)
	r.POST("/jobs/cleanup", controller.CleanupDeprecatedData)
}
