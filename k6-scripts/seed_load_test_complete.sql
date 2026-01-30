-- =============================================================================
-- Complete Load Test Database Seeding Script
-- =============================================================================
-- This script prepares the database for load testing by:
-- 1. Seeding products with consistent rewe_id across all markets
-- 2. Creating ingredient-product mappings for ~95% of ingredients
-- 3. Leaving ~5% unmapped to test API fallback (realistic scenario)
--
-- Run with: docker exec dev_backend_postgres psql -U user -d decidish -f /scripts/seed_load_test_complete.sql
-- =============================================================================

\echo '=========================================='
\echo 'Starting Complete Load Test Database Seed'
\echo '=========================================='

-- =============================================================================
-- PHASE 1: SEED PRODUCTS FOR ALL MARKETS
-- =============================================================================
\echo ''
\echo 'PHASE 1: Seeding products for all markets...'

-- Create product templates (same products will have same rewe_id across markets)
CREATE TEMP TABLE product_templates (
    term TEXT,
    suffix TEXT,
    is_organic BOOLEAN,
    category TEXT
);

INSERT INTO product_templates (term, suffix, is_organic, category) VALUES
-- Vegetables (matching load test search terms)
('Tomaten', 'Bio', true, 'vegetables'), ('Tomaten', 'Frisch', false, 'vegetables'), ('Tomaten', 'Premium', false, 'vegetables'),
('Kartoffeln', 'Bio', true, 'vegetables'), ('Kartoffeln', 'Festkochend', false, 'vegetables'), ('Kartoffeln', 'Mehlig', false, 'vegetables'),
('Zwiebeln', 'Bio', true, 'vegetables'), ('Zwiebeln', 'Rot', false, 'vegetables'), ('Zwiebeln', 'Weiß', false, 'vegetables'),
('Knoblauch', 'Bio', true, 'vegetables'), ('Knoblauch', 'Frisch', false, 'vegetables'), ('Knoblauch', 'Geschält', false, 'vegetables'),
('Paprika', 'Bio Rot', true, 'vegetables'), ('Paprika', 'Gelb', false, 'vegetables'), ('Paprika', 'Grün', false, 'vegetables'),
('Salat', 'Bio Kopfsalat', true, 'vegetables'), ('Salat', 'Eisberg', false, 'vegetables'), ('Salat', 'Rucola', false, 'vegetables'),
('Gurke', 'Bio', true, 'vegetables'), ('Gurke', 'Salatgurke', false, 'vegetables'), ('Gurke', 'Mini', false, 'vegetables'),
('Brokkoli', 'Bio', true, 'vegetables'), ('Brokkoli', 'Frisch', false, 'vegetables'), ('Brokkoli', 'TK', false, 'vegetables'),
('Spinat', 'Bio Blattspinat', true, 'vegetables'), ('Spinat', 'Rahmspinat', false, 'vegetables'), ('Spinat', 'TK', false, 'vegetables'),
('Champignons', 'Bio', true, 'vegetables'), ('Champignons', 'Weiß', false, 'vegetables'), ('Champignons', 'Braun', false, 'vegetables'),
-- Meat & Fish
('Hähnchen', 'Bio Brust', true, 'meat'), ('Hähnchen', 'Schenkel', false, 'meat'), ('Hähnchen', 'Filet', false, 'meat'),
('Haehnchen', 'Bio Brust', true, 'meat'), ('Haehnchen', 'Schenkel', false, 'meat'), ('Haehnchen', 'Filet', false, 'meat'),
('Rindfleisch', 'Bio Hackfleisch', true, 'meat'), ('Rindfleisch', 'Gulasch', false, 'meat'), ('Rindfleisch', 'Steak', false, 'meat'),
('Lachs', 'Bio Filet', true, 'fish'), ('Lachs', 'Räucherlachs', false, 'fish'), ('Lachs', 'TK Filet', false, 'fish'),
('Garnelen', 'Bio', true, 'fish'), ('Garnelen', 'TK', false, 'fish'), ('Garnelen', 'Gekocht', false, 'fish'),
('Käse', 'Bio Gouda', true, 'dairy'), ('Käse', 'Emmentaler', false, 'dairy'), ('Käse', 'Mozzarella', false, 'dairy'),
('Kaese', 'Bio Gouda', true, 'dairy'), ('Kaese', 'Emmentaler', false, 'dairy'), ('Kaese', 'Mozzarella', false, 'dairy'),
-- Dairy
('Milch', 'Bio Vollmilch', true, 'dairy'), ('Milch', 'Fettarm 1.5%', false, 'dairy'), ('Milch', 'Laktosefrei', false, 'dairy'),
('Butter', 'Bio', true, 'dairy'), ('Butter', 'Deutsche Markenbutter', false, 'dairy'), ('Butter', 'Süßrahm', false, 'dairy'),
('Eier', 'Bio Freiland', true, 'dairy'), ('Eier', 'Bodenhaltung', false, 'dairy'), ('Eier', 'Freiland', false, 'dairy'),
('Sahne', 'Bio Schlagsahne', true, 'dairy'), ('Sahne', 'Kochsahne', false, 'dairy'), ('Sahne', 'Saure Sahne', false, 'dairy'),
('Joghurt', 'Bio Naturjoghurt', true, 'dairy'), ('Joghurt', 'Griechisch', false, 'dairy'), ('Joghurt', 'Frucht', false, 'dairy'),
-- Pantry
('Brot', 'Bio Vollkorn', true, 'bakery'), ('Brot', 'Weizen', false, 'bakery'), ('Brot', 'Roggen', false, 'bakery'),
('Nudeln', 'Bio Spaghetti', true, 'pantry'), ('Nudeln', 'Penne', false, 'pantry'), ('Nudeln', 'Fusilli', false, 'pantry'),
('Reis', 'Bio Basmati', true, 'pantry'), ('Reis', 'Langkorn', false, 'pantry'), ('Reis', 'Jasmin', false, 'pantry'),
('Mehl', 'Bio Weizenmehl', true, 'pantry'), ('Mehl', 'Type 405', false, 'pantry'), ('Mehl', 'Vollkorn', false, 'pantry'),
('Zucker', 'Bio Rohrzucker', true, 'pantry'), ('Zucker', 'Raffiniert', false, 'pantry'), ('Zucker', 'Puderzucker', false, 'pantry'),
-- Fruits
('Äpfel', 'Bio Elstar', true, 'fruits'), ('Äpfel', 'Braeburn', false, 'fruits'), ('Äpfel', 'Pink Lady', false, 'fruits'),
('Aepfel', 'Bio Elstar', true, 'fruits'), ('Aepfel', 'Braeburn', false, 'fruits'), ('Aepfel', 'Pink Lady', false, 'fruits'),
('Bananen', 'Bio', true, 'fruits'), ('Bananen', 'Chiquita', false, 'fruits'), ('Bananen', 'Fair Trade', false, 'fruits'),
('Orangen', 'Bio', true, 'fruits'), ('Orangen', 'Navel', false, 'fruits'), ('Orangen', 'Saft', false, 'fruits'),
('Zitronen', 'Bio', true, 'fruits'), ('Zitronen', 'Unbehandelt', false, 'fruits'), ('Zitronen', 'Saft', false, 'fruits'),
('Erdbeeren', 'Bio', true, 'fruits'), ('Erdbeeren', 'Frisch', false, 'fruits'), ('Erdbeeren', 'TK', false, 'fruits'),
-- Additional common ingredients (for ingredient mappings)
('Öl', 'Bio Olivenöl', true, 'pantry'), ('Öl', 'Rapsöl', false, 'pantry'), ('Öl', 'Sonnenblumenöl', false, 'pantry'),
('Olivenöl', 'Bio Extra Vergine', true, 'pantry'), ('Olivenöl', 'Nativ', false, 'pantry'),
('Rapsöl', 'Bio', true, 'pantry'), ('Rapsöl', 'Raffiniert', false, 'pantry'),
('Salz', 'Bio Meersalz', true, 'pantry'), ('Salz', 'Jodsalz', false, 'pantry'), ('Salz', 'Himalaya', false, 'pantry'),
('Pfeffer', 'Bio Schwarz', true, 'pantry'), ('Pfeffer', 'Gemahlen', false, 'pantry'), ('Pfeffer', 'Bunt', false, 'pantry'),
('Senf', 'Bio', true, 'pantry'), ('Senf', 'Mittelscharf', false, 'pantry'), ('Senf', 'Dijon', false, 'pantry'),
('Essig', 'Bio Apfelessig', true, 'pantry'), ('Essig', 'Balsamico', false, 'pantry'), ('Essig', 'Weißwein', false, 'pantry'),
('Honig', 'Bio Blütenhonig', true, 'pantry'), ('Honig', 'Akazie', false, 'pantry'), ('Honig', 'Wald', false, 'pantry'),
('Petersilie', 'Bio Frisch', true, 'herbs'), ('Petersilie', 'TK', false, 'herbs'), ('Petersilie', 'Getrocknet', false, 'herbs'),
('Basilikum', 'Bio Frisch', true, 'herbs'), ('Basilikum', 'TK', false, 'herbs'), ('Basilikum', 'Getrocknet', false, 'herbs'),
('Thymian', 'Bio Frisch', true, 'herbs'), ('Thymian', 'Getrocknet', false, 'herbs'),
('Rosmarin', 'Bio Frisch', true, 'herbs'), ('Rosmarin', 'Getrocknet', false, 'herbs'),
('Oregano', 'Bio', true, 'herbs'), ('Oregano', 'Getrocknet', false, 'herbs'),
('Curry', 'Bio', true, 'spices'), ('Curry', 'Madras', false, 'spices'), ('Curry', 'Mild', false, 'spices'),
('Paprikapulver', 'Bio Edelsüß', true, 'spices'), ('Paprikapulver', 'Scharf', false, 'spices'),
('Zimt', 'Bio', true, 'spices'), ('Zimt', 'Gemahlen', false, 'spices'),
('Ingwer', 'Bio Frisch', true, 'vegetables'), ('Ingwer', 'Gemahlen', false, 'spices'),
('Kokosmilch', 'Bio', true, 'pantry'), ('Kokosmilch', 'Light', false, 'pantry'),
('Sojasauce', 'Bio', true, 'pantry'), ('Sojasauce', 'Kikkoman', false, 'pantry'),
('Tofu', 'Bio Natur', true, 'protein'), ('Tofu', 'Geräuchert', false, 'protein'), ('Tofu', 'Seidentofu', false, 'protein'),
('Linsen', 'Bio Rote', true, 'pantry'), ('Linsen', 'Braune', false, 'pantry'), ('Linsen', 'Beluga', false, 'pantry'),
('Kichererbsen', 'Bio', true, 'pantry'), ('Kichererbsen', 'Dose', false, 'pantry'),
('Bohnen', 'Bio Kidneybohnen', true, 'pantry'), ('Bohnen', 'Weiße Bohnen', false, 'pantry'),
('Passierte Tomaten', 'Bio', true, 'pantry'), ('Passierte Tomaten', 'REWE Beste Wahl', false, 'pantry'),
('Tomatenmark', 'Bio', true, 'pantry'), ('Tomatenmark', '3-fach konzentriert', false, 'pantry'),
('Sahnejoghurt', 'Bio', true, 'dairy'), ('Sahnejoghurt', 'Natur', false, 'dairy'),
('Frischkäse', 'Bio', true, 'dairy'), ('Frischkäse', 'Philadelphia', false, 'dairy'),
('Parmesan', 'Bio', true, 'dairy'), ('Parmesan', 'Grana Padano', false, 'dairy'),
('Schinken', 'Bio', true, 'meat'), ('Schinken', 'Kochschinken', false, 'meat'), ('Schinken', 'Serrano', false, 'meat'),
('Speck', 'Bio', true, 'meat'), ('Speck', 'Frühstücksspeck', false, 'meat'), ('Speck', 'Bauchspeck', false, 'meat'),
('Hackfleisch', 'Bio Rind', true, 'meat'), ('Hackfleisch', 'Gemischt', false, 'meat'), ('Hackfleisch', 'Schwein', false, 'meat'),
('Schlagsahne', 'Bio', true, 'dairy'), ('Schlagsahne', '30%', false, 'dairy'),
('Créme fraîche', 'Bio', true, 'dairy'), ('Créme fraîche', 'Leicht', false, 'dairy'),
('Quark', 'Bio Magerquark', true, 'dairy'), ('Quark', 'Sahnequark', false, 'dairy'),
('Zucchini', 'Bio', true, 'vegetables'), ('Zucchini', 'Frisch', false, 'vegetables'),
('Aubergine', 'Bio', true, 'vegetables'), ('Aubergine', 'Frisch', false, 'vegetables'),
('Möhren', 'Bio', true, 'vegetables'), ('Möhren', 'Bundmöhren', false, 'vegetables'), ('Möhren', 'Baby', false, 'vegetables'),
('Karotten', 'Bio', true, 'vegetables'), ('Karotten', 'Frisch', false, 'vegetables'),
('Lauch', 'Bio', true, 'vegetables'), ('Lauch', 'Frisch', false, 'vegetables'),
('Sellerie', 'Bio Stangensellerie', true, 'vegetables'), ('Sellerie', 'Knollensellerie', false, 'vegetables'),
('Blumenkohl', 'Bio', true, 'vegetables'), ('Blumenkohl', 'Frisch', false, 'vegetables'),
('Rosenkohl', 'Bio', true, 'vegetables'), ('Rosenkohl', 'TK', false, 'vegetables'),
('Erbsen', 'Bio TK', true, 'vegetables'), ('Erbsen', 'TK', false, 'vegetables'),
('Mais', 'Bio Dose', true, 'vegetables'), ('Mais', 'TK', false, 'vegetables'),
('Avocado', 'Bio', true, 'fruits'), ('Avocado', 'Hass', false, 'fruits'),
('Limetten', 'Bio', true, 'fruits'), ('Limetten', 'Frisch', false, 'fruits'),
('Heidelbeeren', 'Bio', true, 'fruits'), ('Heidelbeeren', 'Frisch', false, 'fruits'),
('Himbeeren', 'Bio', true, 'fruits'), ('Himbeeren', 'TK', false, 'fruits'),
('Trauben', 'Bio', true, 'fruits'), ('Trauben', 'Kernlos', false, 'fruits'),
('Mango', 'Bio', true, 'fruits'), ('Mango', 'Frisch', false, 'fruits'),
('Ananas', 'Bio', true, 'fruits'), ('Ananas', 'Frisch', false, 'fruits');

