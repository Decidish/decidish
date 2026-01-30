# Decidish Load Testing v2.0 Guide

## Quick Start

```bash
# Quick validation (5 VUs, 30 seconds) - with Grafana metrics
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw --vus 5 --duration 30s /scripts/load_test_v2.js

# Standard test (50 VUs, 5 minutes) - with Grafana metrics
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw /scripts/load_test_v2.js

# Custom VUs and duration - with Grafana metrics
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw --vus 100 --duration 10m /scripts/load_test_v2.js
```

## Test Scenarios

### 1. Standard Test (Default)
Constant load for steady-state performance testing.
```bash
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw /scripts/load_test_v2.js
```

### 2. Scalability Test
Ramp from 0 to 500 VUs to test horizontal scaling.
```bash
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw -e SCENARIO=scalability /scripts/load_test_v2.js
```
- Ramps: 0 → 10 → 50 → 100 → 200 → 500 VUs over 18 minutes
- Shows how latency changes as load increases
- Identifies breaking points

### 3. Spike Test
Sudden burst of users to test resilience.
```bash
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw -e SCENARIO=spike /scripts/load_test_v2.js
```
- 10 → 200 VUs spike in 10 seconds
- Tests auto-scaling and recovery

### 4. Soak Test  
Long duration to find memory leaks.
```bash
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw -e SCENARIO=soak -e DURATION=30m /scripts/load_test_v2.js
```

### 5. Breakpoint Test
Find maximum capacity (requests per second).
```bash
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw -e SCENARIO=breakpoint /scripts/load_test_v2.js
```
- Ramps request rate: 10 → 50 → 100 → 200 → 500 → 1000 req/s
- Finds the breaking point

## User Flows Tested

| Flow | % of Users | Description |
|------|------------|-------------|
| Signup | 30% | Register → Login → Questionnaire → Market → Swipe |
| Login | 70% | Login → Random activity (swipe/shop/search/history) |

### Detailed User Activities
- **Swipe Flow**: Get recommendations → Swipe 5-10 recipes (60% like, 40% dislike)
- **Shopping Flow**: Generate shopping list → Select products → Add to list
- **Search Flow**: Search products + Search recipes
- **History Flow**: View user history, shopping history, liked recipes
- **Management Flow**: Check items, update quantities, complete list

## Key Metrics

### Per-Service Latency
- `auth_service_latency` - Login/Registration
- `core_service_latency` - Shopping endpoints
- `personalization_service_latency` - Recommendations, preferences

### Per-Endpoint Latency
- `recommendation_latency` - Recipe recommendations
- `shopping_list_generate_latency` - Generate shopping list with products
- `shopping_list_add_latency` - Add items to list
- `product_search_latency` - Product search
- `recipe_search_latency` - Recipe search
- `market_fetch_latency` - Get markets by postal code

### Flow Completion Counters
- `signup_flow_complete` - New user registrations
- `login_flow_complete` - Returning user logins
- `swipe_flow_complete` - Recipe swipe sessions
- `shopping_flow_complete` - Shopping lists created

## Grafana Dashboard

### Dashboard Panels
1. **Overview KPIs**: VUs, Success Rate, p95 Latency, Throughput, Error Rate
2. **Horizontal Scalability**: Load vs Throughput (linear = good scaling)
3. **Bottleneck Detection**: Load vs Latency (look for exponential growth)
4. **Per-Service Latency**: Auth vs Core vs Personalization
5. **Per-Endpoint Latency**: Identify slowest endpoints
6. **User Flow Metrics**: Signups, Logins, Swipes, Shopping completions
7. **Error Analysis**: Error rate over time
8. **Capacity Estimation**: RPS per VU, estimated max users

## Thresholds

| Metric | Threshold | Purpose |
|--------|-----------|---------|
| http_req_duration p95 | < 3000ms | Response time SLA |
| error_rate | < 1% | Custom error tracking |
| recommendation_latency p95 | < 2000ms | ML recommendations |
| shopping_list_generate_latency p95 | < 5000ms | Product matching |

## Database Seeding

Before running load tests, ensure the database is seeded:
```bash
./k6-scripts/seed_load_test.sh
```

This seeds:
- Products across 274 markets
- 95% ingredient-to-product mappings

## Expected 404 Responses

Some endpoints return 404 for new users (not errors):
- `GET /personalization/api/v1/user/preferences` - No preferences yet
- `GET /personalization/api/v1/user/liked-recipes` - No liked recipes yet
- `GET /personalization/api/v1/user/history` - No history yet

These appear in `http_req_failed` but are expected behavior. The custom `error_rate` metric excludes these.

## Capacity Estimation

### Target: 100,000 Concurrent Users

To test scalability to 100k users:

1. **Run scalability scenario**:
   ```bash
   docker exec -it decidish-k6-1 k6 run -e SCENARIO=scalability /scripts/load_test_v2.js
   ```

2. **Watch Grafana dashboard** for:
   - Linear throughput growth with VU increase
   - Stable latency (not exponential growth)
   - Error rate staying < 1%

3. **Scale infrastructure** if bottlenecks appear:
   - Add core-server replicas (horizontal scaling)
   - Add personalization-server replicas
   - Increase PostgreSQL connection pool
   - Add Redis caching for hot paths

### Scalability Formula
```
Estimated Max Users = (RPS per VU) × 1000 / (p95 latency in seconds)
```

Example: 2 RPS/VU × 1000 / 0.5s = 4,000 concurrent users per instance

With horizontal scaling: 4,000 × N instances = target capacity
