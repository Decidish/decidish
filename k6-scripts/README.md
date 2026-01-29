# k6 Load Testing Suite for Decidish

This directory contains comprehensive load testing scripts for benchmarking the Decidish application under various conditions.

## Overview

The enhanced `load_test.js` simulates realistic user workflows across the entire application, including:

1. **Authentication** - User registration and login
2. **Preferences Setup** - Dietary restrictions, allergies, cuisine preferences
3. **Market Selection** - Selecting preferred grocery market
4. **Recipe Discovery** - Personalized recommendations via Recipe Swiper
5. **Shopping Cart** - Adding recipes and generating shopping lists
6. **Product Search** - Searching for products at selected market
7. **Recipe Search** - Discovering new recipes
8. **Profile Management** - Updating preferences and market selection
9. **Recipe Import** - Adding recipes via URL
10. **Activity Tracking** - Recording user interactions
11. **Background Job Resilience** - Testing application performance under concurrent jobs

## Prerequisites

Before running load tests, ensure:

1. **All services are running**:
   ```bash
   docker compose up -d
   ```

2. **Database is seeded** with markets and products:
   ```bash
   # Quick automated seeding (recommended)
   ./k6-scripts/seed_database.sh
   
   # Or manually check if markets exist (requires postal code)
   curl http://localhost/shopping/api/v1/markets?plz=10115
   
   # If empty, trigger import job
   curl -X POST http://localhost/personalization/recipes/rewe \
     -H "Content-Type: application/json" \
     -d '{}'
   
   # Monitor progress at http://localhost:3012 (Cronicle)
   ```

3. **Services are healthy**:
   ```bash
   docker compose ps
   # All services should show "Up" status
   ```

## Installation

```bash
# Install k6 (macOS)
brew install k6

# Install k6 (Linux)
sudo snap install k6

# Or from source: https://k6.io/docs/getting-started/installation/
```

## Running Tests

### Using Docker Compose (Recommended)

This is the correct way to run k6 with Prometheus metrics for Grafana visualization:

```bash
docker compose run --rm --entrypoint=k6 \
  -v $(pwd)/k6-scripts:/scripts \
  -e BASE_URL=http://nginx \
  -e TOTAL_USERS=50 \
  k6 run --out experimental-prometheus-rw /scripts/load_test.js
```

With custom configuration:
```bash
docker compose run --rm --entrypoint=k6 \
  -v $(pwd)/k6-scripts:/scripts \
  -e BASE_URL=http://nginx \
  -e ENVIRONMENT=staging \
  -e TOTAL_USERS=100 \
  -e ENABLE_JOB_LOAD=true \
  -e TEST_DURATION=10m \
  k6 run --out experimental-prometheus-rw /scripts/load_test.js
```

### Debug Mode

By default, only **failure logs** are printed. Enable debug logging for specific categories:

```bash
# Clean output - only failures (default)
docker compose run --rm -v $(pwd)/k6-scripts:/scripts \
  -e BASE_URL=http://nginx \
  k6 run /scripts/load_test.js

# All debug logs
docker compose run --rm -v $(pwd)/k6-scripts:/scripts \
  -e BASE_URL=http://nginx \
  -e DEBUG=all \
  k6 run /scripts/load_test.js

# Specific categories (market, shopping, recommendations)
docker compose run --rm -v $(pwd)/k6-scripts:/scripts \
  -e BASE_URL=http://nginx \
  -e DEBUG=shopping,recommendations \
  k6 run /scripts/load_test.js
```

**Available debug categories:**
- `market` - Market fetching and selection
- `shopping` - Shopping list operations
- `recommendations` - Recipe recommendations
- `all` - Enable all debug categories

### Basic Test (Standalone k6, No Grafana)
```bash
k6 run load_test.js
```

### Custom Environment Configuration

#### Staging Environment
```bash
k6 run -e BASE_URL=https://staging.decidish.win \
       -e ENVIRONMENT=staging \
       -e TOTAL_USERS=100 \
       -e ENABLE_JOB_LOAD=true \
       -e TEST_DURATION=10m \
       load_test.js
```

#### Production Environment (Read-Only Test - Lower Load)
```bash
k6 run -e BASE_URL=https://decidish.win \
       -e ENVIRONMENT=production \
       -e TOTAL_USERS=25 \
       -e ENABLE_JOB_LOAD=false \
       -e TEST_DURATION=5m \
       load_test.js
```

#### Local Development
```bash
k6 run -e BASE_URL=http://localhost:3000 \
       -e ENVIRONMENT=local \
       -e TOTAL_USERS=10 \
       -e ENABLE_JOB_LOAD=true \
       -e TEST_DURATION=2m \
       load_test.js
```

