CREATE TABLE addresses
(
    id       BIGSERIAL NOT NULL,
    street   VARCHAR(255),
    zip_code VARCHAR(5),
    city     VARCHAR(255),
    CONSTRAINT pk_addresses PRIMARY KEY (id)
);

-- Index for searching markets by postal/zip code
CREATE INDEX idx_addresses_zip_code ON addresses (zip_code);

CREATE TABLE markets
(
    id           BIGINT NOT NULL,
    name         VARCHAR(255),
    address_id   BIGINT NOT NULL,
    last_updated TIMESTAMP,
    CONSTRAINT pk_markets PRIMARY KEY (id),
    CONSTRAINT uc_markets_address UNIQUE (address_id), -- Unique constraint added
    CONSTRAINT fk_markets_on_address FOREIGN KEY (address_id) REFERENCES addresses(id)
);

-- Index is created automatically for the UNIQUE constraint on address_id,
-- but a non-unique index on 'name' is often useful for searching.
CREATE INDEX idx_markets_name ON markets (name);

CREATE TABLE products
(
    id            BIGINT NOT NULL,
    name          VARCHAR(255),
    market_id     BIGINT NOT NULL,
    price         INT,
    image_url     VARCHAR(255),
    grammage      VARCHAR(255),
    last_updated  TIMESTAMP,
    normalized_amount FLOAT,

    is_bulky_good      BOOLEAN,
    is_organic         BOOLEAN,
    is_vegan           BOOLEAN,
    is_vegetarian      BOOLEAN,
    is_dairy_free      BOOLEAN,
    is_gluten_free     BOOLEAN,
    is_biocide         BOOLEAN,
    is_age_restricted  BOOLEAN,
    is_regional        BOOLEAN,
    is_new             BOOLEAN,
    is_lowest_price    BOOLEAN,
    is_tobacco         BOOLEAN,

    CONSTRAINT pk_products PRIMARY KEY (id),
    -- Foreign Key to markets table
    CONSTRAINT fk_products_on_market FOREIGN KEY (market_id) REFERENCES markets(id)
);

-- Indexes for efficient lookups/joins:
-- 1. Index on market_id (Crucial for getting all products in a market)
CREATE INDEX idx_products_market_id ON products (market_id);

-- 2. Index on name (Useful for product searching)
CREATE INDEX idx_products_name ON products (name);

CREATE TABLE IF NOT EXISTS ingredients (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255)
);

-- Matching ingredients to products
CREATE TABLE ingredient_product (
    ingredient_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    confidence FLOAT NOT NULL, -- in range [0.0, 1.0]
    PRIMARY KEY (ingredient_id, product_id),
    CONSTRAINT fk_ipm_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
    CONSTRAINT fk_ipm_product FOREIGN KEY (product_id) REFERENCES products(id)
);
