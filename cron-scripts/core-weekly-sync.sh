#!/bin/bash

# Configuration
# For Docker Compose: URL defaults to core-server
# For Docker Swarm: Set STACK_NAME env var (e.g., STACK_NAME=qa)
if [ -n "$STACK_NAME" ]; then
    URL="http://${STACK_NAME}_core-server:8080/api/v1/jobs/weekly-sync"
else
    URL="${CORE_SERVER_URL:-http://core-server:8080/api/v1/jobs/weekly-sync}"
fi
MAX_RETRIES=2
INITIAL_WAIT=30 # Seconds
NAME="Weekly Sync Job"

retry_count=0
wait_time=$INITIAL_WAIT

echo "[$(date)] Starting $NAME trigger..."

while [ $retry_count -lt $MAX_RETRIES ]; do
    response_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL" \
        -H "Host: localhost" \
        -H "Content-Type: application/json")

    if [[ "$response_code" =~ ^2 ]]; then
        echo "[$(date)] Success! ($response_code)"
        exit 0
    fi

    retry_count=$((retry_count + 1))
    
    # If we hit max retries, exit with failure
    if [ $retry_count -eq $MAX_RETRIES ]; then
        echo "[$(date)] Failed after $MAX_RETRIES attempts. Last status: $response_code"
        exit 1
    fi

    # Log the failure and wait
    echo "[$(date)] Request failed (Status: $response_code). Attempt $retry_count/$MAX_RETRIES."
    echo "Retrying in ${wait_time}s..."
    
    sleep $wait_time

    # Exponential Backoff: Multiply wait time by 2
    wait_time=$((wait_time * 2))
done