\echo 'Created product templates'
SELECT COUNT(*) as template_count FROM product_templates;

-- Hardcoded market IDs from the database
CREATE TEMP TABLE target_markets (market_id BIGINT);

INSERT INTO target_markets (market_id) VALUES
(5), (300), (304), (306), (307), (25817), (25840), (25846), (201608), (201612),
(230493), (230494), (240061), (240168), (240185), (240197), (240198), (240238), (240312), (240510),
(240533), (240574), (240661), (240805), (241075), (241093), (241100), (241101), (241105), (241108),
(241109), (241112), (241123), (241179), (241180), (241182), (241191), (241197), (241198), (250347),
(250370), (260008), (320160), (320170), (320191), (320195), (320547), (320828), (320837), (320970),
(321021), (321032), (410563), (410717), (430461), (431001), (431022), (431033), (431044), (431067),
(431082), (433142), (440327), (440353), (440383), (440418), (440460), (440470), (440486), (440490),
(440491), (440497), (440600), (440605), (440669), (440752), (440753), (440838), (441070), (441095),
(441702), (461741), (461781), (461799), (461897), (531054), (531071), (531076), (531077), (531104),
(531138), (531384), (531385), (531429), (531458), (533570), (540181), (540184), (540203), (540276),
(540291), (540311), (540333), (540350), (540502), (540503), (540523), (540528), (540557), (540638),
(540683), (540745), (540807), (540883), (540902), (540935), (541755), (541793), (541813), (561188),
(561228), (562037), (562045), (562047), (562271), (562345), (565005), (565077), (565081), (565157),
(565204), (565214), (565236), (565264), (565283), (565339), (565393), (565432), (565433), (565467),
(565537), (565571), (565578), (565660), (810852), (830552), (830982), (831002), (831010), (831057),
(831076), (831083), (831084), (831094), (831297), (833717), (840003), (840084), (840128), (840183),
(840185), (840187), (840192), (840202), (840205), (840209), (840229), (840240), (840241), (840276),
(840282), (840297), (840346), (840377), (840379), (840401), (840422), (840661), (840672), (840838),
(840913), (840959), (861769), (861990), (862027), (865773), (865788), (865789), (865822), (865888),
(865889), (1100128), (1350156), (1350161), (1356300), (1356308), (1466906), (1469089), (1469130), (1469250),
(1469318), (1469323), (1470072), (1471343), (1478434), (1478520), (1658230), (1701701), (1762807), (1763118),
(1763161), (1763448), (1763496), (1763545), (1763938), (1765177), (1765235), (1765242), (1765255), (1765287),
(1765297), (1765506), (1765740), (1765750), (1765979), (1765993), (1766001), (1766005), (1766112), (1766115),
(1766160), (1910167), (1931088), (1931089), (1931091), (1931146), (1931258), (1931419), (1931450), (1931595),
(1931630), (1931651), (1940016), (1940032), (1940069), (1940104), (1940106), (1940108), (1940119), (1940135),
(1940163), (1940200), (1940205), (1940208), (1940234), (1940286), (1940295), (1940364), (1940413), (1940422),
(1940432), (1940446), (1940449), (1940450), (1940466), (1940491), (2800016), (3200008), (3700019), (4031024),
(4033296), (4040034), (4040138), (4040174), (4040200), (4040274), (4040361), (4040370), (4040385), (4040426),
(4040430), (4040441), (4040455), (4040475), (4040493), (4040502), (4040503), (4040710), (4040712), (4040719),
(4040722), (5400006), (5500125), (7000016), (8000017), (8321066), (8321228), (8321323), (8321327), (8534187),
(8534431), (8534443), (8534516), (8534628), (8534801), (8534806), (8534810), (8536918), (8537545), (8539501),
(8542505), (8545503), (8546536), (8547534), (8549523), (9067612), (9067637);

