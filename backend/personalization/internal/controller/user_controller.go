package controller

import (
	"personalization/internal/service"

	"github.com/gin-gonic/gin"
)

type UserController struct {
	service.UserService
	service.ShoppingListService
}

func NewUserController(service service.UserService, shoppingService service.ShoppingListService) *UserController {
	return &UserController{
		UserService:         service,
		ShoppingListService: shoppingService,
	}
}

func (controller UserController) AddMappings(r *gin.RouterGroup) {
	r.POST("/user/preferences", controller.UserService.CreateUserPreferences)
	r.GET("/user/preferences", controller.UserService.GetUserPreferences)
	r.POST("/user/market", controller.UserService.SetSelectedUserMarketId)
	r.GET("/user/market", controller.UserService.GetUserSelectedMarket)
	r.GET("/user/isembedded", controller.UserService.IsUserEmbeddingReady)
	r.POST("/user/add-to-list", controller.ShoppingListService.AddProductsToShoppingList)
	r.GET("/user/active/list", controller.ShoppingListService.GetActiveShoppingList)
	r.PUT("/user/update/item", controller.ShoppingListService.UpdateShoppingListItem)
	r.DELETE("/user/delete/item/:item_id", controller.ShoppingListService.DeleteShoppingListItem)
	r.PUT("/user/complete/list/:list_id", controller.ShoppingListService.MarkShoppingListCompleted)
	r.GET("/user/shopping/history", controller.ShoppingListService.GetShoppingHistory)
	r.POST("/user/record/:action/:recipeID", controller.UserService.RecordUserAction)
	r.GET("/user/isembedded", controller.UserService.IsUserEmbeddingReady)
	r.GET("/user/history", controller.UserService.GetUserHistory)
}
