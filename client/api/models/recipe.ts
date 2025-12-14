import {Nutrients} from "@/api/models/nutrition";

export interface Recipe {
    // string `json:"category"`
    category: string;

    // int `json:"cook_time"`
    cookTime: number;

    // string `json:"description"`
    description: string;

    // string `json:"image"`
    image: string;

    // []string `json:"ingredients"`
    ingredients: string[];

    // string `json:"instructions"`
    instructions: string;

    // []string `json:"keywords"`
    keyWords: string[];

    // Nutrients `json:"nutrients"`
    nutrients: Nutrients; // Reference to the Nutrients interface

    // int `json:"prep_time"`
    prepTime: number;

    // float64 `json:"ratings"`
    ratings: number;

    // int `json:"total_time"`
    totalTime: number;

    // string `json:"title"`
    title: string;

    // string `json:"yields"`
    yields: string;
}