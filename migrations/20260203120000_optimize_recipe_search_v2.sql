-- +goose Up
-- +goose StatementBegin

-- Additional indexes for faster recipe search aggregations
-- Index for ingredients_allergens lookups (used in allergen aggregation)
CREATE INDEX IF NOT EXISTS idx_ingredients_allergens_ingredient_id 
ON ingredients_allergens (ingredient_id);

CREATE INDEX IF NOT EXISTS idx_ingredients_allergens_allergen_id 
ON ingredients_allergens (allergen_id);

-- Index for recipe_ingredients ingredient_id (for joining with ingredients_allergens)
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id 
ON recipe_ingredients (ingredient_id);

-- Index for recipe_keywords keyword_id (for joining with keywords table)
CREATE INDEX IF NOT EXISTS idx_recipe_keywords_keyword_id 
ON recipe_keywords (keyword_id);

-- Index for recipe_categories category_id (for joining with categories table)
CREATE INDEX IF NOT EXISTS idx_recipe_categories_category_id 
ON recipe_categories (category_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_recipe_categories_category_id;
DROP INDEX IF EXISTS idx_recipe_keywords_keyword_id;
DROP INDEX IF EXISTS idx_recipe_ingredients_ingredient_id;
DROP INDEX IF EXISTS idx_ingredients_allergens_allergen_id;
DROP INDEX IF EXISTS idx_ingredients_allergens_ingredient_id;

-- +goose StatementEnd
