#!/bin/bash
# =============================================================================
# Load Test Database Seeding Script
# =============================================================================
# Seeds the database with test data for k6 load testing
# 
# Usage: ./seed_load_test_data.sh [options]
#
# Options:
#   --products-only    Only seed products (skip ingredient mappings)
#   --mappings-only    Only seed ingredient mappings (skip products)
#   --reset            Clear existing seeded data before seeding
#   --dry-run          Show what would be done without executing
#   --help             Show this help message
# =============================================================================

set -e

POSTGRES_CONTAINER="dev_backend_postgres"
DB_USER="user"
DB_NAME="decidish"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
PRODUCTS_ONLY=false
MAPPINGS_ONLY=false
RESET=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --products-only)
            PRODUCTS_ONLY=true
            shift
            ;;
        --mappings-only)
            MAPPINGS_ONLY=true
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
            head -20 "$0" | tail -15
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Load Test Database Seeding${NC}"
echo -e "${BLUE}=========================================${NC}"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
    echo -e "${RED}Error: PostgreSQL container '${POSTGRES_CONTAINER}' is not running${NC}"
    exit 1
fi

# Function to run SQL
run_sql() {
    local sql="$1"
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY-RUN] Would execute: ${sql:0:100}...${NC}"
    else
        docker exec "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "$sql"
    fi
}

# Show current state
echo -e "\n${YELLOW}Current database state:${NC}"
run_sql "SELECT 'Ingredients' as table_name, COUNT(*) as count FROM ingredients
         UNION ALL SELECT 'Products', COUNT(*) FROM products
         UNION ALL SELECT 'Ingredient Mappings', COUNT(*) FROM ingredient_product
         UNION ALL SELECT 'Markets with products', COUNT(DISTINCT market_id) FROM products;"

# Reset if requested
if [ "$RESET" = true ]; then
    echo -e "\n${YELLOW}Resetting seeded data...${NC}"
    if [ "$DRY_RUN" = false ]; then
        run_sql "DELETE FROM ingredient_product WHERE confidence >= 0.5 AND confidence <= 0.95;"
        run_sql "DELETE FROM products WHERE name LIKE '%500g';"
        echo -e "${GREEN}Reset complete${NC}"
    fi
fi

# Copy and run the complete seeding script
if [ "$MAPPINGS_ONLY" = false ] && [ "$PRODUCTS_ONLY" = false ]; then
    echo -e "\n${YELLOW}Running complete seeding script...${NC}"
    if [ "$DRY_RUN" = false ]; then
        docker cp "$SCRIPT_DIR/seed_load_test_complete.sql" "$POSTGRES_CONTAINER:/tmp/"
        docker exec "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/seed_load_test_complete.sql
    else
        echo -e "${YELLOW}[DRY-RUN] Would run seed_load_test_complete.sql${NC}"
    fi
elif [ "$PRODUCTS_ONLY" = true ]; then
    echo -e "\n${YELLOW}Running products-only seeding...${NC}"
    if [ "$DRY_RUN" = false ]; then
        docker cp "$SCRIPT_DIR/seed_products_bulk.sql" "$POSTGRES_CONTAINER:/tmp/"
        docker exec "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/seed_products_bulk.sql
    else
        echo -e "${YELLOW}[DRY-RUN] Would run seed_products_bulk.sql${NC}"
    fi
elif [ "$MAPPINGS_ONLY" = true ]; then
    echo -e "\n${YELLOW}Running mappings-only seeding...${NC}"
    if [ "$DRY_RUN" = false ]; then
        docker cp "$SCRIPT_DIR/seed_ingredient_mappings.sql" "$POSTGRES_CONTAINER:/tmp/"
        docker exec "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/seed_ingredient_mappings.sql
    else
        echo -e "${YELLOW}[DRY-RUN] Would run seed_ingredient_mappings.sql${NC}"
    fi
fi

# Show final state
echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}Seeding Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"

if [ "$DRY_RUN" = false ]; then
    echo -e "\n${YELLOW}Final database state:${NC}"
    run_sql "SELECT 'Ingredients' as table_name, COUNT(*) as count FROM ingredients
             UNION ALL SELECT 'Products', COUNT(*) FROM products
             UNION ALL SELECT 'Ingredient Mappings', COUNT(*) FROM ingredient_product
             UNION ALL SELECT 'Universal Products (all markets)', COUNT(*) FROM (
                 SELECT rewe_id FROM products 
                 GROUP BY rewe_id 
                 HAVING COUNT(DISTINCT market_id) >= 250
             ) sub;"
    
    echo -e "\n${YELLOW}Coverage:${NC}"
    run_sql "SELECT 
                ROUND((SELECT COUNT(DISTINCT ingredient_id) FROM ingredient_product)::numeric / 
                      (SELECT COUNT(*) FROM ingredients)::numeric * 100, 2) as mapped_pct,
                ROUND((SELECT COUNT(*) FROM ingredients WHERE id NOT IN (SELECT ingredient_id FROM ingredient_product))::numeric / 
                      (SELECT COUNT(*) FROM ingredients)::numeric * 100, 2) as unmapped_pct_for_api;"
fi

echo -e "\n${GREEN}Next steps:${NC}"
echo -e "  1. Restart core-server with: ${BLUE}docker compose up -d core-server${NC}"
echo -e "  2. Run load test: ${BLUE}docker exec decidish-k6-1 k6 run /scripts/load_test.js${NC}"
echo -e "  3. Monitor API fallback: ${BLUE}docker logs dev_core 2>&1 | grep 'API fallback'${NC}"
echo -e "  4. Check for rate limits: ${BLUE}docker logs dev_core 2>&1 | grep 'Rate Limit'${NC}"
