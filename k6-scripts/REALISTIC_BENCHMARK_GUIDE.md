# Decidish Realistic User Benchmark Guide

## Overview

This benchmark script (`realistic_user_benchmark.js`) simulates **realistic user behavior patterns** to estimate how many concurrent users the application can sustain (target: 100,000+).

Unlike the previous load tests that run continuous operations, this benchmark models actual user behavior with:
- Realistic activity distribution
- Think times between actions
- Session-based patterns (users come and go)
- Weekly usage cycles (max 14 recipes per user per week)

## Quick Start

```bash
# Quick validation (10 VUs, 1 minute)
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw \
  --vus 10 --duration 1m /scripts/realistic_user_benchmark.js

# Standard test (100 VUs, 10 minutes) - recommended for initial testing
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw \
  /scripts/realistic_user_benchmark.js

# Scalability test - find performance curve up to 1000 VUs
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw \
  -e SCENARIO=scalability /scripts/realistic_user_benchmark.js

# Maximum capacity test - find breaking point (up to 5000 VUs)
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw \
  -e SCENARIO=max_capacity /scripts/realistic_user_benchmark.js
```

## Key Features

### 1. Uses Only Existing Munich Markets
The benchmark uses **only the 20 Munich markets already in your database** (postal code: 80809). This ensures:
- No external API calls for market fetching during normal operation
- Consistent test environment
- Realistic product-ingredient matching

### 2. Rate Limit Tracking
Custom metrics track rate limiting from external APIs:
- `rate_limit_hits` - Total 429 responses
- `rate_limit_rate` - Percentage of rate-limited requests

### 3. Realistic User Patterns
Simulates actual user behavior rather than synthetic load.

## User Behavior Model

### New Users (10%)
New users go through the complete onboarding flow:
```
Signup → Login → Complete Questionnaire → Select Market → Swipe Recipes → Add 1-3 Recipes to List
```

### Returning Users (90%)
Returning users perform various activities with realistic distribution:

| Activity | Weight | Description |
|----------|--------|-------------|
| Recipe Swiping | 35% | Browse recipes, like/dislike, occasionally view ingredients |
| Add to Shopping List | 20% | Select a recipe and add products to shopping list |
| Check Shopping List | 15% | User is shopping - checks list, waits, checks again |
| My Recipes | 10% | Viewing liked recipes (usually when cooking) |
| Search | 8% | Search products and/or recipes (1-5 searches) |
| Shopping History | 7% | View past shopping lists |
| Update Preferences | 3% | Rarely change preferences |
| Change Market | 2% | Very rarely switch to different market |

## Test Scenarios

### 1. Standard (Default)
Constant load for baseline performance measurement.
```bash
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw /scripts/realistic_user_benchmark.js
```
- **VUs:** 100 (configurable with `-e VUS=N`)
- **Duration:** 10 minutes (configurable with `-e DURATION=Xm`)
- **Best for:** Getting baseline metrics, CI/CD integration

### 2. Scalability
Ramp up to find performance degradation points.
```bash
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw \
  -e SCENARIO=scalability /scripts/realistic_user_benchmark.js
```
Stages:
- 0 → 50 VUs (1 min warm-up)
- 50 → 100 VUs (2 min)
- 100 → 250 VUs (3 min)
- 250 → 500 VUs (3 min)
- 500 → 1000 VUs (4 min)
- 1000 VUs sustained (5 min)
- Cool down (2 min)

**Best for:** Understanding how performance scales with load.

### 3. Max Capacity
Find the absolute breaking point.
```bash
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw \
  -e SCENARIO=max_capacity /scripts/realistic_user_benchmark.js
```
Stages:
- 100 → 500 → 1000 → 2000 → 3000 → 5000 VUs
- Sustain peak for 5 minutes

**Best for:** Finding maximum concurrent users before failure.

### 4. Soak
Long-duration test for stability and memory leak detection.
```bash
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw \
  -e SCENARIO=soak -e DURATION=2h /scripts/realistic_user_benchmark.js
```
**Best for:** Finding memory leaks, connection pool issues, cache problems.

### 5. Spike
Sudden traffic bursts to test resilience.
```bash
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw \
  -e SCENARIO=spike /scripts/realistic_user_benchmark.js
```
- Baseline: 50 VUs
- Spike 1: 50 → 500 in 10 seconds
- Spike 2: 50 → 1000 in 10 seconds

**Best for:** Testing auto-scaling, circuit breakers, graceful degradation.

### 6. Quick
Fast validation test.
```bash
docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw \
  -e SCENARIO=quick /scripts/realistic_user_benchmark.js
```
**Best for:** Quick smoke tests, development iterations.

## Debug Mode

Enable debug logging to troubleshoot issues:

```bash
# All categories
docker exec -it decidish-k6-1 k6 run -e DEBUG=all --vus 1 --duration 30s /scripts/realistic_user_benchmark.js

# Specific categories
docker exec -it decidish-k6-1 k6 run -e DEBUG=auth,shopping,market --vus 5 --duration 1m /scripts/realistic_user_benchmark.js
```

### Debug Categories
| Category | Description |
|----------|-------------|
| `auth` | Login/Signup flows |
| `preferences` | Questionnaire and preference updates |
| `market` | Market selection and changes |
| `recommendations` | Recipe recommendations and swiping |
| `shopping` | Shopping list generation and management |
| `search` | Product and recipe search |
| `history` | History and my-recipes views |
| `flow` | Overall user flow decisions |
| `all` | Enable all categories |

