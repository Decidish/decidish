-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS user_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES user_preferences(user_id),
    recipe_id INT NOT NULL REFERENCES recipes(id),
    action BOOLEAN NOT NULL, -- true for like, false for dislike
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_user_recipe UNIQUE (user_id, recipe_id) -- User must like or dislike, not both
);
-- +goose StatementEnd

-- Index
-- +goose StatementBegin
CREATE INDEX user_history_user_action_timestamp_idx
ON user_history (user_id, action, action_timestamp);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
-- +goose StatementEnd
