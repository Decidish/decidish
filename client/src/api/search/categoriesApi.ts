import apiClient from '../client';

export interface CategoriesResponse {
  categories: string[];
}

export const categoriesApi = {
  listCategories: async (query?: string, limit: number = 5): Promise<string[]> => {
    const resp = await apiClient.get<CategoriesResponse>('/personalization/categories', {
      params: {
        q: query || undefined,
        limit,
      },
    });
    return resp.data.categories;
  },
};
