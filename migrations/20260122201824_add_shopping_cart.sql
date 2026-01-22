-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS user_cart (
    user_id INT REFERENCES user_preferences(user_id) ON DELETE CASCADE,
    recipe_id INT REFERENCES recipes(id),
    product_id INT REFERENCES products(id),
    quantity INT DEFAULT 1,
    checked BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, recipe_id, product_id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
-- +goose StatementEnd
