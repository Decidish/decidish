package controller

import (
	"errors"
	"log"
	"net/http"
	"personalization/events"

	"github.com/gin-gonic/gin"
)

type UserActionController struct {
	events.UserInteractionProducer
}

// Creates the mappings for the controller
func (controller UserActionController) AddMappings(r *gin.RouterGroup) {
	r.POST("/user/action", controller.postUserAction)
}

// Sends a kafka message to the topic user-interactions with the defined UserInteraction
func (controller UserActionController) postUserAction(c *gin.Context) {
	var userAction events.UserInteraction

	err := c.ShouldBindJSON(&userAction)

	if err != nil {
		log.Println(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err})
		return
	}

	userAction.UserID = c.GetString("user_id")

	if userAction.UserID == "" {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": errors.New("user ID required")})
	}

	err = controller.UserInteractionProducer.PublishUserInteractionEvent(userAction)
	if err != nil {
		log.Println(err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User action published successfully"})
}
