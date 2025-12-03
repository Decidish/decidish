CREATE SEQUENCE IF NOT EXISTS market_sequence START WITH 1 INCREMENT BY 1;

CREATE TABLE markets
(
    id         BIGINT  NOT NULL,
    name       VARCHAR(255),
    address_id BIGINT,
    is_open    BOOLEAN NOT NULL,
    CONSTRAINT pk_markets PRIMARY KEY (id)
);

ALTER TABLE markets
    ADD CONSTRAINT uc_markets_address UNIQUE (address_id);

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