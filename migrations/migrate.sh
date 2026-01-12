#!/bin/bash

set -e

echo "Postgres is up - Executing migrations..."

# export DB_USER="user"
# export DB_PASSWORD="password"
# export DB_HOST="localhost"
# export DB_PORT="5433"
# export DB_NAME="decidish"


export GOOSE_DRIVER=postgres
export GOOSE_DBSTRING="postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=${DB_SSLMODE:-disable}&search_path=${DB_SCHEMA:-public}"

goose up

echo "Migrations completed successfully."