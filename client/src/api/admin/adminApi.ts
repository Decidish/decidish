import apiClient from '../client';

export interface JobStatusResponse {
  id: number;
  status: 'pending' | 'processing' | 'success' | 'error'; // Matches Python values
  processed_items: number;
  total_items: number;
  error_message?: string;
  created_at: string;
}

export const adminApi = {
  /**
   * Adds a recipe by its URL.
   * @param recipeUrl - The URL of the recipe to be added.
   */
  addRecipe: async (recipeUrl: string): Promise<void> => {
    try {
      await apiClient.post('/personalization/recipes/add/', {
        recipe_url: recipeUrl
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
  // Start the Job (Returns { job_id: 123, status: "pending" })
  addReweRecipes: async () => {
    const response = await apiClient.post('/personalization/recipes/add/rewe/');
    return response.data; 
  },
  // Poll the Job (Returns current progress)
  getJobStatus: async (jobId: string): Promise<JobStatusResponse> => {
    const response = await apiClient.get(`/personalization/jobs/${jobId}`);
    return response.data;
  },
  getReweJobHistory: async () => {
    const response = await apiClient.get('/personalization/recipes/history/rewe');
    return response.data;
  },
  getImportHistory: async () => {
    const response = await apiClient.get('/personalization/recipes/history/url');
    return response.data;
  }
};