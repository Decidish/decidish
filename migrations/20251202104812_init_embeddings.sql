-- +goose Up
-- +goose StatementBegin
CREATE TABLE recipe_embeddings (
    id SERIAL PRIMARY KEY,
    recipe_id INT UNIQUE references recipes(id) ON DELETE CASCADE,
    embedding vector(384)
);

CREATE INDEX ON recipe_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

SET hnsw.ef_search = 128;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS recipe_embeddings_embedding_idx;
DROP TABLE recipe_embeddings;
-- +goose StatementEnd