\echo 'Target markets for seeding:'
SELECT COUNT(*) as market_count FROM target_markets;

-- Insert dummy addresses for markets that don't exist yet
\echo 'Creating dummy addresses for missing markets...'
INSERT INTO addresses (id, street, zip_code, city, latitude, longitude)
SELECT 
    tm.market_id as id,
    'Load Test Street 1' as street,
    '00000' as zip_code,
    'Load Test City' as city,
    52.5200 as latitude,
    13.4050 as longitude
FROM target_markets tm
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.id = tm.market_id)
ON CONFLICT (id) DO NOTHING;

-- Insert markets that don't exist yet with dummy values
\echo 'Creating missing markets with dummy values...'
INSERT INTO markets (id, name, address_id, last_updated)
SELECT 
    tm.market_id as id,
    'REWE Load Test Market ' || tm.market_id as name,
    tm.market_id as address_id,
    NOW() as last_updated
FROM target_markets tm
WHERE NOT EXISTS (SELECT 1 FROM markets m WHERE m.id = tm.market_id)
ON CONFLICT (id) DO NOTHING;

\echo 'Markets ensured in database:'
SELECT COUNT(*) as market_count FROM markets WHERE id IN (SELECT market_id FROM target_markets);

-- Insert products: SAME rewe_id for same product across ALL markets
INSERT INTO products (
    rewe_id, name, market_id, price, grammage, last_updated, 
    is_organic, is_vegetarian, is_vegan, is_bulky_good, is_dairy_free, 
    is_gluten_free, is_biocide, is_age_restricted, is_regional, 
    is_new, is_lowest_price, is_tobacco
)
SELECT 
    ABS(hashtext(pt.term || pt.suffix)) as rewe_id,
    pt.term || ' ' || pt.suffix || ' 500g' as name,
    tm.market_id,
    199 + (ABS(hashtext(pt.term || tm.market_id::text)) % 800) as price,
    '500g' as grammage,
    NOW() as last_updated,
    pt.is_organic,
    CASE WHEN pt.category IN ('meat', 'fish') THEN false ELSE true END as is_vegetarian,
    CASE WHEN pt.category IN ('meat', 'fish', 'dairy') THEN false ELSE true END as is_vegan,
    false as is_bulky_good,
    CASE WHEN pt.category = 'dairy' THEN false ELSE true END as is_dairy_free,
    CASE WHEN pt.category IN ('bakery', 'pantry') AND pt.term IN ('Brot', 'Nudeln', 'Mehl') THEN false ELSE true END as is_gluten_free,
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

