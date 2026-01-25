import apiClient from '../client';

export interface KeywordsResponse {
  keywords: string[];
}

export const keywordsApi = {
  listKeywords: async (query?: string, limit: number = 5): Promise<string[]> => {
    const resp = await apiClient.get<KeywordsResponse>('/personalization/keywords', {
      params: {
        q: query || undefined,
        limit,
      },
    });
    return resp.data.keywords;
  },
};
