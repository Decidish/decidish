-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS saved_recipes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES user_preferences(user_id) ON DELETE CASCADE,
    recipe_id INT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_saved_recipe UNIQUE (user_id, recipe_id)
);

CREATE INDEX saved_recipes_user_id_idx ON saved_recipes (user_id);
CREATE INDEX saved_recipes_saved_at_idx ON saved_recipes (user_id, saved_at DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS saved_recipes;
-- +goose StatementEnd
