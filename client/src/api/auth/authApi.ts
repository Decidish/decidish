import apiClient from "../client";

export interface AuthProfile {
  id: number;
  user_id: string;
  username: string;
  email: string;
  name: string;
  created_at: string;
}

export const authApi = {
  login: async (username: string, password: string): Promise<void> => {
    try {
      await apiClient.post('/auth/login', {
        username: username,
        password: password
      });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  },

  register: async (username: string, password: string, name?: string): Promise<void> => {
    try {
      await apiClient.post('/auth/register', {
        username,
        password,
        name,
      });
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  },

  getProfile: async (): Promise<AuthProfile> => {
    try {
      const response = await apiClient.get<AuthProfile>('/auth/me');
      return response.data;
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  },
};