\echo 'Products seeded:'
SELECT 
    COUNT(*) as total_products,
    COUNT(DISTINCT market_id) as markets_with_products,
    COUNT(DISTINCT rewe_id) as unique_products
FROM products
WHERE market_id IN (SELECT market_id FROM target_markets);

-- Verify rewe_id consistency
\echo 'Verifying rewe_id consistency (products available in most markets):'
SELECT 
    rewe_id,
    COUNT(DISTINCT market_id) as market_count,
    MIN(name) as product_name
FROM products
WHERE market_id IN (SELECT market_id FROM target_markets)
GROUP BY rewe_id
ORDER BY market_count DESC
LIMIT 10;

-- =============================================================================
-- PHASE 2: CREATE INGREDIENT-PRODUCT MAPPINGS (~95% coverage)
-- =============================================================================
\echo ''
\echo 'PHASE 2: Creating ingredient-product mappings (95% coverage)...'

-- Enable trigram extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Get rewe_ids that exist in ALL target markets (most reliable for mappings)
CREATE TEMP TABLE universal_products AS
SELECT rewe_id, MIN(name) as product_name
FROM products
WHERE market_id IN (SELECT market_id FROM target_markets)
GROUP BY rewe_id
HAVING COUNT(DISTINCT market_id) = (SELECT COUNT(*) FROM target_markets);

