package controller

import (
	"personalization/internal/service"

	"github.com/gin-gonic/gin"
)

type UserController struct {
	UserService service.UserService
}

func NewUserController(service service.UserService) *UserController {
	return &UserController{
		UserService: service,
	}
}

func (controller UserController) AddMappings(r *gin.RouterGroup) {
	r.POST("/user/preferences", controller.UserService.CreateUserPreferences)
	r.POST("/user/market", controller.UserService.SetSelectedUserMarketId)
	r.GET("/user/isembedded", controller.UserService.IsUserEmbeddingReady)
	r.POST("/user/cart", controller.UserService.AddRecipeProductsToCart)
	//r.GET("/user/cart/items", controller.UserService.GetUserCartItems)
}
