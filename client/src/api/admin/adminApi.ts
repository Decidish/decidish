import apiClient from '../client';

export const adminApi = {
  /**
   * Adds a recipe by its URL.
   * @param recipeUrl - The URL of the recipe to be added.
   */
  addRecipe: async (recipeUrl: string): Promise<void> => {
    try {
      await apiClient.post('/personalization/recipes/add/', {
        recipeUrl: recipeUrl
      });
    } catch (error) {
      console.error("Error adding recipe:", error);
      throw error;
    }
  },

  /**
   * Adds recipes from Rewe market.
   * 
   */
  addReweRecipes: async (): Promise<void> => {
    try {
      await apiClient.post('/personalization/recipes/add/rewe/');
    } catch (error) {
      console.error("Error adding Rewe recipes:", error);
      throw error;
    }
  }
};