#### Docker Deployment
```bash
k6 run -e BASE_URL=http://nginx \
       -e TOTAL_USERS=50 \
       load_test.js
```

## Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `BASE_URL` | `http://nginx` | Base URL of the application |
| `ENVIRONMENT` | `staging` | Environment name (staging/production/local) |
| `TOTAL_USERS` | `50` | Number of virtual users |
| `ENABLE_JOB_LOAD` | `false` | Enable background job load testing (imports recipes while testing) |
| `TEST_DURATION` | `5m` | Duration of main load test stage |
| `DEBUG` | `` (empty) | Debug logging control: `all` for all logs, or comma-separated categories (`market,shopping,recommendations`) |

## Load Testing Stages

The test follows a realistic ramp-up pattern:

1. **Ramp-up** (30s): Gradually increase load to 40% of target users
2. **Main** (configurable, default 5m): Run at full user load
3. **Ramp-down** (30s): Gradually decrease to 0 users

## Key Metrics

### Standard Metrics
- `http_req_duration` - Response time (tracked: p95 < 3s, p99 < 5s)
- `http_req_failed` - Failed requests
- `errors` - Custom error rate (tracked: < 5%)

### Custom Metrics
- `recommendation_latency` (Trend) - Time to fetch personalized recommendations
- `shopping_list_latency` (Trend) - Time to fetch/generate shopping lists
- `search_latency` (Trend) - Time to search products/recipes
- `job_impact_tests` (Counter) - Number of background job resilience tests

## Output Analysis

### Summary Report
```bash
k6 run load_test.js --out json=results.json
```

View results:
```bash
cat results.json | jq '.metrics'
```

### HTML Report (requires k6 community option)
```bash
k6 run --out html=results.html load_test.js
```

### Live Monitoring with Grafana

When running via Docker Compose, k6 automatically sends metrics to Prometheus, which Grafana can visualize:

1. **Run the load test**:
   ```bash
   docker compose run --rm --entrypoint=k6 \
     -v $(pwd)/k6-scripts:/scripts \
     -e BASE_URL=http://nginx \
     -e TOTAL_USERS=50 \
     k6 run --out experimental-prometheus-rw /scripts/load_test.js
   ```

2. **Access Grafana**: http://localhost:3031
   - Username: `admin`
   - Password: `secret` (configured in docker-compose.yml)

3. **Import Decidish Scalability Dashboard** (it should already be there):
   - Go to **Dashboards** → **Manage**
   - Click **+ Import**
   - Click **Upload JSON file** and select `./grafana-dashboard-decidish.json`
   - Or paste the JSON content directly
   - Select **Prometheus** as data source
   - Click **Import**
   - **Dashboard auto-opens with all metrics pre-configured!**

4. **Available Dashboard Panels**:
   - **Response Times**: p95, p99 latency metrics
   - **Virtual Users**: Load ramp-up visualization
   - **Error Rates**: 4xx, 5xx breakdown
   - **Throughput**: Requests per second (RPS)
   - **Service Bottleneck Analysis**: Response times per service
   - **Scalability Indicators**: VUs, throughput, latency relationships
   - **Custom Metrics**: Recommendation, shopping list, search latencies

### Standalone k6 with InfluxDB Output
If not using Docker Compose:
```bash
k6 run \
  --vus 50 \
  --duration 5m \
  --out influxdb=http://localhost:8086/k6 \
  load_test.js
```

## Job Load Testing

To test how your application handles concurrent background jobs:

```bash
k6 run -e ENABLE_JOB_LOAD=true \
       -e TOTAL_USERS=100 \
       -e TEST_DURATION=10m \
       load_test.js
```

This will:
1. Trigger an import job (e.g., "Import Recipes from REWE") at test start
2. Periodically check application health during the job
3. Measure recommendation latency degradation during job execution
4. Track `job_impact_tests` metric to count resilience validations

## Common Issues

### Debugging API Response Issues

The script now includes comprehensive debugging. Look for debug messages in the output:

```
[Auth DEBUG] - Authentication issues
[Preferences DEBUG] - Preference setting issues  
[Market DEBUG] - Market fetching/parsing issues
[Recommendations DEBUG] - Recipe recommendation issues
[Shopping DEBUG] - Shopping list issues
```

**Example Debug Output**:
```
[Market DEBUG] Response status: 200, Content-Type: application/json
[Market DEBUG] Response body (first 200 chars): {"markets":[{"id":1,"name":"REWE"}]}
[Market DEBUG] Parsed JSON keys: markets
[Market DEBUG] Found 2 markets as array
[Market DEBUG] Selected market ID: 1
```

