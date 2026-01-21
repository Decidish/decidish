-- +goose Up
-- +goose StatementBegin
CREATE TABLE user_preferences (
    user_id INT PRIMARY KEY,
    postal_code VARCHAR(5),
    cooking_time VARCHAR(10),
    allergies TEXT,
    budget VARCHAR(10),
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
