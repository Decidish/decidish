-- +goose Up
-- +goose StatementBegin
CREATE TABLE addresses
(
    id       BIGSERIAL NOT NULL,
    street   VARCHAR(255),
    zip_code VARCHAR(255),
    city     VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    CONSTRAINT pk_addresses PRIMARY KEY (id)
);

CREATE INDEX idx_addresses_zip_code ON addresses (zip_code);

CREATE TABLE markets
(
    id      BIGINT NOT NULL,
    name         VARCHAR(255),
    address_id   BIGINT,
    last_updated TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_markets PRIMARY KEY (id)
);

CREATE INDEX idx_markets_name ON markets (name);

CREATE TABLE products
(
    id                BIGSERIAL NOT NULL,
    rewe_id           BIGINT  NOT NULL,
    name              VARCHAR(255),
    market_id         BIGINT  NOT NULL,
    price             INTEGER NOT NULL,
    image_url         VARCHAR(255),
    grammage          VARCHAR(255),
    normalized_amount FLOAT,
    last_updated      TIMESTAMP WITHOUT TIME ZONE,
    is_bulky_good     BOOLEAN,
    is_organic        BOOLEAN,
    is_vegan          BOOLEAN,
    is_vegetarian     BOOLEAN,
    is_dairy_free     BOOLEAN,
    is_gluten_free    BOOLEAN,
    is_biocide        BOOLEAN,
    is_age_restricted BOOLEAN,
    is_regional       BOOLEAN,
    is_new            BOOLEAN,
    is_lowest_price   BOOLEAN,
    is_tobacco        BOOLEAN,
    CONSTRAINT pk_products PRIMARY KEY (id)
);

ALTER TABLE products
    ADD CONSTRAINT uc_552f0de4d067a07e62a713c90 UNIQUE (market_id, id);

ALTER TABLE markets
    ADD CONSTRAINT uc_markets_address UNIQUE (address_id);

ALTER TABLE markets
    ADD CONSTRAINT FK_MARKETS_ON_ADDRESS FOREIGN KEY (address_id) REFERENCES addresses (id);

ALTER TABLE products
    ADD CONSTRAINT FK_PRODUCTS_ON_MARKET FOREIGN KEY (market_id) REFERENCES markets (id);

CREATE INDEX idx_products_market_id ON products (market_id);

CREATE INDEX idx_products_name ON products (name);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
-- +goose StatementEnd
