package controller

import (
	"github.com/gin-gonic/gin"
)

type UserActionController struct {
	// TODO: Create a service layer here as well, migrate the postuser action there
}

// AddMappings Creates the mappings for the controller
func (controller UserActionController) AddMappings(r *gin.RouterGroup) {
	r.POST("/user/action", controller.postUserAction)
}

// Sends a kafka message to the topic user-interactions with the defined UserInteraction
func (controller UserActionController) postUserAction(c *gin.Context) {
	// TODO: Migrate to RabbitMQ send an event instead
}
