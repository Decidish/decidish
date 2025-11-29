package model

type RecipeData struct {
    Author           string   `json:"author"`
    CanonicalURL     string   `json:"canonical_url"`
    Category         string   `json:"category"`
    Description      string   `json:"description"`
    Image            string   `json:"image"`
    Ingredients      []string `json:"ingredients"`
    InstructionsList []string `json:"instructions_list"`
    Keywords         []string `json:"keywords"`
    Title            string   `json:"title"`
    TotalTime        int      `json:"total_time"`
    Yields           string   `json:"yields"`
}

// Data schema

// Table Name,Purpose,Key Attributes,Relationship Type
// recipes,Holds the main recipe details.,"id, title, description, canonical_url",
// categories,Stores unique category names.,"id, name (e.g., ""Salate"", ""Vorspeise"")",Many-to-Many with recipes
// ingredients,Stores unique ingredient names.,"id, name (e.g., ""Rucolasalat"", ""Pekannüsse"")",Many-to-Many with recipes
// recipe_categories,Junction/Link Table to link recipes to categories.,"recipe_id, category_id",
// recipe_ingredients,Junction/Link Table to link recipes to ingredients.,"recipe_id, ingredient_id, quantity, unit",