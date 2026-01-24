package service

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"personalization/internal/config"
	"personalization/internal/repository"

	"github.com/gin-gonic/gin"
)

type ShoppingListService struct {
	config.ApplicationConfig
	*sql.DB
}

func NewShoppingListService(config config.ApplicationConfig, db *sql.DB) *ShoppingListService {
	return &ShoppingListService{
		ApplicationConfig: config,
		DB:                db,
	}
}

type CartItem struct {
	ProductId int `json:"product_id"`
	Quantity  int `json:"quantity"`
	RecipeId  int `json:"recipe_id"`
}

func (service ShoppingListService) AddProductsToShoppingList(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	var cartItems []CartItem
	err := ctx.ShouldBindJSON(&cartItems)

	if err != nil {
		ctx.JSON(http.StatusBadRequest, err.Error())
		return
	}

	tx, err := service.DB.Begin()

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, "could not start a transaction")
		log.Panicln("could not start a transaction", err.Error())
	}

	defer tx.Rollback()

	for _, item := range cartItems {
		err := repository.AddItemToShoppingList(tx, userId, item.ProductId, item.Quantity, item.RecipeId)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, err.Error())
			return
		}
	}

	if err = tx.Commit(); err != nil {
		ctx.JSON(http.StatusInternalServerError, "could not commit transaction")
		log.Panicln("could not commit transaction", err.Error())
	}

	ctx.JSON(http.StatusOK, fmt.Sprintf("Added %d items to cart for user: %s", len(cartItems), userId))
}

func (this ShoppingListService) GetActiveShoppingList(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	response, err := repository.GetShoppingLists(this.DB, userId, false)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	if len(response) == 0 {
		ctx.JSON(http.StatusOK, gin.H{"message": "No active shopping list found"})
		return
	}

	ctx.JSON(http.StatusOK, response[0])
}

type UpdateShoppingListItemRequest struct {
	ItemID   string `json:"item_id"`
	Checked  *bool  `json:"checked,omitempty"`
	Quantity *int   `json:"quantity,omitempty"`
}

func (this ShoppingListService) UpdateShoppingListItem(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	tx, err := this.DB.Begin()

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	defer tx.Rollback()

	var request UpdateShoppingListItemRequest
	err = ctx.ShouldBindJSON(&request)

	if err != nil {
		ctx.JSON(http.StatusBadRequest, err.Error())
		return
	}

	err = repository.UpdateShoppingListItem(tx, userId, request.ItemID, request.Checked, request.Quantity)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	if err = tx.Commit(); err != nil {
		ctx.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	ctx.JSON(http.StatusOK, fmt.Sprintf("Updated item %s for user: %s", request.ItemID, userId))
}

func (this ShoppingListService) DeleteShoppingListItem(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	itemId := ctx.Param("item_id")

	tx, err := this.DB.Begin()

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	defer tx.Rollback()

	err = repository.DeleteShoppingListItem(tx, userId, itemId)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	if err = tx.Commit(); err != nil {
		ctx.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	ctx.JSON(http.StatusOK, fmt.Sprintf("Deleted item %s for user: %s", itemId, userId))
}

func (this ShoppingListService) MarkShoppingListCompleted(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	listId := ctx.Param("list_id")

	err := repository.MarkShoppingListCompleted(this.DB, userId, listId)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	ctx.JSON(http.StatusOK, fmt.Sprintf("Marked shopping list as completed for user: %s", userId))
}

func (this ShoppingListService) GetShoppingHistory(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	response, err := repository.GetShoppingLists(this.DB, userId, true)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	if len(response) == 0 {
		ctx.JSON(http.StatusOK, gin.H{"message": "No shopping history found"})
		return
	}

	ctx.JSON(http.StatusOK, response)
}
