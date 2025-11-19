/**
 * Interface for a single Ingredient object.
 */
export interface Ingredient {
  name: string;
  quantity: number;
  unit: string; // e.g., "cups", "grams", "tbsp"
}