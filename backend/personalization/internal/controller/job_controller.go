package controller

import (
	"database/sql"
	"net/http"
	"personalization/internal/repository"
	"strconv"

	"github.com/gin-gonic/gin"
)

type JobController struct {
	DB *sql.DB
}

func NewJobController(db *sql.DB) *JobController {
	return &JobController{DB: db}
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