import personalizationClient from '../personalizationClient';

export interface UserPreferences {
  allergies: string[];
  cooking_time: string;
  budget: string;
  skill_level: string;
  preference_vector: number[]; 
}

export const userApi = {
  // Calls POST /user/preferences
  savePreferences: async (data: UserPreferences): Promise<void> => {
    try {
      await personalizationClient.post('/user/preferences', data);
    } catch (error) {
      console.error("Failed to save preferences:", error);
      throw error;
    }
  }
};