import authClient from "./authClient";

export const authApi = {
  login: async (username: string, password: string): Promise<void> => {
    try {
      await authClient.post('/login', {
        username: username,
        password: password
      });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  },

  register: async (username: string, password: string): Promise<void> => {
    try {
      await authClient.post('/register', {
        username: username,
        password: password
      });
      // auto-login
      await authClient.post('/login', {
        username: username,
        password: password
      });
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  },
};