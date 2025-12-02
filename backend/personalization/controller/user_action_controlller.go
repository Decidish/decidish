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

func (controller UserActionController) AddMappings(r *gin.RouterGroup) {
	controller.postUserAction(r)
}

// TODO: Make sure to save it in the database as well if there is an error, so we can send it later on
func (controller UserActionController) postUserAction(r *gin.RouterGroup) {
	r.POST("/user/action", func(c *gin.Context) {
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
	})
}
