import { Ingredient } from '@/api/models/ingredient';

/**
 * Interface for a full Recipe object.
 */
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
}