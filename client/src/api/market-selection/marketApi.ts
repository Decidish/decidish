import apiClient from '../client';
import { Market } from '@/types/market';

export const marketApi = {
  /**
   * Searches for markets based on postal code.
   * Backend Endpoint: GET /markets?plz=12345
   */
  searchMarkets: async (postalCode: string): Promise<Market[]> => {
    try {
      const response = await apiClient.get<Market[]>('/markets', {
        params: { plz: postalCode } // Java controller expects "plz", not "postalCode"
      });
      return response.data;
    } catch (error) {
      console.error("Error searching markets:", error);
      throw error;
    }
  }
};