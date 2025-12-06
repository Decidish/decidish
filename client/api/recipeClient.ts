// import axios, { AxiosInstance } from 'axios';
// import { Recipe } from '@/api/models/recipe';
// import { RecipeListResponse } from '@/api/models/recipelist_response';

// /**
//  * A client for interacting with the Recipe API.
//  */
// export class RecipeClient {
//   private api: AxiosInstance;
//   // TODO: Retrieve from environment variable
//   private static readonly API_BASE_URL = 'https://api.example.com/v1';
//   // TODO: Retrieve from environment variable
//   private static readonly API_KEY = 'your_api_key_here';

//   constructor() {
//     this.api = axios.create({
//       baseURL: RecipeClient.API_BASE_URL,
//       timeout: 10000, // timeout
//       headers: {
//         'Authorization': `Bearer ${RecipeClient.API_KEY}`,
//       },
//     });

//     // Optional: Add an interceptor to handle common errors globally
//     this.api.interceptors.response.use(
//       (response) => response,
//       (error) => {
//         console.error("API call failed:", error.message);
//         // Throw a specific error type or just reject the promise
//         return Promise.reject(error);
//       }
//     );
//   }

//   /**
//    * Retrieves a single recipe by its ID.
//    * @param id The unique identifier of the recipe.
//    * @returns A promise that resolves to a Recipe object.
//    */
//   public async getRecipeById(id: string): Promise<Recipe> {
//     try {
//       // Axios automatically returns the response.data
//       const response = await this.api.get<Recipe>(`/recipes/${id}`);
//       return response.data;
//     } catch (error) {
//       // Re-throw to be handled by the caller
//       throw new Error(`Failed to fetch recipe with ID ${id}: ${error instanceof Error ? error.message : "Unknown error"}`);
//     }
//   }

//   /**
//    * Fetches a list of recommended recipes based on a query.
//    * @param query Search term (e.g., "pasta", "vegan").
//    * @param limit Maximum number of results to return.
//    * @returns A promise that resolves to a RecipeListResponse.
//    */
//   public async searchRecipes(query: string, limit: number = 10): Promise<RecipeListResponse> {
//     try {
//       const response = await this.api.get<RecipeListResponse>('/recipes/search', {
//         params: {
//           q: query,
//           limit: limit
//         },
//       });
//       return response.data;
//     } catch (error) {
//       throw new Error(`Failed to search recipes for query "${query}": ${error instanceof Error ? error.message : "Unknown error"}`);
//     }
//   }
// }

// TEMPORARY MOCK DATA

import { Recipe } from '@/api/models/recipe';
import { RecipeListResponse } from '@/api/models/recipelist_response';
// Import your mock data here!
import { MOCK_RECIPES } from '@/assets/data/demo'; 

export class RecipeClient {
  /**
   * MOCK IMPLEMENTATION: Returns a recipe from our local list
   */
  public async getRecipeById(id: string): Promise<Recipe> {
    // Simulate a network delay (e.g., 500ms)
    await new Promise(resolve => setTimeout(resolve, 500));

    const recipe = MOCK_RECIPES.find(r => r.id === id);

    if (!recipe) {
      throw new Error(`Recipe with ID ${id} not found in mock data.`);
    }

    return recipe;
  }

  /**
   * MOCK IMPLEMENTATION: Filters our local list based on the query
   */
  public async searchRecipes(query: string, limit: number = 10): Promise<RecipeListResponse> {
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simple case-insensitive filter
    const filtered = MOCK_RECIPES.filter(r => 
      r.title.toLowerCase().includes(query.toLowerCase())
    );

    // Return the shape your app expects
    return {
      recipes: filtered.slice(0, limit),
      totalCount: filtered.length,
      page: 1,
      limit: limit
    };
  }
}