#!/bin/bash

set -e

echo "Postgres is up - Executing migrations..."

export GOOSE_DRIVER=postgres
export GOOSE_DBSTRING="postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=${DB_SSLMODE:-disable}&search_path=${DB_SCHEMA:-public}"

goose up

echo "Migrations completed successfully."