#!/bin/bash
# =============================================================================
# Complete Load Test Database Seeding Script
# =============================================================================
# Seeds the database with test data for k6 load testing in proper order:
#   1. Markets and search term mappings (postal codes)
#   2. Products for all markets
#   3. Fuzzy matching via core-server API
#
# Usage: ./seed_load_test_complete.sh [options]
#
# Options:
#   --markets-only     Only seed markets (skip products and matching)
#   --products-only    Only seed products (skip markets and matching)
#   --matching-only    Only run fuzzy matching via core-server API
#   --skip-matching    Seed markets and products but skip fuzzy matching
#   --reset            Clear existing seeded data before seeding
#   --dry-run          Show what would be done without executing
#   --help             Show this help message
# =============================================================================

set -e

# Configuration
DB_CONTAINER="${DB_CONTAINER:-dev_backend_postgres}"
DB_USER="${DB_USER:-user}"
DB_NAME="${DB_NAME:-decidish}"
CORE_SERVER_URL="${CORE_SERVER_URL:-http://localhost:8080}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
SEED_MARKETS=true
SEED_PRODUCTS=true
RUN_MATCHING=true
RESET=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --markets-only)
            SEED_PRODUCTS=false
            RUN_MATCHING=false
            shift
            ;;
        --products-only)
            SEED_MARKETS=false
            RUN_MATCHING=false
            shift
            ;;
        --matching-only)
            SEED_MARKETS=false
            SEED_PRODUCTS=false
            shift
            ;;
        --skip-matching)
            RUN_MATCHING=false
            shift
            ;;
        --reset)
            RESET=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            head -20 "$0" | tail -16
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
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
        echo -e "${YELLOW}[DRY-RUN]${NC} ${sql:0:100}..."
    else
        docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "$sql" 2>/dev/null
    fi
}

# Function to execute SQL and return result
query_sql() {
    local sql="$1"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "$sql" 2>/dev/null | tr -d ' '
}

# Function to run SQL file
run_sql_file() {
    local file="$1"
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY-RUN] Would run SQL file: $file${NC}"
    else
        docker cp "$file" "$DB_CONTAINER:/tmp/seed_script.sql"
        docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/seed_script.sql
    fi
}

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  Complete Load Test Database Seeder${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Check database connection
echo -e "${BLUE}[Step 0] Checking database connection...${NC}"
if ! docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c 'SELECT 1' &>/dev/null; then
    echo -e "${RED}ERROR: Cannot connect to database. Is the container '$DB_CONTAINER' running?${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database connection OK${NC}"

# Show current state
echo ""
echo -e "${BLUE}Current database state:${NC}"
if [ "$DRY_RUN" = false ]; then
    MARKET_COUNT=$(query_sql "SELECT COUNT(*) FROM markets")
    PRODUCT_COUNT=$(query_sql "SELECT COUNT(*) FROM products")
    SEARCH_TERM_COUNT=$(query_sql "SELECT COUNT(DISTINCT search_term) FROM search_term_market")
    MAPPING_COUNT=$(query_sql "SELECT COUNT(*) FROM ingredient_product")
    echo "  - Markets: $MARKET_COUNT"
    echo "  - Products: $PRODUCT_COUNT"
    echo "  - Postal codes linked: $SEARCH_TERM_COUNT"
    echo "  - Ingredient mappings: $MAPPING_COUNT"
fi

# Reset if requested
if [ "$RESET" = true ]; then
    echo ""
    echo -e "${YELLOW}Resetting seeded data...${NC}"
    if [ "$DRY_RUN" = false ]; then
        exec_sql "DELETE FROM ingredient_product WHERE confidence >= 0.5 AND confidence <= 0.95;"
        exec_sql "DELETE FROM products WHERE name LIKE '%500g';"
        exec_sql "DELETE FROM search_term_market WHERE search_term IN ($(printf "'%s'," "${POSTAL_CODES[@]}" | sed 's/,$//'));"
        echo -e "${GREEN}✓ Reset complete${NC}"
    else
        echo -e "${YELLOW}[DRY-RUN] Would reset seeded data${NC}"
    fi
fi

# =============================================================================
# STEP 1: SEED MARKETS
# =============================================================================
if [ "$SEED_MARKETS" = true ]; then
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}[Step 1/3] Seeding Markets${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo -e "Seeding markets for ${#POSTAL_CODES[@]} postal codes..."
    
    MARKETS_CREATED=0
    LINKS_CREATED=0
    
    for plz in "${POSTAL_CODES[@]}"; do
        city="${CITY_MAP[$plz]}"
        lat="${LAT_MAP[$plz]}"
        lon="${LON_MAP[$plz]}"
        
        if [ "$DRY_RUN" = true ]; then
            echo -e "  ${YELLOW}[DRY-RUN]${NC} Would seed markets for $plz ($city)"
            continue
        fi
        
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
                ON CONFLICT DO NOTHING;
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
    echo -e "${YELLOW}[Step 1/3] Skipping market seeding${NC}"
fi

# =============================================================================
# STEP 2: SEED PRODUCTS
# =============================================================================
if [ "$SEED_PRODUCTS" = true ]; then
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}[Step 2/3] Seeding Products${NC}"
    echo -e "${BLUE}=========================================${NC}"
    
    # Check if seed_products_bulk.sql exists
    if [ ! -f "$SCRIPT_DIR/seed_products_bulk.sql" ]; then
        echo -e "${RED}ERROR: seed_products_bulk.sql not found in $SCRIPT_DIR${NC}"
        exit 1
    fi
    
    echo -e "Running bulk product seeding via SQL..."
    echo -e "${YELLOW}This creates products for all target markets...${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY-RUN] Would run seed_products_bulk.sql${NC}"
    else
        run_sql_file "$SCRIPT_DIR/seed_products_bulk.sql"
        echo -e "${GREEN}✓ Products seeding complete${NC}"
    fi
