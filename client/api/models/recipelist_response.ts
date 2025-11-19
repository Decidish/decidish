import { Recipe } from '@/api/models/recipe';

/**
 * Interface for the response when listing multiple recipes.
 * This is common for search/recommendation endpoints.
 */
export interface RecipeListResponse {
  recipes: Recipe[];
  totalCount: number;
  page: number;
  limit: number;
}