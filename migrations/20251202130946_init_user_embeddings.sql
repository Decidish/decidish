-- +goose Up
-- +goose StatementBegin
CREATE TABLE user_preferences (
    user_id INT PRIMARY KEY,
    market_id VARCHAR(10),
    min_cooking_time INT, -- e.g., 30
    max_cooking_time INT, -- e.g., 45
    allergies TEXT,
    budget INTEGER,
    skill_level VARCHAR(15),
    preferences_vec vector(35)
);

CREATE TABLE user_embeddings (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE references user_preferences(user_id) ON DELETE CASCADE,
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
