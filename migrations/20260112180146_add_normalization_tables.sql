-- +goose Up
-- +goose StatementBegin
CREATE SCHEMA IF NOT EXISTS reference_data;

CREATE TABLE reference_data.unit_conversions (
                                                 from_unit VARCHAR(50),
                                                 to_unit VARCHAR(50),
                                                 factor DOUBLE PRECISION,
                                                 PRIMARY KEY (from_unit, to_unit)
);

CREATE TABLE reference_data.ingredient_definitions (
                                                       id SERIAL PRIMARY KEY,
                                                       name VARCHAR(255) UNIQUE NOT NULL,
                                                       density DOUBLE PRECISION DEFAULT 1.0,
                                                       piece_weight_g DOUBLE PRECISION DEFAULT 0
);

CREATE TABLE reference_data.ingredient_aliases (
                                                   alias VARCHAR(255) PRIMARY KEY,
                                                   ingredient_id INT REFERENCES reference_data.ingredient_definitions(id)
);

-- Seed Data
INSERT INTO reference_data.unit_conversions (from_unit, to_unit, factor) VALUES
                                                                             ('kg', 'g', 1000), ('g', 'g', 1), ('mg', 'g', 0.001),
                                                                             ('l', 'ml', 1000), ('ml', 'ml', 1),
                                                                             ('tsp', 'ml', 5), ('tbsp', 'ml', 15), ('cup', 'ml', 240);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
-- +goose StatementEnd