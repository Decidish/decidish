-- +goose Up
-- +goose StatementBegin
CREATE TABLE search_term_market (
    search_term VARCHAR(255) NOT NULL,
    market_id BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (search_term, market_id),

    CONSTRAINT fk_search_term_market_market 
        FOREIGN KEY (market_id) 
        REFERENCES markets (id) 
        ON DELETE CASCADE
);

-- Index for fast lookups by search term
CREATE INDEX idx_search_term ON search_term_market(search_term);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS search_term_market;
-- +goose StatementEnd