#!/bin/bash

# Configuration
URL="http://mlpipeline:8000/finetune_user_adapter"
MAX_RETRIES=5
INITIAL_WAIT=30 # Seconds
NAME="Finetune Job"

# The JSON Payload
DATA=$(cat <<EOF
{
  "epochs": 5,
  "val_split": 0.1,
  "max_batch_size": 50000,
  "lr_user": 0.001,
  "save_best_as_last": true,
  "tag": "cron_weekly_finetune"
}
EOF
)

retry_count=0
wait_time=$INITIAL_WAIT

echo "[$(date)] Starting $NAME trigger..."

while [ $retry_count -lt $MAX_RETRIES ]; do
    response_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL" \
        -H "Content-Type: application/json" \
        -d "$DATA")

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