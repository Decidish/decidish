import apiClient from "../client";

export interface CartItem {
    product_id: number;
    quantity: number;
    recipe_id: number;
}

export const shoppingListApi = {
    addItemsToShoppingList: async (cartItems: CartItem[]): Promise<void[]> => {
        try {
            const response =
                await apiClient.post<void[]>('/personalization/api/v1/user/add-to-list', cartItems);
            return response.data;
        } catch (error) {
            console.error("Failed to fetch recipe recommendations:", error);
            throw error;
        }
    }
};