else
    echo ""
    echo -e "${YELLOW}[Step 2/3] Skipping product seeding${NC}"
fi

# =============================================================================
# STEP 3: RUN FUZZY MATCHING
# =============================================================================
if [ "$RUN_MATCHING" = true ]; then
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}[Step 3/3] Running Fuzzy Matching${NC}"
    echo -e "${BLUE}=========================================${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY-RUN] Would run SQL matching script${NC}"
    else
        # Run the matching-only SQL script
        # This uses multi-tier matching directly in SQL (same algorithm as Java)
        if [ -f "$SCRIPT_DIR/seed_ingredient_matching.sql" ]; then
            echo -e "Running multi-tier matching via SQL (same algorithm as core-server)..."
            echo -e "${YELLOW}This may take 2-5 minutes depending on data volume...${NC}"
            
            START_TIME=$(date +%s)
            run_sql_file "$SCRIPT_DIR/seed_ingredient_matching.sql"
            END_TIME=$(date +%s)
            
            DURATION=$((END_TIME - START_TIME))
            MINUTES=$((DURATION / 60))
            SECONDS=$((DURATION % 60))
            
            echo -e "${GREEN}✓ Multi-tier matching completed in ${MINUTES}m ${SECONDS}s${NC}"
        else
            echo -e "${RED}ERROR: seed_ingredient_matching.sql not found in $SCRIPT_DIR${NC}"
            exit 1
        fi
    fi
else
    echo ""
    echo -e "${YELLOW}[Step 3/3] Skipping fuzzy matching${NC}"
fi

# =============================================================================
# FINAL SUMMARY
# =============================================================================
echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  Final Summary${NC}"
echo -e "${BLUE}=========================================${NC}"

if [ "$DRY_RUN" = false ]; then
    echo -e "\n${YELLOW}Final database state:${NC}"
    MARKET_COUNT=$(query_sql "SELECT COUNT(*) FROM markets")
    PRODUCT_COUNT=$(query_sql "SELECT COUNT(*) FROM products")
    SEARCH_TERM_COUNT=$(query_sql "SELECT COUNT(DISTINCT search_term) FROM search_term_market")
    MAPPING_COUNT=$(query_sql "SELECT COUNT(*) FROM ingredient_product")
    
    echo "  - Markets: $MARKET_COUNT"
    echo "  - Products: $PRODUCT_COUNT"
    echo "  - Postal codes linked: $SEARCH_TERM_COUNT"
    echo "  - Ingredient mappings: $MAPPING_COUNT"
    
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
    
    # Coverage stats
    echo ""
    echo -e "${YELLOW}Coverage statistics:${NC}"
    exec_sql "SELECT 
                ROUND((SELECT COUNT(DISTINCT ingredient_id) FROM ingredient_product)::numeric / 
                      NULLIF((SELECT COUNT(*) FROM ingredients), 0)::numeric * 100, 2) as mapped_pct,
                ROUND((SELECT COUNT(*) FROM ingredients WHERE id NOT IN (SELECT ingredient_id FROM ingredient_product))::numeric / 
                      NULLIF((SELECT COUNT(*) FROM ingredients), 0)::numeric * 100, 2) as unmapped_pct_for_api;"
fi

echo ""
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}=========================================${NC}"
    echo -e "${YELLOW}  DRY-RUN complete - no changes made${NC}"
    echo -e "${YELLOW}=========================================${NC}"
else
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}  ✓ Database ready for load testing!${NC}"
    echo -e "${GREEN}=========================================${NC}"
fi

echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "  1. Run load test: ${BLUE}docker exec decidish-k6-1 k6 run /scripts/load_test.js${NC}"
echo -e "  2. Monitor with: ${BLUE}docker logs -f dev_core${NC}"
echo ""
echo "To run load test:"
echo "  docker exec -it decidish-k6-1 k6 run /scripts/load_test.js"
