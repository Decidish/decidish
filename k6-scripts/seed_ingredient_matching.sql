-- =============================================================================
-- Ingredient-Product Matching Script (Multi-Tier)
-- =============================================================================
-- This script creates ingredient-product mappings using the SAME multi-tier
-- matching algorithm as IngredientProductRepository.findGenericMatches()
--
-- Run with: docker exec dev_backend_postgres psql -U user -d decidish -f /scripts/seed_ingredient_matching.sql
-- =============================================================================

\echo '=========================================='
\echo 'Starting Ingredient-Product Matching'
\echo '=========================================='

-- Enable trigram extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CRITICAL: Refresh the unique_products materialized view to include all products
\echo ''
\echo 'Step 1: Refreshing unique_products materialized view...'
REFRESH MATERIALIZED VIEW unique_products;

\echo 'Products available for matching:'
SELECT COUNT(*) as unique_product_count FROM unique_products;

-- Update ingredients normalized_name if not set
\echo ''
\echo 'Step 2: Ensuring ingredients have normalized names...'
UPDATE ingredients 
SET normalized_name = lower(regexp_replace(name, '[^a-zäöüßA-ZÄÖÜ0-9 ]', '', 'g')),
    name_tsv = to_tsvector('german', name)
WHERE normalized_name IS NULL OR normalized_name = '';

-- Get all ingredients that need mapping
CREATE TEMP TABLE ingredients_to_map AS
SELECT id, name, normalized_name
FROM ingredients
WHERE normalized_name IS NOT NULL AND normalized_name <> '';

\echo 'Total ingredients to process:'
SELECT COUNT(*) as ingredient_count FROM ingredients_to_map;

-- =============================================================================
-- MULTI-TIER MATCHING
-- =============================================================================
-- Same logic as findGenericMatches in IngredientProductRepository.java:
-- Tier 1: Exact substring matches (confidence 0.95-1.0)
-- Tier 2: Word containment matches (confidence 0.70-0.94)
-- Tier 3: Full-text search matches (confidence 0.50-0.69)
-- Tier 4: Trigram similarity fallback (confidence 0.30-0.49)
-- =============================================================================

\echo ''
\echo 'Step 3: Running multi-tier matching (this may take a few minutes)...'

INSERT INTO ingredient_product (ingredient_id, product_id, confidence)
WITH 
-- Tier 1: Exact substring matches (highest confidence)
substring_matches AS (
    SELECT 
        i.id AS ingredient_id,
        p.rewe_id,
        0.95 + (0.05 * (length(i.normalized_name)::float / GREATEST(length(p.normalized_name), 1)::float)) AS confidence
    FROM ingredients_to_map i
    JOIN unique_products p ON p.normalized_name LIKE '%' || i.normalized_name || '%'
    WHERE length(i.normalized_name) >= 3
),

-- Tier 2: Word containment matches
word_matches AS (
    SELECT 
        i.id AS ingredient_id,
        p.rewe_id,
        0.70 + (0.24 * word_match_score(i.normalized_name, p.normalized_name)) AS confidence
    FROM ingredients_to_map i
    CROSS JOIN unique_products p
    WHERE word_match_score(i.normalized_name, p.normalized_name) >= 0.5
),

-- Tier 3: Full-text search matches
fts_matches AS (
    SELECT 
        i.id AS ingredient_id,
        p.rewe_id,
        0.50 + (0.19 * LEAST(ts_rank(p.name_tsv, plainto_tsquery('german', i.name)), 1.0)) AS confidence
    FROM ingredients_to_map i
    CROSS JOIN unique_products p
    WHERE p.name_tsv @@ plainto_tsquery('german', i.name)
),

-- Tier 4: Trigram similarity fallback (threshold 0.2)
trigram_matches AS (
    SELECT 
        i.id AS ingredient_id,
        p.rewe_id,
        0.30 + (0.19 * similarity(i.normalized_name, p.normalized_name)) AS confidence
    FROM ingredients_to_map i
    CROSS JOIN unique_products p
    WHERE similarity(i.normalized_name, p.normalized_name) > 0.2
),

-- Combine all tiers and deduplicate (keep highest confidence per ingredient-product pair)
all_matches AS (
    SELECT ingredient_id, rewe_id, MAX(confidence) as confidence
    FROM (
        SELECT ingredient_id, rewe_id, confidence FROM substring_matches
        UNION ALL
        SELECT ingredient_id, rewe_id, confidence FROM word_matches
        UNION ALL
        SELECT ingredient_id, rewe_id, confidence FROM fts_matches
        UNION ALL
        SELECT ingredient_id, rewe_id, confidence FROM trigram_matches
    ) combined
    GROUP BY ingredient_id, rewe_id
),

-- Rank and limit to top 3 matches per ingredient
ranked_matches AS (
    SELECT 
        ingredient_id,
        rewe_id,
        confidence,
        ROW_NUMBER() OVER (
            PARTITION BY ingredient_id 
            ORDER BY confidence DESC
        ) AS rn
    FROM all_matches
)

SELECT 
    ingredient_id,
    rewe_id AS product_id,
    confidence::real
FROM ranked_matches
WHERE rn <= 3
ON CONFLICT (ingredient_id, product_id) DO UPDATE SET confidence = EXCLUDED.confidence;

\echo 'Multi-tier matching complete!'

-- =============================================================================
-- SUMMARY
-- =============================================================================
\echo ''
\echo '=========================================='
\echo 'Matching Summary'
\echo '=========================================='

\echo ''
\echo 'Final database state:'
SELECT 
    'Total Ingredients' as metric, COUNT(*)::text as value FROM ingredients
UNION ALL
SELECT 'Mapped Ingredients', COUNT(DISTINCT ingredient_id)::text FROM ingredient_product
UNION ALL
SELECT 'Unmapped Ingredients', 
    (SELECT COUNT(*) FROM ingredients WHERE id NOT IN (SELECT ingredient_id FROM ingredient_product))::text
UNION ALL
SELECT 'Unique Products', (SELECT COUNT(*) FROM unique_products)::text
UNION ALL
SELECT 'Total Mappings', COUNT(*)::text FROM ingredient_product;

\echo ''
\echo 'Coverage percentage:'
SELECT 
    ROUND(
        (SELECT COUNT(DISTINCT ingredient_id) FROM ingredient_product)::numeric / 
        NULLIF((SELECT COUNT(*) FROM ingredients), 0)::numeric * 100, 2
    ) as mapped_percentage;

\echo ''
\echo 'Matches by confidence tier:'
SELECT 
    CASE 
        WHEN confidence >= 0.95 THEN 'Tier 1 (Substring 0.95-1.0)'
        WHEN confidence >= 0.70 THEN 'Tier 2 (Word Match 0.70-0.94)'
        WHEN confidence >= 0.50 THEN 'Tier 3 (Full-text 0.50-0.69)'
        WHEN confidence >= 0.30 THEN 'Tier 4 (Trigram 0.30-0.49)'
        ELSE 'Other (<0.30)'
    END as tier,
    COUNT(*) as match_count,
    COUNT(DISTINCT ingredient_id) as ingredients_matched
FROM ingredient_product
GROUP BY 1
ORDER BY 1;

\echo ''
\echo 'Sample unmapped ingredients (if any):'
SELECT id, name 
FROM ingredients 
WHERE id NOT IN (SELECT ingredient_id FROM ingredient_product)
ORDER BY RANDOM()
LIMIT 10;

-- Cleanup temp tables
DROP TABLE IF EXISTS ingredients_to_map;

\echo ''
\echo '=========================================='
\echo 'Ingredient Matching Complete!'
\echo '=========================================='
