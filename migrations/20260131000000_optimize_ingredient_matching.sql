-- +goose Up
-- +goose StatementBegin

-- =============================================================================
-- OPTIMIZED INGREDIENT-PRODUCT MATCHING SYSTEM
-- =============================================================================
-- Goal: Maximize matches to minimize API fallback calls
-- Strategy: Multi-tier matching (exact substring > word containment > full-text > trigram)
-- =============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create materialized view for unique products (avoids 120k -> 20k reduction each query)
-- This is crucial: same rewe_id appears once per market, we only need one name per rewe_id
CREATE MATERIALIZED VIEW IF NOT EXISTS unique_products AS
SELECT DISTINCT ON (rewe_id) 
    rewe_id, 
    name,
    -- Pre-compute normalized name for faster matching
    lower(regexp_replace(name, '[^a-zäöüßA-ZÄÖÜ0-9 ]', '', 'g')) AS normalized_name,
    -- Pre-compute tsvector for full-text search
    to_tsvector('german', name) AS name_tsv
FROM products
WHERE name IS NOT NULL AND name <> ''
ORDER BY rewe_id, name;

-- 3. Create indexes on the materialized view
CREATE UNIQUE INDEX idx_unique_products_rewe_id ON unique_products(rewe_id);
CREATE INDEX idx_unique_products_name_trgm ON unique_products USING gin(name gin_trgm_ops);
CREATE INDEX idx_unique_products_normalized_trgm ON unique_products USING gin(normalized_name gin_trgm_ops);
CREATE INDEX idx_unique_products_name_fts ON unique_products USING gin(name_tsv);

-- 4. Add normalized column and index to ingredients table for faster matching
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS normalized_name TEXT;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS name_tsv tsvector;

-- Update existing ingredients with normalized names
UPDATE ingredients 
SET normalized_name = lower(regexp_replace(name, '[^a-zäöüßA-ZÄÖÜ0-9 ]', '', 'g')),
    name_tsv = to_tsvector('german', name)
WHERE normalized_name IS NULL;

-- Create indexes on ingredients
CREATE INDEX IF NOT EXISTS idx_ingredients_name_trgm ON ingredients USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ingredients_normalized_trgm ON ingredients USING gin(normalized_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ingredients_name_fts ON ingredients USING gin(name_tsv);

-- 5. Create trigger to auto-update normalized_name on ingredient insert/update
CREATE OR REPLACE FUNCTION update_ingredient_normalized_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.normalized_name := lower(regexp_replace(NEW.name, '[^a-zäöüßA-ZÄÖÜ0-9 ]', '', 'g'));
    NEW.name_tsv := to_tsvector('german', NEW.name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ingredient_normalize ON ingredients;
CREATE TRIGGER trg_ingredient_normalize
    BEFORE INSERT OR UPDATE OF name ON ingredients
    FOR EACH ROW EXECUTE FUNCTION update_ingredient_normalized_name();

-- 6. Helper function: Calculate word overlap score
-- Returns percentage of ingredient words found in product name (0.0 to 1.0)
CREATE OR REPLACE FUNCTION word_match_score(ingredient_normalized TEXT, product_normalized TEXT)
RETURNS FLOAT AS $$
DECLARE
    ing_words TEXT[];
    match_count INT := 0;
    total_words INT;
    word TEXT;
BEGIN
    -- Split ingredient into words (filter empty strings)
    ing_words := array_remove(string_to_array(ingredient_normalized, ' '), '');
    total_words := array_length(ing_words, 1);
    
    IF total_words IS NULL OR total_words = 0 THEN
        RETURN 0.0;
    END IF;
    
    -- Count how many ingredient words appear in product name
    FOREACH word IN ARRAY ing_words LOOP
        IF length(word) >= 3 AND product_normalized LIKE '%' || word || '%' THEN
            match_count := match_count + 1;
        ELSIF length(word) < 3 AND product_normalized ~ ('\m' || word || '\M') THEN
            -- For short words, use word boundary regex to avoid false positives
            match_count := match_count + 1;
        END IF;
    END LOOP;
    
    RETURN match_count::FLOAT / total_words::FLOAT;
END;
$$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;

-- 7. Helper function: Check if ingredient is substring of product (high confidence match)
CREATE OR REPLACE FUNCTION is_substring_match(ingredient_normalized TEXT, product_normalized TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN product_normalized LIKE '%' || ingredient_normalized || '%';
END;
$$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;

-- 8. Create function to refresh the unique_products view (call after product sync)
CREATE OR REPLACE FUNCTION refresh_unique_products()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY unique_products;
END;
$$ LANGUAGE plpgsql;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP FUNCTION IF EXISTS refresh_unique_products();
DROP FUNCTION IF EXISTS is_substring_match(TEXT, TEXT);
DROP FUNCTION IF EXISTS word_match_score(TEXT, TEXT);
DROP TRIGGER IF EXISTS trg_ingredient_normalize ON ingredients;
DROP FUNCTION IF EXISTS update_ingredient_normalized_name();
DROP INDEX IF EXISTS idx_ingredients_name_fts;
DROP INDEX IF EXISTS idx_ingredients_normalized_trgm;
DROP INDEX IF EXISTS idx_ingredients_name_trgm;
ALTER TABLE ingredients DROP COLUMN IF EXISTS name_tsv;
ALTER TABLE ingredients DROP COLUMN IF EXISTS normalized_name;
DROP MATERIALIZED VIEW IF EXISTS unique_products;
-- Note: We don't drop pg_trgm as other parts of the system might use it
-- +goose StatementEnd
