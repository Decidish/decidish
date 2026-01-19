import apiClient from '../client';

// type LoginRequestBody struct {
// 	Username string `json:"username" binding:"required"`
// 	Password string `json:"password" binding:"required"`
// }


export const authApi = {
  /**
   * Adds a recipe by its URL.
   * @param recipeUrl - The URL of the recipe to be added.
   */
  login: async (username: string, password: string): Promise<void> => {
    try {
      await apiClient.post('/login', {
        username: username,
        password: password
      });
    } catch (error) {
      console.error("Error adding recipe:", error);
      throw error;
    }
  },

  /**
   * Adds a recipe by its URL.
   * @param recipeUrl - The URL of the recipe to be added.
   */
  register: async (username: string, password: string): Promise<void> => {
    try {
      await apiClient.post('/register', {
        username: username,
        password: password
      });
    } catch (error) {
      console.error("Error adding recipe:", error);
      throw error;
    }
  },
};