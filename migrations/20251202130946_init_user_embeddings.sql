-- +goose Up
-- +goose StatementBegin
CREATE TABLE user_preferences (
    user_id INT PRIMARY KEY,
    postal_code VARCHAR(5),
    weekly_budget FLOAT,
    cook_frequency INT,
    dietary_preferences TEXT,
    allergies TEXT,
    servings_per_meal INT,
    cooking_skill VARCHAR(10)
);

CREATE TABLE user_embeddings (
    id SERIAL PRIMARY KEY,
    user_id INT references user_preferences(user_id) ON DELETE CASCADE,
    embedding vector(384)
);

CREATE INDEX ON user_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 200);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS user_embeddings_embedding_idx;
DROP TABLE user_embeddings;
-- +goose StatementEnd