\echo 'Universal products (available in all target markets):'
SELECT COUNT(*) as universal_product_count FROM universal_products;

-- Delete old mappings that don't reference universal products (cleanup)
-- This ensures our mappings will work across all markets
DELETE FROM ingredient_product 
WHERE product_id NOT IN (SELECT rewe_id FROM universal_products);

\echo 'Cleaned up old non-universal mappings'

-- Create mappings for ~95% of ingredients
-- Use row number to skip every ~20th ingredient (5%)
CREATE TEMP TABLE ingredients_to_map AS
SELECT id, name, row_number() OVER (ORDER BY id) as rn
FROM ingredients
WHERE NOT EXISTS (
    SELECT 1 FROM ingredient_product ip 
    WHERE ip.ingredient_id = ingredients.id
    AND ip.product_id IN (SELECT rewe_id FROM universal_products)
);

\echo 'Unmapped ingredients:'
SELECT COUNT(*) as unmapped_count FROM ingredients_to_map;

-- Map 95% of ingredients (skip those where rn % 20 = 0)
INSERT INTO ingredient_product (ingredient_id, product_id, confidence)
SELECT DISTINCT ON (itm.id, up.rewe_id)
    itm.id as ingredient_id,
    up.rewe_id as product_id,
    GREATEST(0.6, LEAST(0.95, similarity(LOWER(itm.name), LOWER(up.product_name)))) as confidence
