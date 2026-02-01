-- +goose Up
-- +goose StatementBegin

-- Add partial unique index for active shopping lists per user
-- This enables INSERT ON CONFLICT for atomic get-or-create operations
-- and improves performance when looking up active lists
CREATE UNIQUE INDEX IF NOT EXISTS idx_shopping_lists_active_user 
ON shopping_lists (user_id) 
WHERE completed = FALSE;

-- Add index for faster lookups by user_id (all lists)
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id 
ON shopping_lists (user_id);

-- Add index for faster lookups on shopping_list_items by shopping_list_id
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id 
ON shopping_list_items (shopping_list_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_shopping_list_items_list_id;
DROP INDEX IF EXISTS idx_shopping_lists_user_id;
DROP INDEX IF EXISTS idx_shopping_lists_active_user;

-- +goose StatementEnd
