import { RecipeRecommendation } from '@/api/recipe-swiper/recipesApi';
import { IngredientGroup, Product } from '@/api/recipe-swiper/productsApi';

export interface AddRecipeRequestBody {
    recipeUrl: string;
}

export interface UIRecipe extends RecipeRecommendation {
    richIngredients: IngredientGroup[] | null;
}

export type SelectedProducts = Record<number, Product | Product[] | 'already-have'>;