FROM ingredients_to_map itm
CROSS JOIN LATERAL (
    SELECT rewe_id, product_name
    FROM universal_products up
    WHERE similarity(LOWER(itm.name), LOWER(up.product_name)) > 0.15
       OR LOWER(up.product_name) LIKE '%' || LOWER(SUBSTRING(itm.name FROM 1 FOR 4)) || '%'
    ORDER BY similarity(LOWER(itm.name), LOWER(up.product_name)) DESC
    LIMIT 3
) up
WHERE itm.rn % 20 != 0  -- Skip ~5% of ingredients (every 20th)
ON CONFLICT (ingredient_id, product_id) DO UPDATE SET confidence = EXCLUDED.confidence;

-- For ingredients still without mappings (except the 5%), add generic fallback
INSERT INTO ingredient_product (ingredient_id, product_id, confidence)
SELECT 
    itm.id as ingredient_id,
    (SELECT rewe_id FROM universal_products ORDER BY rewe_id LIMIT 1 OFFSET (itm.id % 50)) as product_id,
    0.5 as confidence
FROM ingredients_to_map itm
WHERE itm.rn % 20 != 0  -- Still skip the 5%
AND NOT EXISTS (
    SELECT 1 FROM ingredient_product ip WHERE ip.ingredient_id = itm.id
)
ON CONFLICT (ingredient_id, product_id) DO NOTHING;

