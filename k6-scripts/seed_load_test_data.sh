#!/bin/bash
# =============================================================================
# Seed Database for Load Testing
# =============================================================================
# This script populates the database with data matching the queries in load_test.js
# to avoid hitting external REWE API rate limits during load testing.
#
# Usage: ./seed_load_test_data.sh [OPTIONS]
#   --products-only    Only seed products (skip markets)
#   --markets-only     Only seed markets (skip products)
#   --dry-run          Show SQL without executing
#   --help             Show this help
# =============================================================================

set -e

# Configuration
DB_CONTAINER="${DB_CONTAINER:-dev_backend_postgres}"
DB_USER="${DB_USER:-user}"
DB_NAME="${DB_NAME:-decidish}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
SEED_PRODUCTS=true
SEED_MARKETS=true
DRY_RUN=false

for arg in "$@"; do
    case $arg in
        --products-only)
            SEED_MARKETS=false
            ;;
        --markets-only)
            SEED_PRODUCTS=false
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
        --help)
            head -20 "$0" | tail -17
            exit 0
            ;;
    esac
done

# Postal codes from load_test.js
POSTAL_CODES=(
    "10115"  # Berlin Mitte
    "10178"  # Berlin Alexanderplatz
    "20095"  # Hamburg
    "80331"  # Munich
    "60311"  # Frankfurt
    "50667"  # Cologne
    "70173"  # Stuttgart
    "40210"  # Düsseldorf
    "04109"  # Leipzig
    "01067"  # Dresden
    "30159"  # Hannover
    "90402"  # Nuremberg
    "28195"  # Bremen
    "76133"  # Karlsruhe
    "68159"  # Mannheim
)

# Product search terms from load_test.js (German)
PRODUCT_SEARCH_TERMS=(
    "Tomaten" "Kartoffeln" "Zwiebeln" "Knoblauch" "Paprika"
    "Hähnchen" "Rindfleisch" "Lachs" "Garnelen" "Käse"
    "Milch" "Butter" "Eier" "Sahne" "Joghurt"
    "Brot" "Nudeln" "Reis" "Mehl" "Zucker"
    "Äpfel" "Bananen" "Orangen" "Zitronen" "Erdbeeren"
    "Salat" "Gurke" "Brokkoli" "Spinat" "Champignons"
)

# City mapping for postal codes
declare -A CITY_MAP=(
    ["10115"]="Berlin"
    ["10178"]="Berlin"
    ["20095"]="Hamburg"
    ["80331"]="München"
    ["60311"]="Frankfurt am Main"
    ["50667"]="Köln"
    ["70173"]="Stuttgart"
    ["40210"]="Düsseldorf"
    ["04109"]="Leipzig"
    ["01067"]="Dresden"
    ["30159"]="Hannover"
    ["90402"]="Nürnberg"
    ["28195"]="Bremen"
    ["76133"]="Karlsruhe"
    ["68159"]="Mannheim"
)

# Coordinates for postal codes (approximate city centers)
declare -A LAT_MAP=(
    ["10115"]="52.5323" ["10178"]="52.5219"
    ["20095"]="53.5511" ["80331"]="48.1351"
    ["60311"]="50.1109" ["50667"]="50.9375"
    ["70173"]="48.7758" ["40210"]="51.2277"
    ["04109"]="51.3397" ["01067"]="51.0504"
    ["30159"]="52.3759" ["90402"]="49.4521"
    ["28195"]="53.0793" ["76133"]="49.0069"
    ["68159"]="49.4875"
)

declare -A LON_MAP=(
    ["10115"]="13.3847" ["10178"]="13.4132"
    ["20095"]="9.9937"  ["80331"]="11.5820"
    ["60311"]="8.6821"  ["50667"]="6.9603"
    ["70173"]="9.1829"  ["40210"]="6.7735"
    ["04109"]="12.3731" ["01067"]="13.7373"
    ["30159"]="9.7320"  ["90402"]="11.0767"
    ["28195"]="8.8017"  ["76133"]="8.4037"
    ["68159"]="8.4660"
)

# Function to execute SQL
exec_sql() {
    local sql="$1"
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY-RUN]${NC} $sql"
    else
        docker exec "$DB_CONTAINER" sh -c "psql -U $DB_USER -d $DB_NAME -c \"$sql\"" 2>/dev/null
    fi
}

