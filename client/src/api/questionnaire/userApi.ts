import apiClient from "../client";

export interface UserPreferences {
  allergies: string[];
  min_cooking_time: number; 
  max_cooking_time: number; 
  preference_vector: number[]; 
}

export interface UserPreferencesWithMarket {
  min_cooking_time: number;
  max_cooking_time: number;
  allergies: string;
  budget: number;
  skill_level: string;
  market_id?: number;
  market_name?: string;
  market_street?: string;
  market_city?: string;
  market_zip_code?: string;
  market_latitude?: number;
  market_longitude?: number;
}

export interface EmbeddingReady {
  ready: boolean
}

export const userApi = {
  // Calls POST /user/preferences
  savePreferences: async (data: UserPreferences): Promise<void> => {
    try {
      await apiClient.post('/personalization/api/v1/user/preferences', data);
    } catch (error) {
      console.error("Failed to save preferences:", error);
      throw error;
    }
  },

  // Calls GET /user/preferences
  getUserPreferences: async (): Promise<UserPreferencesWithMarket> => {
    try {
      const response = await apiClient.get('/personalization/api/v1/user/preferences');
      return response.data;
    } catch (error) {
      console.error("Failed to get preferences:", error);
      throw error;
    }
  }

  // TODO: Check if user embedding is present otherwise redirect to questionarre
  // embeddingExists: async (): Promise<
};