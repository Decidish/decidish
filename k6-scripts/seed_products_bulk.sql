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

-- Step 2: Hardcoded market IDs from the database
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

-- Show count
SELECT COUNT(*) as target_market_count FROM target_markets;

-- Step 2b: Insert dummy addresses for markets that don't exist yet
INSERT INTO addresses (id, street, zip_code, city, latitude, longitude)
SELECT 
    tm.market_id as id,  -- Use market_id as address_id for simplicity
    'Load Test Street 1' as street,
    '00000' as zip_code,
    'Load Test City' as city,
    52.5200 as latitude,
    13.4050 as longitude
FROM target_markets tm
WHERE NOT EXISTS (SELECT 1 FROM addresses a WHERE a.id = tm.market_id)
ON CONFLICT (id) DO NOTHING;

-- Step 2c: Insert markets that don't exist yet with dummy values
INSERT INTO markets (id, name, address_id, last_updated)
SELECT 
    tm.market_id as id,
    'REWE Load Test Market ' || tm.market_id as name,
    tm.market_id as address_id,  -- References the address we just created
    NOW() as last_updated
FROM target_markets tm
WHERE NOT EXISTS (SELECT 1 FROM markets m WHERE m.id = tm.market_id)
ON CONFLICT (id) DO NOTHING;

SELECT 'Markets ensured:' as status, COUNT(*) as market_count FROM markets WHERE id IN (SELECT market_id FROM target_markets);

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
