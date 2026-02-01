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

CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS allergens (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE INDEX idx_allergen_name ON allergens(name);

CREATE TABLE IF NOT EXISTS ingredients_allergens(
    ingredient_id INT references ingredients(id) ON DELETE CASCADE,
    allergen_id INT references allergens(id) ON DELETE CASCADE,

    PRIMARY KEY(ingredient_id, allergen_id)
);

CREATE TABLE IF NOT EXISTS cuisine (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
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
    carbohydrate_content VARCHAR(10),
    cholesterol_content VARCHAR(10),
    fiber_content VARCHAR(10),
    protein_content VARCHAR(10),
    saturated_fat_content VARCHAR(10),
    sodium_content VARCHAR(10),
    sugar_content VARCHAR(10),
    fat_content VARCHAR(10),
    unsaturated_fat_content VARCHAR(10),
    yields VARCHAR(20)
);

CREATE INDEX idx_total_time ON recipes(total_time);

INSERT INTO recipes 
VALUES (
  0, 
  'General Items', 
  'A container for individual products added to the shopping list', 
  '', 
  0, 
  0, 
  1,'',0,0,0,0,0,0,0,0,0
);

CREATE TABLE IF NOT EXISTS recipe_cuisine (
    recipe_id INT references recipes(id) ON DELETE CASCADE,
    cuisine_id INT references cuisine(id),

    PRIMARY KEY (recipe_id, cuisine_id)
);

CREATE TABLE recipe_keywords (
    recipe_id INT references recipes(id) ON DELETE CASCADE,
    keyword_id INT references keywords(id),

    PRIMARY KEY (recipe_id, keyword_id)
);

CREATE TABLE recipe_categories (
    recipe_id INT references recipes(id) ON DELETE CASCADE,
    category_id INT references categories(id),

    PRIMARY KEY (recipe_id, category_id)
);

CREATE TABLE recipe_ingredients (
    recipe_id INT references recipes(id) ON DELETE CASCADE,
    ingredient_id INT references ingredients(id),
    quantity DECIMAL(8, 2),
    unit VARCHAR(50),
    original TEXT,
    info TEXT,

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
