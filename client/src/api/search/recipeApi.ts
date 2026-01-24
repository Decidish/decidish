import apiClient from '../client';

// Note: Some fields like 'difficulty' and 'cuisine' are populated via joins/keywords 
// in the Go backend, so they are included here as optional or derived strings.
export interface RecipeNutrients {
  servingSize: string;
  calories: string;
}

export interface Recipe {
  id: number;
  title: string;          // title
  description: string;    // description
  cook_time: number;      // cook_time
  prep_time: number;      // prep_time
  total_time: number;     // total_time
  image: string;          // image
  rating: number;         // rating
  calories: string;       // calories
  
  // These arrays are populated in the specific Search/Get logic
  ingredients: string[];  
  keywords: string[];     
  
  // Derived fields typically returned for filtering/UI
  cuisine?: string;
  difficulty?: string;
  nutrients?: RecipeNutrients;
}

export interface RecipeSearchResult {
  recipes: Recipe[];
  total_count: number;
  total_pages: number;
}

export interface RecipeSearchParams {
  query: string;
  cuisine: string;
  difficulty: string;
  maxTime: string;
  page: number;
}

export const recipeApi = {
  /**
   * Searches for recipes with filtering and pagination.
   * Endpoint: GET /recipes/search?q=...&cuisine=...&difficulty=...&maxTime=...&page=...
   */
  searchRecipes: async ({ query, cuisine, difficulty, maxTime, page }: RecipeSearchParams): Promise<RecipeSearchResult> => {
    try {
      const response = await apiClient.get<RecipeSearchResult>('/personalization/recipes/search', {
        params: {
          q: query.trim() || undefined,
          cuisine: cuisine === 'all' ? undefined : cuisine,
          difficulty: difficulty === 'all' ? undefined : difficulty,
          maxTime: maxTime === 'all' ? undefined : maxTime,
          page: page, 
          limit: 12   // consistent with ITEMS_PER_PAGE in frontend
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error searching recipes:", error);
      throw error;
    }
  },
};