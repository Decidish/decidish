-- =============================================================================
-- Bulk Seed Products for Load Testing
-- =============================================================================
-- This SQL seeds products for ALL markets linked to load test postal codes
-- to prevent external REWE API fallback during load testing.
-- 
-- Run with: docker exec dev_backend_postgres psql -U user -d decidish -f /scripts/seed_products_bulk.sql
-- Or copy and paste into psql session
-- =============================================================================

-- Step 1: Create a temporary table with all product templates
CREATE TEMP TABLE product_templates (
    term TEXT,
    suffix TEXT,
    is_organic BOOLEAN,
    variant_id INT
);

INSERT INTO product_templates (term, suffix, is_organic, variant_id) VALUES
-- Vegetables
('Tomaten', 'Bio', true, 1), ('Tomaten', 'Frisch', false, 2), ('Tomaten', 'Premium', false, 3),
('Kartoffeln', 'Bio', true, 1), ('Kartoffeln', 'Frisch', false, 2), ('Kartoffeln', 'Premium', false, 3),
('Zwiebeln', 'Bio', true, 1), ('Zwiebeln', 'Frisch', false, 2), ('Zwiebeln', 'Premium', false, 3),
('Knoblauch', 'Bio', true, 1), ('Knoblauch', 'Frisch', false, 2), ('Knoblauch', 'Premium', false, 3),
('Paprika', 'Bio', true, 1), ('Paprika', 'Frisch', false, 2), ('Paprika', 'Premium', false, 3),
-- Meat & Fish
('Haehnchen', 'Bio', true, 1), ('Haehnchen', 'Frisch', false, 2), ('Haehnchen', 'Premium', false, 3),
('Rindfleisch', 'Bio', true, 1), ('Rindfleisch', 'Frisch', false, 2), ('Rindfleisch', 'Premium', false, 3),
('Lachs', 'Bio', true, 1), ('Lachs', 'Frisch', false, 2), ('Lachs', 'Premium', false, 3),
('Garnelen', 'Bio', true, 1), ('Garnelen', 'Frisch', false, 2), ('Garnelen', 'Premium', false, 3),
('Kaese', 'Bio', true, 1), ('Kaese', 'Frisch', false, 2), ('Kaese', 'Premium', false, 3),
-- Dairy
('Milch', 'Bio', true, 1), ('Milch', 'Frisch', false, 2), ('Milch', 'Premium', false, 3),
('Butter', 'Bio', true, 1), ('Butter', 'Frisch', false, 2), ('Butter', 'Premium', false, 3),
('Eier', 'Bio', true, 1), ('Eier', 'Frisch', false, 2), ('Eier', 'Premium', false, 3),
('Sahne', 'Bio', true, 1), ('Sahne', 'Frisch', false, 2), ('Sahne', 'Premium', false, 3),
('Joghurt', 'Bio', true, 1), ('Joghurt', 'Frisch', false, 2), ('Joghurt', 'Premium', false, 3),
-- Pantry
('Brot', 'Bio', true, 1), ('Brot', 'Frisch', false, 2), ('Brot', 'Premium', false, 3),
('Nudeln', 'Bio', true, 1), ('Nudeln', 'Frisch', false, 2), ('Nudeln', 'Premium', false, 3),
('Reis', 'Bio', true, 1), ('Reis', 'Frisch', false, 2), ('Reis', 'Premium', false, 3),
('Mehl', 'Bio', true, 1), ('Mehl', 'Frisch', false, 2), ('Mehl', 'Premium', false, 3),
('Zucker', 'Bio', true, 1), ('Zucker', 'Frisch', false, 2), ('Zucker', 'Premium', false, 3),
-- Fruits
('Aepfel', 'Bio', true, 1), ('Aepfel', 'Frisch', false, 2), ('Aepfel', 'Premium', false, 3),
('Bananen', 'Bio', true, 1), ('Bananen', 'Frisch', false, 2), ('Bananen', 'Premium', false, 3),
('Orangen', 'Bio', true, 1), ('Orangen', 'Frisch', false, 2), ('Orangen', 'Premium', false, 3),
('Zitronen', 'Bio', true, 1), ('Zitronen', 'Frisch', false, 2), ('Zitronen', 'Premium', false, 3),
('Erdbeeren', 'Bio', true, 1), ('Erdbeeren', 'Frisch', false, 2), ('Erdbeeren', 'Premium', false, 3),
-- More vegetables
('Salat', 'Bio', true, 1), ('Salat', 'Frisch', false, 2), ('Salat', 'Premium', false, 3),
('Gurke', 'Bio', true, 1), ('Gurke', 'Frisch', false, 2), ('Gurke', 'Premium', false, 3),
('Brokkoli', 'Bio', true, 1), ('Brokkoli', 'Frisch', false, 2), ('Brokkoli', 'Premium', false, 3),
('Spinat', 'Bio', true, 1), ('Spinat', 'Frisch', false, 2), ('Spinat', 'Premium', false, 3),
('Champignons', 'Bio', true, 1), ('Champignons', 'Frisch', false, 2), ('Champignons', 'Premium', false, 3);

-- Step 2: Get all markets linked to load test postal codes
CREATE TEMP TABLE target_markets AS
SELECT DISTINCT m.id as market_id
FROM markets m
JOIN search_term_market stm ON m.id = stm.market_id
WHERE stm.search_term IN (
    '10115', '10178', '20095', '80331', '60311', '50667', 
    '70173', '40210', '04109', '01067', '30159', '90402', 
    '28195', '76133', '68159'
);

-- Show count
SELECT COUNT(*) as target_market_count FROM target_markets;

-- Step 3: Bulk insert products for all markets
-- Same product (term + variant) has SAME rewe_id across all markets
-- Each market gets its own row with unique auto-generated id
INSERT INTO products (
    rewe_id, name, market_id, price, grammage, last_updated, 
    is_organic, is_vegetarian, is_vegan, is_bulky_good, is_dairy_free, 
    is_gluten_free, is_biocide, is_age_restricted, is_regional, 
    is_new, is_lowest_price, is_tobacco
)
SELECT 
    -- SAME rewe_id for same product across ALL markets (term + variant only)
    ABS(hashtext(pt.term || pt.suffix)) as rewe_id,
    pt.term || ' ' || pt.suffix || ' 500g' as name,
    tm.market_id,
    199 + (ABS(hashtext(pt.term || tm.market_id::text)) % 800) as price, -- 1.99 to 9.99 (price may vary by market)
    '500g' as grammage,
    NOW() as last_updated,
    pt.is_organic,
    true as is_vegetarian,
    false as is_vegan,
    false as is_bulky_good,
    false as is_dairy_free,
    false as is_gluten_free,
    false as is_biocide,
    false as is_age_restricted,
    false as is_regional,
    false as is_new,
    false as is_lowest_price,
    false as is_tobacco
FROM product_templates pt
CROSS JOIN target_markets tm
WHERE NOT EXISTS (
    SELECT 1 FROM products p 
    WHERE p.market_id = tm.market_id 
    AND p.rewe_id = ABS(hashtext(pt.term || pt.suffix))
);

-- Step 4: Show results
SELECT 
    'Products seeded successfully!' as status,
    COUNT(*) as total_products,
    COUNT(DISTINCT market_id) as markets_with_products
FROM products
WHERE market_id IN (SELECT market_id FROM target_markets);

-- Cleanup
DROP TABLE product_templates;
DROP TABLE target_markets;