## Key Metrics

### Rate Limiting (External API)
| Metric | Description |
|--------|-------------|
| `rate_limit_hits` | Total number of 429 responses |
| `rate_limit_rate` | Percentage of requests that were rate limited |

**Threshold:** `rate_limit_rate < 5%`

### Error Tracking
| Metric | Description |
|--------|-------------|
| `error_rate` | Custom error tracking (excludes expected 404s) |
| `failed_requests` | Count of actual failures |

### Latency by Service
| Metric | Description |
|--------|-------------|
| `auth_latency` | Authentication service (login/register) |
| `core_latency` | Core/Shopping service |
| `personalization_latency` | Personalization service |

### Latency by Endpoint
| Metric | Description | Threshold |
|--------|-------------|-----------|
| `recommendation_latency` | Recipe recommendations | p95 < 2500ms |
| `shopping_list_generate_latency` | Generate shopping list with products | p95 < 8000ms |
| `shopping_list_add_latency` | Add items to shopping list | - |
| `product_search_latency` | Search products | - |
| `recipe_search_latency` | Search recipes | - |
| `market_fetch_latency` | Fetch markets | - |

### Flow Completion Counters
| Metric | Description |
|--------|-------------|
| `signup_complete` | New user registrations |
| `login_complete` | Returning user logins |
| `questionnaire_complete` | Questionnaire submissions |
| `recipe_swipe_complete` | Recipe swipe sessions |
| `shopping_list_create_complete` | Shopping lists created |
| `product_selection_complete` | Product selections completed |
| `recipes_added_total` | Total recipes added to lists |
| `products_selected_total` | Total products selected |
| `searches_performed` | Total search queries |
| `shopping_list_checks` | Shopping list view/checks |

### Session Metrics
| Metric | Description |
|--------|-------------|
| `active_users` | Currently active VUs |
| `shopping_sessions_active` | Users currently in shopping mode |

## Estimating 100,000 Users

### Calculation Method

1. **Run scalability test:**
   ```bash
   docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw \
     -e SCENARIO=scalability /scripts/realistic_user_benchmark.js
   ```

2. **Observe in Grafana:**
   - **Linear throughput growth** = good horizontal scaling
   - **Exponential latency growth** = bottleneck detected
   - **Stable error rate** = system healthy

3. **Calculate capacity:**
   ```
   Max Concurrent Users = Peak VUs where (p95 latency < 3s AND error_rate < 2%)
   ```

4. **With realistic patterns:**
   Since users aren't constantly active (this benchmark models real behavior):
   ```
   Supported Registered Users ≈ Max Concurrent Users × Activity Factor
   ```
   Where Activity Factor ≈ 10-20 (only 5-10% of registered users active at once)

### Example Estimation
If the system handles 1000 VUs with < 2s p95 latency:
- **Concurrent users:** ~1,000
- **With activity factor 15:** ~15,000 registered users during peak
- **With geographic distribution (multiple peaks):** ~50,000+ registered users

To support 100,000 users:
- Need ~5,000-10,000 concurrent VU capacity
- OR horizontal scaling to distribute load

## Database Seeding Requirements

Before running benchmarks, ensure:

1. **20 Munich markets are loaded** (postal code: 80809)
2. **Products are loaded for all markets**
3. **~2000 recipes exist with ingredients**
4. **Ingredient-product mappings exist (95%+ coverage)**

Verify with:
```bash
docker exec -it decidish-k6-1 k6 run -e DEBUG=all --vus 1 --duration 30s /scripts/realistic_user_benchmark.js
```

Check setup output for:
```
[Setup] ✓ Found 20 markets in Munich (PLZ: 80809)
```

## Expected 404 Responses

These are NOT errors - they're expected for new/fresh users:

| Endpoint | When 404 is OK |
|----------|----------------|
| `GET /personalization/api/v1/user/preferences` | User hasn't completed questionnaire |
| `GET /personalization/api/v1/user/liked-recipes` | User hasn't liked any recipes |
| `GET /personalization/api/v1/user/history` | User has no activity history |
| `GET /personalization/api/v1/user/active/list` | User has no shopping list |
| `GET /personalization/api/v1/recipes/recommend` | User needs to complete setup first |

The custom `error_rate` metric correctly excludes these expected 404s.

## Grafana Dashboard Integration

All metrics are exported to Prometheus and visible in Grafana. Key panels to watch:

1. **Rate Limit Hits** - If this grows, you're hitting external API limits
2. **p95 Latency by Endpoint** - Identify bottlenecks
3. **Error Rate** - Should stay < 2%
4. **Active Users vs Throughput** - Should be linear for good scaling
5. **Shopping List Generate Latency** - Most expensive operation

## Troubleshooting

### High Rate Limit Hits
- External API (REWE) is limiting requests
- Solutions:
  - Implement better caching
  - Add rate limiting on your side
  - Request higher limits from API provider

### High Shopping List Generate Latency
- Product matching is slow
- Solutions:
  - Add indexes to ingredient_products table
  - Cache popular ingredient-product mappings
  - Optimize product search queries

### Error Rate Too High
- Check logs for specific failure patterns
- Enable DEBUG mode to see which flows fail
- Common issues: DB connection pool exhaustion, timeouts

### No Recommendations Available
- User setup incomplete (questionnaire + market)
- User embedding not created
- Check personalization service logs
