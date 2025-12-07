-- +goose Up
-- +goose StatementBegin
CREATE TABLE user_embeddings (
    id SERIAL PRIMARY KEY,
    user_id INT,
    embedding vector(10)
);

CREATE INDEX ON user_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 200);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS user_embeddings_embedding_idx;
DROP TABLE user_embeddings;
-- +goose StatementEnd
