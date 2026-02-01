-- =============================================================================
-- Seed Ingredient-Product Mappings for Load Testing
-- =============================================================================
-- This script creates ingredient-product mappings to prevent external API calls
-- during shopping list generation in load tests.
-- 
-- Run with: docker exec dev_backend_postgres psql -U user -d decidish -f /scripts/seed_ingredient_mappings.sql
-- =============================================================================

-- Step 1: Create temp table of unmapped ingredients
CREATE TEMP TABLE unmapped_ingredients AS
SELECT DISTINCT i.id, i.name
FROM ingredients i
WHERE NOT EXISTS (
    SELECT 1 FROM ingredient_product ip WHERE ip.ingredient_id = i.id
);

SELECT COUNT(*) as unmapped_count FROM unmapped_ingredients;

-- Step 2: Create mappings using fuzzy name matching
-- For each unmapped ingredient, find products with similar names
-- Uses pg_trgm for trigram similarity matching

-- Enable pg_trgm if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 3: Insert mappings for unmapped ingredients
-- Match each ingredient to up to 3 products based on name similarity
INSERT INTO ingredient_product (ingredient_id, product_id, confidence)
SELECT 
    ui.id as ingredient_id,
    p.rewe_id as product_id,
    GREATEST(0.5, similarity(LOWER(ui.name), LOWER(p.name))) as confidence
FROM unmapped_ingredients ui
CROSS JOIN LATERAL (
    SELECT DISTINCT ON (p.rewe_id) p.rewe_id, p.name
    FROM products p
    WHERE LOWER(p.name) LIKE '%' || LOWER(SUBSTRING(ui.name FROM 1 FOR 4)) || '%'
       OR similarity(LOWER(ui.name), LOWER(p.name)) > 0.2
    ORDER BY p.rewe_id, similarity(LOWER(ui.name), LOWER(p.name)) DESC
    LIMIT 3
) p
ON CONFLICT (ingredient_id, product_id) DO NOTHING;

-- Step 4: For ingredients that still have no matches, create generic fallback mappings
-- This ensures every ingredient has at least one product option
INSERT INTO ingredient_product (ingredient_id, product_id, confidence)
SELECT 
    i.id as ingredient_id,
    (SELECT rewe_id FROM products ORDER BY rewe_id LIMIT 1 OFFSET (i.id % 100)) as product_id,
    0.5 as confidence
FROM ingredients i
WHERE NOT EXISTS (
    SELECT 1 FROM ingredient_product ip WHERE ip.ingredient_id = i.id
)
ON CONFLICT (ingredient_id, product_id) DO NOTHING;

-- Show results
SELECT 
    'Mapping complete!' as status,
    (SELECT COUNT(*) FROM ingredient_product) as total_mappings,
    (SELECT COUNT(DISTINCT ingredient_id) FROM ingredient_product) as mapped_ingredients,
    (SELECT COUNT(*) FROM ingredients) as total_ingredients,
    ROUND(
        (SELECT COUNT(DISTINCT ingredient_id) FROM ingredient_product)::numeric / 
        (SELECT COUNT(*) FROM ingredients)::numeric * 100, 1
    ) as coverage_pct;

-- Cleanup
DROP TABLE unmapped_ingredients;
