import apiClient from '../client';

export interface ProductAttributes {
  isOrganic: boolean;      // Java: isOrganic
  isVegan: boolean;        // Java: isVegan
  isGlutenFree: boolean;   // Java: isGlutenFree
  isDairyFree: boolean;    // Java: isDairyFree
  isRegional: boolean;     // Java: isRegional
  isBulkyGood: boolean;    // Java: isBulkyGood
  isNew: boolean;          // Java: isNew
  isLowestPrice: boolean;  // Java: isLowestPrice
  isAgeRestricted: boolean;// Java: isAgeRestricted
}

export interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string; 
  grammage: string;
  attributes: ProductAttributes; 
}

// Matches Spring Boot's Page<T> JSON response
export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number; // Current page index
}

export interface SearchParams {
  query: string;
  filter: string;
  sort: string;
  page: number;
  marketId: number;
}

export const productApi = {
  /**
   * Searches for products with filtering and pagination.
   * Endpoint: GET /products/search?query=...&filter=...&sort=...&page=0
   */
  searchProducts: async ({ query, filter, sort, page, marketId }: SearchParams): Promise<PageResponse<Product>> => {
    try {
      const response = await apiClient.get<PageResponse<Product>>('shopping/api/v1/markets/search/products', {
        params: {
          query: query.trim() || undefined, // Send undefined if empty to avoid ?query=
          filter: filter === 'all' ? undefined : filter,
          sort: sort === 'none' ? undefined : sort,
          marketId: marketId,
          page: page - 1, // Convert UI 1-based page to Backend 0-based page
          size: 12 // Hardcoded limit or pass as argument
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error searching products:", error);
      throw error;
    }
  }
};