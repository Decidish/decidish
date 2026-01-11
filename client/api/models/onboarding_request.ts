export default interface UserPreferences {
    postalCode: string;

    weeklyBudget: number; // TypeScript uses 'number' for both floats and integers

    cookFrequency: number;

    dietaryPreferences: string[]; // Array of strings

    allergies: string[];

    servingPerMeal: number;

    cookingSkill: string;
}