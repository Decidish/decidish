CREATE TABLE addresses
(
    id       BIGINT NOT NULL,
    street   VARCHAR(255),
    zip_code VARCHAR(255),
    city     VARCHAR(255),
    CONSTRAINT pk_addresses PRIMARY KEY (id)
);

-- Index for searching markets by postal/zip code
CREATE INDEX idx_addresses_zip_code ON addresses (zip_code);

CREATE TABLE markets
(
    id           VARCHAR(255) NOT NULL,
    name         VARCHAR(255),
    address_id   BIGINT NOT NULL, -- Changed to NOT NULL as every market must have an address
    last_updated TIMESTAMP,
    CONSTRAINT pk_markets PRIMARY KEY (id),
    CONSTRAINT uc_markets_address UNIQUE (address_id), -- Unique constraint added
    CONSTRAINT fk_markets_on_address FOREIGN KEY (address_id) REFERENCES addresses(id)
);

-- Index is created automatically for the UNIQUE constraint on address_id,
-- but a non-unique index on 'name' is often useful for searching.
CREATE INDEX idx_markets_name ON markets (name);

CREATE TABLE product_attributes
(
    id                 BIGINT NOT NULL,
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
    CONSTRAINT pk_product_attributes PRIMARY KEY (id)
);

CREATE TABLE products
(
    id            BIGINT NOT NULL,
    name          VARCHAR(255),
    market_id     VARCHAR(255) NOT NULL,
    price         INT,
    image_url     VARCHAR(255),
    grammage      VARCHAR(255),
    last_updated  TIMESTAMP,
    attributes_id BIGINT,
    CONSTRAINT pk_products PRIMARY KEY (id),
    -- Foreign Key to markets table
    CONSTRAINT fk_products_on_market FOREIGN KEY (market_id) REFERENCES markets(id),
    -- Foreign Key to product_attributes table
    CONSTRAINT fk_products_on_product_attributes FOREIGN KEY (attributes_id) REFERENCES product_attributes(id)
);

-- Indexes for efficient lookups/joins:
-- 1. Index on market_id (Crucial for getting all products in a market)
CREATE INDEX idx_products_market_id ON products (market_id);

-- 2. Index on attributes_id (Useful for querying products by their attributes)
CREATE INDEX idx_products_attributes_id ON products (attributes_id);

-- 3. Index on name (Useful for product searching)
CREATE INDEX idx_products_name ON products (name);