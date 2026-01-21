import apiClient from "../client";

export interface UserPreferences {
  allergies: string[];
  min_cooking_time: number; 
  max_cooking_time: number; 
  budget: number;
  skill_level: string;
  preference_vector: number[]; 
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
  }
};