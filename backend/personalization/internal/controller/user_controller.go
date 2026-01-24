package controller

import (
	"personalization/internal/service"

	"github.com/gin-gonic/gin"
)

type UserController struct {
	UserService service.IUserService
}

func NewUserController(service service.IUserService) *UserController {
	return &UserController{
		UserService: service,
	}
}

func (controller UserController) AddMappings(r *gin.RouterGroup) {
	r.POST("/user/preferences", controller.UserService.CreateUserPreferences)
	r.GET("/user/preferences", controller.UserService.GetUserPreferences)
	r.POST("/user/market", controller.UserService.SetSelectedUserMarketId)
	r.POST("/user/record/:action/:recipeID", controller.UserService.RecordUserAction)
	r.GET("/user/isembedded", controller.UserService.IsUserEmbeddingReady)
	r.GET("/user/history", controller.UserService.GetUserHistory)
}
