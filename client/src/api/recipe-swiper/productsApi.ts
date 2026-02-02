import apiClient from "../client";

export interface ProductAttributes {
  isOrganic: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isLowestPrice: boolean;
}

export interface Product {
  id: number;          // DB ID
  reweId: number;      // REWE ID
  name: string;
  price: number;       // In cents (int)
  imageUrl: string;
  grammage: string;    // e.g. "500g"
  normalizedAmount: number;
  attributes: ProductAttributes;
}

export interface ShoppingOption {
  product: Product;
  quantityToBuy: number;
  totalProductAmount: number;
  confidence: number;
}

export interface IngredientGroup {
  ingredientId: number;
  ingredientName: string;
  originalIngredientName: string;  // Original ingredient text from recipe
  totalAmountNeeded: number;
  options: ShoppingOption[]; // The list of products for this ingredient
}

export interface ShoppingListResponse {
  items: IngredientGroup[];
}

export const productsApi = {
  // POST /shopping-list/generate?marketId={id}
  generateShoppingList: async (marketId: number, recipeIds: number[]): Promise<ShoppingListResponse> => {
    try {
      const response = await apiClient.post<ShoppingListResponse>(
        `/shopping/shopping-list/generate`, 
        recipeIds,
        {
          params: { marketId } // Axios handles ?marketId=X
        }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to generate shopping list:", error);
      throw error;
    }
  }
};