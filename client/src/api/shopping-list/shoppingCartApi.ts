import apiClient from "../client";

export interface CartItem {
  product_id: number;
  quantity: number;
  recipe_id: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  image: string;
  price: number;
  checked: boolean;
  quantity: number;
  recipeId?: string;
  recipeName?: string;
}

export interface RecipeGroup {
  recipeName: string; // "Carbonara", "Misc Items", etc.
  isExpanded: boolean;
  items: ShoppingItem[];
}

export interface ShoppingList {
  id: string;
  date: string;
  totalItems: number;
  totalPrice: number;
  completed: boolean;
  groups: RecipeGroup[];
}

export const shoppingListApi = {
  addItemsToShoppingList: async (cartItems: CartItem[]): Promise<void[]> => {
    try {
      const response = await apiClient.post<void[]>(
        "/personalization/api/v1/user/add-to-list",
        cartItems,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch recipe recommendations:", error);
      throw error;
    }
  },
  getActiveShoppingList: async (): Promise<ShoppingList> => {
    try {
      const response = await apiClient.get<ShoppingList>(
        "/personalization/api/v1/user/active/list",
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch active shopping list:", error);
      throw error;
    }
  },

  getShoppingHistory: async (): Promise<ShoppingList[]> => {
    try {
      const response = await apiClient.get<ShoppingList[]>(
        "/personalization/api/v1/user/shopping/history",
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch shopping history:", error);
      throw error;
    }
  },

  updateItemStatus: async (itemId: string, isChecked: boolean) => {
    try {
      await apiClient.put<void>(
        "/personalization/api/v1/user/update/item",
        {
          item_id: itemId,
          checked: isChecked,
        }
      );
    } catch (error) {
      console.error("Failed to update item status:", error);
      throw error;
    }
  },

  updateItemQuantity: async (itemId: string, quantity: number) => {
    try {
      await apiClient.put<void>(
        "/personalization/api/v1/user/update/item",
        {
          item_id: itemId,
          quantity: quantity,
        }
      );
    } catch (error) {
      console.error("Failed to update item quantity:", error);
      throw error;
    }
  },

  deleteItem: async (itemId: string) => {
    try {
      await apiClient.delete<void>(
        `/personalization/api/v1/user/delete/item/${itemId}`
      );
    } catch (error) {
      console.error("Failed to delete item:", error);
      throw error;
    }
  },

  completeShoppingList: async (listId: string) => {
    try {
      await apiClient.put<void>(
        `/personalization/api/v1/user/complete/list/${listId}`
      );
    } catch (error) {
      console.error("Failed to complete shopping list:", error);
      throw error;
    }
  },
};
