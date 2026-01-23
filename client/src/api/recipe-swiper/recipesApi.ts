import apiClient from "../client";

export interface RecipeRecommendation {
  id: number;
  title: string;
  description: string;
  image: string;
  total_time: number;
  prep_time: number;
  cook_time: number;
  yields: string; // Go sends this as string
  ratings: number;
  nutrients: {
    calories: string; // Go sends as string
    servingSize: string;
  };
  ingredients: string[]; // Go currently sends raw strings
  instructions: string; // Go currently sends raw strings
  category: string;
  keywords: string[];
}

export const recipesApi = {
  // Calls POST /user/preferences
  getRecommendations: async (): Promise<RecipeRecommendation[]> => {
    try {
      const response = await apiClient.get<RecipeRecommendation[]>('/personalization/api/v1/recipes/recommend');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch recipe recommendations:", error);
      throw error;
    }
  }
};