### Connection Refused
```
Error: connect: connection refused
```
**Solution**: Ensure the application is running at the BASE_URL specified.

### Markets Parsing Error
```
[Market DEBUG] Could not parse markets response
```
**Solutions**:
1. Check if personalization service is running: `docker compose ps`
2. Verify the markets API returns valid JSON: 
   ```bash
   curl http://localhost/personalization/api/v1/markets
   ```
3. Check the debug output for the actual response structure
4. Ensure database has market data seeded

### Authentication Failures
```
[Auth DEBUG] Could not extract auth token!
```
**Solutions**:
- Verify auth service is running
- Check if registration endpoint is available
- Ensure database migrations are up-to-date
- Look at response headers in debug output

### High Error Rates
- Check application logs for backend errors
- Verify database connectivity
- Ensure sufficient resources (CPU, memory)

### Timeout Errors
- Increase `-e TEST_DURATION`
- Reduce `-e TOTAL_USERS` if system is overloaded
- Check network latency with `ping BASE_URL`

### Authentication Failures
- Verify auth service is running
- Check if registration endpoint is available
- Ensure database migrations are up-to-date

## Debugging

For detailed debugging information and troubleshooting, see [DEBUG_GUIDE.md](DEBUG_GUIDE.md).

### Selective Debug Logging

The load test script includes comprehensive debug logging that can be controlled via the `DEBUG` environment variable:

```bash
# Only show failures (default behavior)
docker compose run --rm -v $(pwd)/k6-scripts:/scripts \
  -e BASE_URL=http://nginx \
  -e TOTAL_USERS=5 \
  k6 run /scripts/load_test.js

# Show all debug output
docker compose run --rm -v $(pwd)/k6-scripts:/scripts \
  -e BASE_URL=http://nginx \
  -e TOTAL_USERS=5 \
  -e DEBUG=all \
  k6 run /scripts/load_test.js

# Show specific categories (useful for targeted debugging)
docker compose run --rm -v $(pwd)/k6-scripts:/scripts \
  -e BASE_URL=http://nginx \
  -e TOTAL_USERS=5 \
  -e DEBUG=market,shopping \
  k6 run /scripts/load_test.js
```

**Debug categories:**
- `setup` - User registration and database seeding checks
- `market` - Market API calls and selection
- `shopping` - Shopping list and cart operations
- `recommendations` - Recipe recommendation API calls
- `all` - Enable all debug output

**What gets logged:**
- Full response status and headers
- Response body previews (first 200 chars)
- JSON structure analysis
- ID extraction attempts
- Error messages with stack traces

**Note:** Failure logs are always shown regardless of DEBUG setting.

## Advanced Usage

### Distributed Testing
```bash
# Run on multiple machines simultaneously (k6 Cloud)
k6 cloud load_test.js
```

### Custom Thresholds
Edit the `thresholds` section in `options` to adjust acceptable performance:

```javascript
thresholds: {
  'http_req_duration': ['p(95)<2000'],  // 95th percentile < 2s
  'errors': ['rate<0.05'],              // Error rate < 5%
  'recommendation_latency': ['p(95)<1500'], // Recommendation p95 < 1.5s
},
```

### Debugging
```bash
k6 run -e BASE_URL=http://localhost:3000 \
       -e TOTAL_USERS=5 \
       load_test.js
```

Use `-e TOTAL_USERS=5` for debugging; the script logs all API responses.

## Expected Baseline Performance

Based on typical SaaS applications:

| Metric | Target | Good | Acceptable |
|--------|--------|------|-----------|
| p95 Response Time | < 1.5s | < 2s | < 3s |
| p99 Response Time | < 3s | < 4s | < 5s |
| Error Rate | < 1% | < 2% | < 5% |
| Recommendation API | < 800ms | < 1.5s | < 2s |
| Shopping List API | < 600ms | < 1.2s | < 2s |

## Continuous Integration

Add to CI/CD pipeline (e.g., GitHub Actions):

```yaml
- name: Run load tests
  run: |
    k6 run \
      -e BASE_URL=https://staging.decidish.win \
      -e TOTAL_USERS=50 \
      -e ENABLE_JOB_LOAD=true \
      k6-scripts/load_test.js
```

## References

- [k6 Documentation](https://k6.io/docs/)
- [k6 HTTP API Reference](https://k6.io/docs/javascript-api/k6-http/)
- [k6 Metrics](https://k6.io/docs/javascript-api/k6-metrics/)
- [Performance Testing Best Practices](https://k6.io/docs/test-types/load-testing/)
