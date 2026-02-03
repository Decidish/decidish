-- +goose Up
-- +goose StatementBegin
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on created_at for time-based queries (sorting, filtering recent users)
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Index on name for search queries (if searching by name is common)
CREATE INDEX idx_users_name ON users(name);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_users_name;
DROP INDEX IF EXISTS idx_users_created_at;
DROP TABLE IF EXISTS users;
-- +goose StatementEnd