-- =============================================================================
-- PHASE 3: SUMMARY AND VERIFICATION
-- =============================================================================
\echo ''
\echo '=========================================='
\echo 'PHASE 3: Summary and Verification'
\echo '=========================================='

\echo ''
\echo 'Final database state:'
SELECT 
    'Total Ingredients' as metric, COUNT(*)::text as value FROM ingredients
UNION ALL
SELECT 'Mapped Ingredients', COUNT(DISTINCT ingredient_id)::text FROM ingredient_product
UNION ALL
SELECT 'Unmapped Ingredients (5% for API test)', 
    (SELECT COUNT(*) FROM ingredients WHERE id NOT IN (SELECT ingredient_id FROM ingredient_product))::text
UNION ALL
SELECT 'Total Products', COUNT(*)::text FROM products
UNION ALL
SELECT 'Universal Products (all markets)', COUNT(*)::text FROM universal_products
UNION ALL
SELECT 'Total Mappings', COUNT(*)::text FROM ingredient_product;

\echo ''
\echo 'Coverage percentage:'
SELECT 
    ROUND(
        (SELECT COUNT(DISTINCT ingredient_id) FROM ingredient_product)::numeric / 
        (SELECT COUNT(*) FROM ingredients)::numeric * 100, 2
    ) as mapped_percentage,
    ROUND(
        (SELECT COUNT(*) FROM ingredients WHERE id NOT IN (SELECT ingredient_id FROM ingredient_product))::numeric / 
        (SELECT COUNT(*) FROM ingredients)::numeric * 100, 2
    ) as unmapped_percentage_for_api_testing;

\echo ''
\echo 'Sample unmapped ingredients (these will trigger API calls):'
SELECT id, name 
FROM ingredients 
WHERE id NOT IN (SELECT ingredient_id FROM ingredient_product)
ORDER BY RANDOM()
LIMIT 10;

\echo ''
\echo 'Verifying mappings work across all markets:'
SELECT 
    COUNT(DISTINCT ip.ingredient_id) as ingredients_with_universal_mappings
FROM ingredient_product ip
WHERE ip.product_id IN (SELECT rewe_id FROM universal_products);

-- Cleanup temp tables
DROP TABLE IF EXISTS product_templates;
DROP TABLE IF EXISTS target_markets;
DROP TABLE IF EXISTS universal_products;
DROP TABLE IF EXISTS ingredients_to_map;

\echo ''
\echo '=========================================='
\echo 'Load Test Database Seeding Complete!'
\echo '=========================================='
\echo 'Next: Run load test with SHOPPING_API_FALLBACK_ENABLED=true'
\echo '      to verify ~5% API fallback calls work without rate limiting'
\echo '=========================================='
