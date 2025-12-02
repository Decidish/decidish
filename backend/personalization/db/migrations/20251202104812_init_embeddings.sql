-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION vector;

CREATE TABLE recipe_embeddings (
    id SERIAL PRIMARY KEY,
    recipe_id INT references recipes(id),
    embedding vector(10)
);

CREATE INDEX ON recipe_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

SET hnsw.ef_search = 128;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS 
-- +goose StatementEnd
