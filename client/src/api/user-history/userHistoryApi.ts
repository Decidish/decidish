import apiClient from "../client";
import { RecipeRecommendation } from "../recipe-swiper/recipesApi";
import { UIRecipe } from "@/types/recipe";

export interface UserHistoryRecord {
  id: number;
  user_id: string;
  action: boolean; // true for like, false for dislike
  recipe_id: number; // kept for convenience
  recipe: UIRecipe;
  action_timestamp: string;
}

type UserHistoryRecordResponse = Omit<UserHistoryRecord, 'recipe'> & {
  recipe: RecipeRecommendation;
};

export const userHistoryApi = {
  // Record a user action (like or dislike)
  recordAction: async (action: 'like' | 'dislike', recipeId: number): Promise<string> => {
    try {
      const response = await apiClient.post<string>(`/personalization/api/v1/user/record/${action}/${recipeId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to record ${action} action for recipe ${recipeId}:`, error);
      throw error;
    }
  },

  // Get user's full history
  getUserHistory: async (): Promise<UserHistoryRecord[]> => {
    try {
      const response = await apiClient.get<UserHistoryRecordResponse[]>('/personalization/api/v1/user/history');
      return response.data.map((record) => ({
        ...record,
        recipe: { ...record.recipe, richIngredients: null },
      }));
    } catch (error) {
      console.error("Failed to fetch user history:", error);
      throw error;
    }
  },

  // Get liked recipes
  getLikedRecipes: async (): Promise<number[]> => {
    try {
      const response = await apiClient.get<number[]>('/personalization/api/v1/user/liked-recipes');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch liked recipes:", error);
      throw error;
    }
  },

  // Get disliked recipes
  getDislikedRecipes: async (): Promise<number[]> => {
    try {
      const response = await apiClient.get<number[]>('/personalization/api/v1/user/disliked-recipes');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch disliked recipes:", error);
      throw error;
    }
  },
};
