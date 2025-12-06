import { Ingredient } from '@/api/models/ingredient';

/**
 * Interface for a full Recipe object.
 */

export interface Nutrition {
  calories: number;
  protein: number; // in grams
  carbs: number;  // in grams
  fat: number;  // in gramas
}
export interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
  imageUrl: string;
  nutrition: Nutrition;
  tags: string[];
}