-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS shopping_lists (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES user_preferences(user_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shopping_list_items (
    id SERIAL PRIMARY KEY,
    shopping_list_id INT REFERENCES shopping_lists(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    recipe_id INT REFERENCES recipes(id),
    quantity INT DEFAULT 1,
    checked BOOLEAN DEFAULT FALSE,

    UNIQUE (shopping_list_id, product_id, recipe_id)
);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
-- +goose StatementEnd
