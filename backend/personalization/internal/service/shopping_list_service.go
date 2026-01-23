package service

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"personalization/internal/config"
	"personalization/internal/repository"
	"strconv"
	"time"

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

type ShoppingItem struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Image      string  `json:"image"`
	Price      float64 `json:"price"`
	Checked    bool    `json:"checked"`
	Quantity   int     `json:"quantity"`
	RecipeID   *string `json:"recipeId,omitempty"`
	RecipeName *string `json:"recipeName,omitempty"`
}

type RecipeGroup struct {
	RecipeName string         `json:"recipeName"`
	IsExpanded bool           `json:"isExpanded"`
	Items      []ShoppingItem `json:"items"`
}

type ShoppingListResponse struct {
	ID         string        `json:"id"`
	Date       time.Time     `json:"date"`
	TotalItems int           `json:"totalItems"`
	TotalPrice float64       `json:"totalPrice"`
	Groups     []RecipeGroup `json:"groups"`
}

func (this ShoppingListService) GetActiveShoppingList(ctx *gin.Context) {
	userId := ctx.GetString("user_id")

	query := `
        SELECT 
            sl.id, sl.created_at,
            sli.id, sli.quantity, sli.checked,
            p.name, p.image_url, p.price,
            COALESCE(r.title, 'Misc Items') as recipe_name -- Handle nulls directly in SQL
        FROM shopping_lists sl
        JOIN shopping_list_items sli ON sl.id = sli.shopping_list_id
        JOIN products p ON sli.product_id = p.id
        LEFT JOIN recipes r ON sli.recipe_id = r.id
        WHERE sl.user_id = $1 AND sl.completed = FALSE
        ORDER BY recipe_name -- Order helps us group faster if we wanted, but map is safer
    `

	rows, err := this.DB.Query(query, userId)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	response := &ShoppingListResponse{
		Groups: []RecipeGroup{},
	}

	groupedMap := make(map[string][]ShoppingItem)

	var recipeOrder []string

	for rows.Next() {
		var (
			listID, itemID, qty int
			createdAt           time.Time
			checked             bool
			pName, pImg, rName  string
			pPrice              float64
		)

		if err := rows.Scan(&listID, &createdAt, &itemID, &qty, &checked, &pName, &pImg, &pPrice, &rName); err != nil {
			ctx.JSON(http.StatusInternalServerError, err.Error())
			return
		}

		response.ID = strconv.Itoa(listID)
		response.Date = createdAt
		response.TotalItems += qty
		response.TotalPrice += pPrice * float64(qty)

		item := ShoppingItem{
			ID:       strconv.Itoa(itemID),
			Name:     pName,
			Image:    pImg,
			Price:    pPrice,
			Checked:  checked,
			Quantity: qty,
		}

		if _, exists := groupedMap[rName]; !exists {
			recipeOrder = append(recipeOrder, rName)
		}
		groupedMap[rName] = append(groupedMap[rName], item)
	}

	for _, recipeName := range recipeOrder {
		group := RecipeGroup{
			RecipeName: recipeName,
			IsExpanded: true,
			Items:      groupedMap[recipeName],
		}
		response.Groups = append(response.Groups, group)
	}

	if response.ID == "" {
		ctx.JSON(http.StatusInternalServerError, gin.H{"message": "no active shopping list found"})
		return
	}

	ctx.JSON(http.StatusOK, response)
}

type UpdateShoppingListItemRequest struct {
	ItemID  string `json:"item_id"`
	Checked *bool  `json:"checked,omitempty"`
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

	err = repository.UpdateShoppingListItem(tx, userId, request.ItemID, request.Checked)
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
