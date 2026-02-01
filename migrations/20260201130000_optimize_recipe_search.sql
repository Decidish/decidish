-- +goose Up
-- +goose StatementBegin

-- Indexes for faster recipe search
-- Title search uses LIKE, so we need a trigram index for pattern matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN trigram index for title pattern matching
CREATE INDEX IF NOT EXISTS idx_recipes_title_trgm 
ON recipes USING gin (LOWER(title) gin_trgm_ops);

-- Create GIN trigram index for description pattern matching  
CREATE INDEX IF NOT EXISTS idx_recipes_description_trgm 
ON recipes USING gin (LOWER(description) gin_trgm_ops);

-- Index for total_time filtering
CREATE INDEX IF NOT EXISTS idx_recipes_total_time 
ON recipes (total_time);

-- Index for recipe_ingredients lookups
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id 
ON recipe_ingredients (recipe_id);

-- Index for recipe_keywords lookups
CREATE INDEX IF NOT EXISTS idx_recipe_keywords_recipe_id 
ON recipe_keywords (recipe_id);

-- Index for recipe_categories lookups
CREATE INDEX IF NOT EXISTS idx_recipe_categories_recipe_id 
ON recipe_categories (recipe_id);

-- Composite index for category name lookup
CREATE INDEX IF NOT EXISTS idx_categories_name_lower 
ON categories (LOWER(name));

-- Composite index for keyword name lookup
CREATE INDEX IF NOT EXISTS idx_keywords_name_lower 
ON keywords (LOWER(name));

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_keywords_name_lower;
DROP INDEX IF EXISTS idx_categories_name_lower;
DROP INDEX IF EXISTS idx_recipe_categories_recipe_id;
DROP INDEX IF EXISTS idx_recipe_keywords_recipe_id;
DROP INDEX IF EXISTS idx_recipe_ingredients_recipe_id;
DROP INDEX IF EXISTS idx_recipes_total_time;
DROP INDEX IF EXISTS idx_recipes_description_trgm;
DROP INDEX IF EXISTS idx_recipes_title_trgm;

-- +goose StatementEnd
