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
            window.REACT_APP_NAVIGATE('/questionnaire');
            return null;
        }

        if (error.response.status === 401) {
            console.error("Unauthorized access - user may not be logged in.");
            window.REACT_APP_NAVIGATE('/auth');
            return null;
        }
        console.error("Failed to fetch user market preference:", error);
        return null;
    }
  }
};