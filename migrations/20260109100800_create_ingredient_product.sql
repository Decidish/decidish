-- +goose Up
-- +goose StatementBegin
CREATE TABLE ingredient_product (
    ingredient_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.0,
    
    PRIMARY KEY (ingredient_id, product_id),
    
    CONSTRAINT fk_ingredient_product_ingredient 
        FOREIGN KEY (ingredient_id) 
        REFERENCES ingredients (id) 
        ON DELETE CASCADE,
        
    CONSTRAINT fk_ingredient_product_product 
        FOREIGN KEY (product_id) 
        REFERENCES products (id) 
        ON DELETE CASCADE
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS ingredient_product;
-- +goose StatementEnd