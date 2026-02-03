-- +goose Up
-- +goose StatementBegin
-- Index for filtering out recently viewed recipes (NOT EXISTS subquery)
CREATE INDEX IF NOT EXISTS idx_user_history_recipe_id 
ON user_history (recipe_id);

-- Index for user's recent history lookup
CREATE INDEX IF NOT EXISTS idx_user_history_user_recent 
ON user_history (user_id, action_timestamp DESC);

-- Index for recipe_embeddings joins (currently only has HNSW on embedding)
CREATE INDEX IF NOT EXISTS idx_recipe_embeddings_recipe_id 
ON recipe_embeddings (recipe_id);

-- Indexes for allergen filtering (3-way join optimization)
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id 
ON recipe_ingredients (ingredient_id);

CREATE INDEX IF NOT EXISTS idx_ingredients_allergens_ingredient_id 
ON ingredients_allergens (ingredient_id);

CREATE INDEX IF NOT EXISTS idx_user_allergens_user_id 
ON user_allergens (user_id);

-- Composite index for cooking time filtering
CREATE INDEX IF NOT EXISTS idx_recipes_total_time_id 
ON recipes (total_time, id) 
WHERE total_time > 0;

-- Index for recipe keyword lookups
CREATE INDEX IF NOT EXISTS idx_recipe_keywords_recipe_id 
ON recipe_keywords (recipe_id);

-- Index for recipe category lookups  
CREATE INDEX IF NOT EXISTS idx_recipe_categories_recipe_id 
ON recipe_categories (recipe_id);

-- Covering index for training data queries
CREATE INDEX IF NOT EXISTS idx_user_history_training 
ON user_history (action_timestamp DESC) 
INCLUDE (user_id, recipe_id, action);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_user_history_recipe_id;
DROP INDEX IF EXISTS idx_user_history_user_recent;
DROP INDEX IF EXISTS idx_recipe_embeddings_recipe_id;
DROP INDEX IF EXISTS idx_recipe_ingredients_ingredient_id;
DROP INDEX IF EXISTS idx_ingredients_allergens_ingredient_id;
DROP INDEX IF EXISTS idx_user_allergens_user_id;
DROP INDEX IF EXISTS idx_recipes_total_time_id;
DROP INDEX IF EXISTS idx_recipe_keywords_recipe_id;
DROP INDEX IF EXISTS idx_recipe_categories_recipe_id;
DROP INDEX IF EXISTS idx_user_history_training;
-- +goose StatementEnd
