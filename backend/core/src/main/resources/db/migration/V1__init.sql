CREATE TABLE markets
(
    id         VARCHAR(255) NOT NULL,
    name       VARCHAR(255),
    address_id BIGINT,
    last_updated TIMESTAMP,
    CONSTRAINT pk_markets PRIMARY KEY (id)
);

ALTER TABLE markets
    ADD CONSTRAINT uc_markets_address UNIQUE (address_id);

CREATE TABLE products
(
    id         BIGINT  NOT NULL,
    name       VARCHAR(255),
    market_id  BIGINT,
    price      INT,
    image_url  VARCHAR(255),
    grammage   VARCHAR(255),
    last_updated TIMESTAMP,
    CONSTRAINT pk_products PRIMARY KEY (id)
);

ALTER TABLE products
    ADD CONSTRAINT uc_products_market (market_id);

ALTER TABLE products
    ADD CONSTRAINT FK_PRODUCTS_ON_MARKET FOREIGN KEY (market_id) REFERENCES markets(id);

CREATE TABLE addresses
(
    id       BIGINT NOT NULL,
    street   VARCHAR(255),
    zip_code VARCHAR(255),
    city     VARCHAR(255),
    CONSTRAINT pk_address PRIMARY KEY (id)
);

ALTER TABLE markets
    ADD CONSTRAINT FK_MARKETS_ON_ADDRESS FOREIGN KEY (address_id) REFERENCES addresses(id);