import apiClient from '../client';

export interface Address {
  street: string;
  city: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

export interface Market {
  id: number;
  name: string;
  address: Address;
}

export const marketApi = {
  getMarketById: async (id: number): Promise<Market | null> => {
    try {
      const response = await apiClient.get(`/shopping/api/v1/markets/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch market details", error);
      return null;
    }
  }
};