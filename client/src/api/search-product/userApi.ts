import apiClient from "../client";

export const userApi = {
  getUserMarketId: async (): Promise<number | null> => {
    try {
      const response = await apiClient.get('/personalization/api/v1/user/market');
      console.log("Market ID fetched:", response);
      return response.data.marketId;
    } catch (error: any) {
        if (error.response && error.response.status === 404) {
            console.warn("User has not selected a market yet.");
            return null;
        }
        console.error("Failed to fetch user market preference:", error);
        return null;
    }
  }
};