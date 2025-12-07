-- +goose Up
-- +goose StatementBegin
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE keywords (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    title TEXT UNIQUE,
    description TEXT,
    instructions TEXT,
    cook_time INT,
    prep_time INT,
    total_time INT,
    image VARCHAR(255),
    rating FLOAT,
    serving_size VARCHAR(50),
    calories VARCHAR(10),
    yields VARCHAR(20)
);

CREATE TABLE recipe_keywords (
    recipe_id INT,
    keyword_id INT,

    PRIMARY KEY (recipe_id, keyword_id)
);

CREATE TABLE recipe_categories (
    recipe_id INT,
    category_id INT,

    PRIMARY KEY (recipe_id, category_id)
);

CREATE TABLE recipe_ingredients (
    recipe_id INT,
    ingredient_id INT,
    quantity DECIMAL(8, 2),
    unit VARCHAR(50),

    PRIMARY KEY (recipe_id, ingredient_id)
);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE recipe_ingredients;
DROP TABLE recipe_categories;
DROP TABLE recipe_keywords;
DROP TABLE recipes;
DROP TABLE ingredients;
DROP TABLE categories;
DROP TABLE keywords;
-- +goose StatementEnd
