import apiClient from "../client";

export const userApi = {
  // Calls POST /user/market
  saveMarket: async (marketId: string): Promise<void> => {
    try {
      // Assuming a standard JSON object here:
      await apiClient.post('/personalization/api/v1/user/market', { market_id: marketId });
    } catch (error) {
      console.error("Failed to save market selection:", error);
      throw error;
    }
  }
};