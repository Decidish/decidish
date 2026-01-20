import personalizationClient from '../personalizationClient';

export const userApi = {
  // Calls POST /user/market
  saveMarket: async (marketId: string): Promise<void> => {
    try {
      // Assuming a standard JSON object here:
      await personalizationClient.post('/user/market', { market_id: marketId });
    } catch (error) {
      console.error("Failed to save market selection:", error);
      throw error;
    }
  }
};