# Function to execute SQL and return result
query_sql() {
    local sql="$1"
    docker exec "$DB_CONTAINER" sh -c "psql -U $DB_USER -d $DB_NAME -t -c \"$sql\"" 2>/dev/null | tr -d ' '
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Load Test Database Seeder${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check database connection
echo -e "${BLUE}[1/5] Checking database connection...${NC}"
if ! docker exec "$DB_CONTAINER" sh -c "psql -U $DB_USER -d $DB_NAME -c 'SELECT 1'" &>/dev/null; then
    echo -e "${RED}ERROR: Cannot connect to database. Is the container running?${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database connection OK${NC}"

# Show current state
echo ""
echo -e "${BLUE}[2/5] Current database state:${NC}"
MARKET_COUNT=$(query_sql "SELECT COUNT(*) FROM markets")
PRODUCT_COUNT=$(query_sql "SELECT COUNT(*) FROM products")
SEARCH_TERM_COUNT=$(query_sql "SELECT COUNT(DISTINCT search_term) FROM search_term_market")
echo "  - Markets: $MARKET_COUNT"
echo "  - Products: $PRODUCT_COUNT"
echo "  - Postal codes linked: $SEARCH_TERM_COUNT"

# =============================================================================
# SEED MARKETS
# =============================================================================
if [ "$SEED_MARKETS" = true ]; then
    echo ""
    echo -e "${BLUE}[3/5] Seeding markets for ${#POSTAL_CODES[@]} postal codes...${NC}"
    
    MARKETS_CREATED=0
    LINKS_CREATED=0
    
    for plz in "${POSTAL_CODES[@]}"; do
        city="${CITY_MAP[$plz]}"
        lat="${LAT_MAP[$plz]}"
        lon="${LON_MAP[$plz]}"
        
        # Check if this postal code already has markets linked
        existing_count=$(query_sql "SELECT COUNT(*) FROM search_term_market WHERE search_term = '$plz'")
        
        if [ "$existing_count" -gt 0 ]; then
            echo -e "  ${GREEN}✓${NC} $plz ($city) - already has $existing_count markets"
            continue
        fi
        
        echo -e "  ${YELLOW}→${NC} $plz ($city) - creating markets..."
        
        # Generate 3 mock REWE markets per postal code
        for i in 1 2 3; do
            # Generate a unique market ID (using postal code + index as base)
            market_id="${plz}${i}00"
            
            # Small coordinate offset for each market
            offset_lat=$(echo "scale=4; $lat + ($i - 2) * 0.005" | bc)
            offset_lon=$(echo "scale=4; $lon + ($i - 2) * 0.003" | bc)
            
            # Create address first
            exec_sql "
                INSERT INTO addresses (street, zip_code, city, latitude, longitude)
                VALUES ('Musterstraße ${i}', '$plz', '$city', $offset_lat, $offset_lon)
                ON CONFLICT DO NOTHING
                RETURNING id;
            " &>/dev/null
            
            # Get the address ID
            address_id=$(query_sql "
                SELECT id FROM addresses 
                WHERE zip_code = '$plz' AND street = 'Musterstraße ${i}' 
                LIMIT 1
            ")
            
            if [ -n "$address_id" ]; then
                # Create market
                exec_sql "
                    INSERT INTO markets (id, name, address_id, last_updated)
                    VALUES ($market_id, 'REWE Test Market $city $i', $address_id, NOW())
                    ON CONFLICT (id) DO UPDATE SET last_updated = NOW();
                " &>/dev/null
                
                ((MARKETS_CREATED++)) || true
            fi
        done
        
        # Link all markets in this area to the postal code search term
        exec_sql "
            INSERT INTO search_term_market (search_term, market_id, updated_at)
            SELECT '$plz', m.id, NOW()
            FROM markets m
            JOIN addresses a ON m.address_id = a.id
            WHERE a.zip_code = '$plz'
            ON CONFLICT (search_term, market_id) DO UPDATE SET updated_at = NOW();
        " &>/dev/null
        
        links=$(query_sql "SELECT COUNT(*) FROM search_term_market WHERE search_term = '$plz'")
        LINKS_CREATED=$((LINKS_CREATED + links))
        
        echo -e "  ${GREEN}✓${NC} $plz ($city) - created/linked $links markets"
    done
    
    echo -e "${GREEN}✓ Markets seeding complete ($MARKETS_CREATED new markets, $LINKS_CREATED links)${NC}"
else
    echo ""
    echo -e "${YELLOW}[3/5] Skipping market seeding (--products-only)${NC}"
fi

# =============================================================================
# SEED PRODUCTS
# =============================================================================
if [ "$SEED_PRODUCTS" = true ]; then
    echo ""
    echo -e "${BLUE}[4/5] Seeding products for ${#PRODUCT_SEARCH_TERMS[@]} search terms across ALL markets...${NC}"
    
    # Hardcoded market IDs from the database
    ALL_MARKETS="5
300
304
306
307
25817
25840
25846
201608
201612
230493
230494
240061
240168
240185
240197
240198
240238
240312
240510
240533
240574
240661
240805
241075
241093
241100
241101
241105
241108
241109
241112
241123
241179
241180
241182
241191
241197
241198
250347
250370
260008
320160
320170
320191
320195
320547
320828
320837
320970
321021
321032
410563
410717
430461
431001
431022
431033
431044
431067
431082
433142
440327
440353
440383
440418
440460
440470
440486
440490
440491
440497
440600
440605
440669
440752
440753
440838
441070
441095
441702
461741
461781
461799
461897
531054
531071
531076
531077
531104
531138
531384
531385
531429
531458
533570
540181
540184
540203
540276
540291
540311
540333
540350
540502
540503
540523
540528
540557
540638
540683
540745
540807
540883
540902
540935
541755
541793
541813
561188
561228
562037
562045
562047
562271
562345
565005
565077
565081
565157
565204
565214
565236
565264
565283
565339
565393
565432
565433
565467
565537
565571
565578
565660
810852
830552
830982
831002
831010
831057
831076
831083
831084
831094
831297
833717
840003
840084
840128
840183
840185
840187
840192
840202
840205
840209
840229
840240
840241
840276
840282
840297
840346
840377
840379
840401
840422
840661
840672
840838
840913
840959
861769
861990
862027
865773
865788
865789
865822
865888
865889
1100128
1350156
1350161
1356300
1356308
1466906
1469089
1469130
1469250
1469318
1469323
1470072
1471343
1478434
1478520
1658230
1701701
1762807
1763118
1763161
1763448
1763496
1763545
1763938
1765177
1765235
1765242
1765255
1765287
1765297
1765506
1765740
1765750
1765979
1765993
1766001
1766005
1766112
1766115
1766160
1910167
1931088
1931089
1931091
1931146
1931258
1931419
1931450
1931595
1931630
1931651
1940016
1940032
1940069
1940104
1940106
1940108
1940119
1940135
1940163
1940200
1940205
1940208
1940234
1940286
1940295
1940364
1940413
1940422
1940432
1940446
1940449
1940450
1940466
1940491
2800016
3200008
3700019
4031024
4033296
4040034
4040138
4040174
4040200
4040274
4040361
4040370
4040385
4040426
4040430
4040441
4040455
4040475
4040493
4040502
4040503
4040710
4040712
4040719
4040722
5400006
5500125
7000016
8000017
8321066
8321228
8321323
8321327
8534187
8534431
8534443
8534516
8534628
8534801
8534806
8534810
8536918
8537545
8539501
8542505
8545503
8546536
8547534
8549523
9067612
9067637"
    
    MARKET_COUNT=$(echo "$ALL_MARKETS" | wc -l)
    echo "  Found $MARKET_COUNT markets to seed products for"
    
    if [ "$MARKET_COUNT" -eq 0 ]; then
        echo -e "${RED}ERROR: No markets found. Run with --markets-only first.${NC}"
        exit 1
    fi
    
    # Ensure all markets exist in the database (insert with dummy values if missing)
    echo -e "  ${BLUE}Ensuring all markets exist in database...${NC}"
    MARKETS_INSERTED=0
    for TARGET_MARKET in $ALL_MARKETS; do
        # Check if market exists
        market_exists=$(query_sql "SELECT COUNT(*) FROM markets WHERE id = $TARGET_MARKET")
        
        if [ "$market_exists" -eq 0 ]; then
            # Insert dummy address first (using market_id as address_id for simplicity)
            exec_sql "
                INSERT INTO addresses (id, street, zip_code, city, latitude, longitude)
                VALUES ($TARGET_MARKET, 'Load Test Street 1', '00000', 'Load Test City', 52.5200, 13.4050)
                ON CONFLICT (id) DO NOTHING;
            " &>/dev/null
            
            # Insert market with dummy values
            exec_sql "
                INSERT INTO markets (id, name, address_id, last_updated)
                VALUES ($TARGET_MARKET, 'REWE Load Test Market $TARGET_MARKET', $TARGET_MARKET, NOW())
                ON CONFLICT (id) DO NOTHING;
            " &>/dev/null
            
            ((MARKETS_INSERTED++)) || true
        fi
    done
    
    if [ "$MARKETS_INSERTED" -gt 0 ]; then
        echo -e "  ${GREEN}✓${NC} Inserted $MARKETS_INSERTED missing markets with dummy values"
    else
        echo -e "  ${GREEN}✓${NC} All markets already exist in database"
    fi
    
    PRODUCTS_CREATED=0
    MARKETS_PROCESSED=0
    
    for TARGET_MARKET in $ALL_MARKETS; do
        ((MARKETS_PROCESSED++)) || true
        
        # Check if this market already has products
        existing_products=$(query_sql "SELECT COUNT(*) FROM products WHERE market_id = $TARGET_MARKET")
        
        if [ "$existing_products" -gt 50 ]; then
            # Market already has enough products, skip
            continue
        fi
        
        echo -e "  ${YELLOW}→${NC} Market $TARGET_MARKET ($MARKETS_PROCESSED/$MARKET_COUNT) - seeding products..."
        
        for term in "${PRODUCT_SEARCH_TERMS[@]}"; do
            # Generate unique rewe_ids based on term hash, market, and index
            term_hash=$(echo -n "$term" | md5sum | cut -c1-6)
            term_num=$((16#$term_hash % 10000))
            
            for i in 1 2 3; do
                # Make rewe_id unique per market by including market in calculation
                rewe_id=$((term_num * 100 + (TARGET_MARKET % 1000) * 10 + i))
                price=$((100 + (rewe_id % 900)))  # 1.00 to 9.99 EUR in cents
                
                # Product name variations
                case $i in
                    1) suffix="Bio"; is_organic="true";;
                    2) suffix="Frisch"; is_organic="false";;
                    3) suffix="Premium"; is_organic="false";;
                esac
                
                docker exec "$DB_CONTAINER" sh -c "psql -U $DB_USER -d $DB_NAME -c \"
                    INSERT INTO products (rewe_id, name, market_id, price, grammage, last_updated, is_organic, is_vegetarian)
                    VALUES ($rewe_id, '$term $suffix 500g', $TARGET_MARKET, $price, '500g', NOW(), $is_organic, true)
                    ON CONFLICT (market_id, rewe_id) DO NOTHING;
                \"" &>/dev/null || true
                
                ((PRODUCTS_CREATED++)) || true
            done
        done
    done
    
    echo -e "${GREEN}✓ Products seeding complete ($PRODUCTS_CREATED products across $MARKETS_PROCESSED markets)${NC}"
else
    echo ""
    echo -e "${YELLOW}[4/5] Skipping product seeding (--markets-only)${NC}"
fi

# =============================================================================
# FINAL SUMMARY
# =============================================================================
echo ""
echo -e "${BLUE}[5/5] Final database state:${NC}"
MARKET_COUNT=$(query_sql "SELECT COUNT(*) FROM markets")
PRODUCT_COUNT=$(query_sql "SELECT COUNT(*) FROM products")
SEARCH_TERM_COUNT=$(query_sql "SELECT COUNT(DISTINCT search_term) FROM search_term_market")

echo "  - Markets: $MARKET_COUNT"
echo "  - Products: $PRODUCT_COUNT"
echo "  - Postal codes linked: $SEARCH_TERM_COUNT"

# Verify all load test postal codes are covered
echo ""
echo -e "${BLUE}Postal code coverage for load test:${NC}"
all_covered=true
for plz in "${POSTAL_CODES[@]}"; do
    count=$(query_sql "SELECT COUNT(*) FROM search_term_market WHERE search_term = '$plz'")
    city="${CITY_MAP[$plz]}"
    if [ "$count" -gt 0 ]; then
        echo -e "  ${GREEN}✓${NC} $plz ($city): $count markets"
    else
        echo -e "  ${RED}✗${NC} $plz ($city): NO MARKETS"
        all_covered=false
    fi
done

echo ""
if [ "$all_covered" = true ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✓ Database ready for load testing!${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  ⚠ Some postal codes need seeding${NC}"
    echo -e "${YELLOW}========================================${NC}"
fi

echo ""
echo "To run load test:"
echo "  docker exec -it decidish-k6-1 k6 run /scripts/load_test.js"
