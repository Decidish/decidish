import apiClient from "../client";
import { UIRecipe } from "@/types/recipe";
import { RecipeRecommendation } from "../recipe-swiper/recipesApi";

export interface SavedRecipeRecord {
  id: number;
  user_id: string;
  recipe: UIRecipe;
  saved_at: string;
}

type SavedRecipeRecordResponse = Omit<SavedRecipeRecord, 'recipe'> & {
  recipe: RecipeRecommendation;
};

export const savedRecipesApi = {
  // Save a recipe
  saveRecipe: async (recipeId: number): Promise<void> => {
    try {
      await apiClient.post('/personalization/api/v1/user/saved-recipes', { recipe_id: recipeId });
    } catch (error) {
      console.error(`Failed to save recipe ${recipeId}:`, error);
      throw error;
    }
  },

  // Unsave a recipe
  unsaveRecipe: async (recipeId: number): Promise<void> => {
    try {
      await apiClient.delete(`/personalization/api/v1/user/saved-recipes/${recipeId}`);
    } catch (error) {
      console.error(`Failed to unsave recipe ${recipeId}:`, error);
      throw error;
    }
  },

  // Get all saved recipes with full details
  getSavedRecipes: async (): Promise<SavedRecipeRecord[]> => {
    try {
      const response = await apiClient.get<SavedRecipeRecordResponse[]>('/personalization/api/v1/user/saved-recipes');
      if (!response.data) {
        return [];
      }
      return response.data.map((record) => {
        const rawAllergies = (record.recipe as any)?.allergies;
        const normalizedAllergies = Array.isArray(rawAllergies)
          ? rawAllergies
          : typeof rawAllergies === 'string'
            ? rawAllergies.split(/[,;]+/).map((a: string) => a.trim()).filter(Boolean)
            : [];

        return {
          ...record,
          recipe: { 
            ...record.recipe, 
            allergies: normalizedAllergies, 
            richIngredients: null 
          } as UIRecipe,
        };
      });
    } catch (error) {
      console.error("Failed to fetch saved recipes:", error);
      throw error;
    }
  },

  // Get just the saved recipe IDs
  getSavedRecipeIds: async (): Promise<number[]> => {
    try {
      const response = await apiClient.get<number[]>('/personalization/api/v1/user/saved-recipes/ids');
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch saved recipe IDs:", error);
      throw error;
    }
  },

  // Check if a specific recipe is saved
  isRecipeSaved: async (recipeId: number): Promise<boolean> => {
    try {
      const response = await apiClient.get<{ saved: boolean }>(`/personalization/api/v1/user/saved-recipes/${recipeId}/check`);
      return response.data?.saved || false;
    } catch (error) {
      console.error(`Failed to check if recipe ${recipeId} is saved:`, error);
      throw error;
    }
  },
};
