import apiClient from "../client";

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

  register: async (username: string, password: string): Promise<void> => {
    // TODO: There should be no auto login, does this even work right now???
    try {
      await apiClient.post('/auth/register', {
        username: username,
        password: password
      });
      // auto-login
      await apiClient.post('/auth/login', {
        username: username,
        password: password
      });
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  },
};