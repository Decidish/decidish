import apiClient from '../client';
import { Market } from '@/types/market';

export const marketApi = {
  /**
   * Searches for markets based on postal code.
   * Backend Endpoint: GET /markets?plz=12345
   */
  searchMarkets: async (postalCode: string): Promise<Market[]> => {
    try {
      const response = await apiClient.get<Market[]>('shopping/api/v1/markets', {
        params: { plz: postalCode } // Java controller expects "plz", not "postalCode"
      });
      return response.data;
    } catch (error) {
      console.error("Error searching markets:", error);
      throw error;
    }
  },

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