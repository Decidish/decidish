/*
 * Decidish Realistic User Benchmark v1.0
 * 
 * This script simulates REALISTIC user behavior patterns to estimate
 * how many concurrent users the application can sustain (target: 100,000+).
 * 
 * Key Features:
 * - Uses ONLY the 20 Munich markets already in DB (postal code: 80809)
 * - Models realistic usage patterns with intervals (not constant load)
 * - Tracks external API rate limiting
 * - Simulates shopping sessions with breaks
 * - Models weekly usage cycles (users add max 14 recipes/week)
 * 
 * User Behavior Patterns:
 * - New User (10%): signup → questionnaire → market selection → swipe & add 1-3 recipes → idle
 * - Returning User (90%): login → various activities based on realistic weights
 * 
 * Activities Distribution:
 * - Recipe Swiping: 35% (browse, like/dislike, occasionally view ingredients)
 * - Shopping List Add: 20% (add recipe to list, select products)
 * - Check Shopping List: 15% (when shopping - check, wait, check again)
 * - My Recipes Page: 10% (when cooking - check recipes they liked)
 * - Search: 8% (search products and/or recipes, 1-5 searches)
 * - Shopping History: 7% (view past shopping lists)
 * - Update Preferences: 3% (rarely change preferences)
 * - Change Market: 2% (very rarely)
 * 
 * Usage:
 *   # Quick validation (10 VUs for 1 minute)
 *   docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw \
 *     --vus 10 --duration 1m /scripts/realistic_user_benchmark.js
 *   
 *   # Standard test (100 VUs for 10 minutes)
 *   docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw /scripts/realistic_user_benchmark.js
 *   
 *   # Scalability test (ramp to 1000+ VUs)
 *   docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw \
 *     -e SCENARIO=scalability /scripts/realistic_user_benchmark.js
 *   
 *   # Max capacity test (find breaking point)
 *   docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw \
 *     -e SCENARIO=max_capacity /scripts/realistic_user_benchmark.js
 *   
 *   # Long soak test (2 hours)
 *   docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw \
 *     -e SCENARIO=soak -e DURATION=2h /scripts/realistic_user_benchmark.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';

// ============= CONFIGURATION =============
const BASE_URL = __ENV.BASE_URL || 'http://nginx';
const SCENARIO = __ENV.SCENARIO || 'standard';

// Debug Configuration
const DEBUG = __ENV.DEBUG || '';
const debugCategories = DEBUG ? DEBUG.toLowerCase().split(',').map(c => c.trim()) : [];
const isDebugEnabled = (category) => {
  if (!DEBUG) return false;
  if (DEBUG.toLowerCase() === 'all') return true;
  return debugCategories.includes(category.toLowerCase());
};

// Munich postal codes - these are the markets already in the DB
// All 20 markets are from Munich area
const MUNICH_POSTAL_CODES = [
  '80809', // München - Primary test area
  '80331', // München Mitte
  '80333', // München Altstadt
  '80335', // München Hauptbahnhof
  '80336', // München Ludwigsvorstadt
  '80337', // München Isarvorstadt
  '80469', // München Au
  '80538', // München Lehel
  '80539', // München Maxvorstadt
  '80634', // München Neuhausen
  '80636', // München Nymphenburg
  '80637', // München Moosach
  '80686', // München Laim
  '80687', // München Pasing
  '80689', // München Obermenzing
  '80796', // München Schwabing
  '80797', // München Schwabing-West
  '80798', // München Maxvorstadt-Nord
  '80799', // München Universität
  '80801', // München Schwabing-Freimann
];

// Use only the main postal code for consistent testing with existing markets
const MARKET_POSTAL_CODE = '80809';

// User behavior configuration
const NEW_USER_PERCENTAGE = 0.10; // 10% new users
const MAX_RECIPES_PER_SESSION = 3; // Users typically add 1-3 recipes per session
const MAX_RECIPES_PER_WEEK = 14; // Max recipes a user would add in a week

// Realistic think times (in seconds)
const THINK_TIMES = {
  quickGlance: { min: 0.5, max: 1.5 },      // Quick look at something
  readRecipe: { min: 2, max: 8 },            // Reading recipe ingredients/instructions
  decideSwipe: { min: 0.3, max: 2 },         // Deciding to like/dislike
  selectProduct: { min: 1, max: 4 },         // Choosing between product options
  browseSearch: { min: 1, max: 5 },          // Browsing search results
  checkShoppingList: { min: 3, max: 15 },    // Checking items on shopping list
  betweenChecks: { min: 120, max: 1800 },    // Time between shopping list checks (2-30 min)
  betweenSessions: { min: 1, max: 5 },       // Time between activities in a session
};

// Search terms
const PRODUCT_SEARCH_TERMS = [
  'Milch', 'Butter', 'Käse', 'Brot', 'Eier',
  'Tomaten', 'Kartoffeln', 'Zwiebeln', 'Knoblauch', 'Paprika',
  'Hähnchen', 'Rind', 'Schwein', 'Lachs', 'Thunfisch',
  'Reis', 'Nudeln', 'Mehl', 'Zucker', 'Salz',
  'Öl', 'Essig', 'Senf', 'Ketchup', 'Joghurt',
  'Äpfel', 'Bananen', 'Orangen', 'Zitronen', 'Sahne',
  'Brokkoli', 'Spinat', 'Karotten', 'Zucchini', 'Champignons',
];

const RECIPE_SEARCH_TERMS = [
  'Pasta', 'Pizza', 'Salat', 'Suppe', 'Curry',
  'Steak', 'Burger', 'Wrap', 'Bowl', 'Risotto',
  'Kuchen', 'Auflauf', 'Eintopf', 'Schnitzel', 'Gulasch',
  'Pfannkuchen', 'Omelette', 'Lasagne', 'Spaghetti', 'Carbonara',
  'Thai', 'Mexikanisch', 'Italienisch', 'Asiatisch', 'Vegetarisch',
  'Fisch', 'Vegan', 'Dessert', 'Frühstück', 'Mittagessen',
];

// Common ingredients that users would expect to always find in a supermarket
// These are used to distinguish "expected matches" from "rare/exotic ingredients"
const COMMON_INGREDIENTS = [
  // Dairy
  'milch', 'butter', 'käse', 'sahne', 'joghurt', 'quark', 'schmand', 'crème fraîche',
  // 'milk', 'cheese', 'cream', 'yogurt',
  // Eggs
  'eier', 'ei', 'eggs', 'egg',
  // Bread & Grains
  'brot', 'mehl', 'reis', 'nudeln', 'pasta', 'spaghetti', 'haferflocken',
  // 'bread', 'flour', 'rice', 'noodles', 'oats',
  // Basics
  'salz', 'pfeffer', 'zucker', 'öl', 'olivenöl', 'sonnenblumenöl', 'essig',
  // 'salt', 'pepper', 'sugar', 'oil', 'olive oil', 'vinegar',
  // Common vegetables
  'kartoffel', 'kartoffeln', 'zwiebel', 'zwiebeln', 'knoblauch', 'tomate', 'tomaten',
  'karotte', 'karotten', 'gurke', 'paprika', 'zucchini', 'brokkoli', 'spinat',
  // 'potato', 'onion', 'garlic', 'tomato', 'carrot', 'cucumber', 'pepper',
  // Common fruits
  'apfel', 'äpfel', 'banane', 'bananen', 'zitrone', 'zitronen', 'orange', 'orangen',
  // 'apple', 'banana', 'lemon', 'orange',
  // Common proteins
  'hähnchen', 'huhn', 'rind', 'schwein', 'hackfleisch', 'schinken', 'wurst',
  // 'chicken', 'beef', 'pork', 'ham',
  // Condiments
  'senf', 'ketchup', 'mayonnaise', 'sojasoße', 'sojasauce',
  // 'mustard', 'soy sauce',
];

// ============= CUSTOM METRICS =============
// Metric names are designed to match the Grafana dashboard expectations
// k6 automatically prefixes these with 'k6_' in Prometheus output

// ===== ERROR TRACKING =====
const errorRate = new Rate('error_rate');                    // Real error rate (excludes expected 404s)
const errors = new Rate('errors');                           // Alias for compatibility
const failedRequests = new Counter('failed_requests');       // Total failed request count

// ===== RATE LIMITING TRACKING (EXTERNAL REWE API) =====
// These track when OUR app returns errors due to REWE rate limiting
const rateLimitHits = new Counter('rate_limit_hits');        // Count of 429 responses
const rateLimitRate = new Rate('rate_limit_rate');           // Rate of 429 responses
const gatewayTimeouts = new Counter('gateway_timeouts');     // 504 Gateway Timeout (often rate limit related)
const gatewayErrors = new Counter('gateway_errors');         // 502 Bad Gateway
const reweApiErrors = new Counter('rewe_api_errors');        // All REWE-related errors (429, 502, 504)

// Track which endpoints trigger rate limits
const shoppingListRateLimits = new Counter('shopping_list_rate_limits');  // Rate limits during shopping list generation
const productSearchRateLimits = new Counter('product_search_rate_limits'); // Rate limits during product search

// ===== PER-SERVICE LATENCY (for bottleneck detection) =====
// These match the Grafana dashboard panel "Per-Service Latency (p95)"
const authServiceLatency = new Trend('auth_service_latency', true);                     // Auth service (login, register)
const coreServiceLatency = new Trend('core_service_latency', true);                     // Core/Shopping service (markets, products, shopping list)
const personalizationServiceLatency = new Trend('personalization_service_latency', true); // Personalization service (preferences, recommendations)

// ===== PER-ENDPOINT LATENCY (for detailed bottleneck analysis) =====
// These match the Grafana dashboard panel "Per-Endpoint Latency (p95)"
const recommendationLatency = new Trend('recommendation_latency', true);                 // GET /personalization/api/v1/recipes/recommend
const shoppingListGenerateLatency = new Trend('shopping_list_generate_latency', true);   // POST /shopping/shopping-list/generate
const shoppingListAddLatency = new Trend('shopping_list_add_latency', true);             // POST /personalization/api/v1/user/add-to-list
const productSearchLatency = new Trend('product_search_latency', true);                  // GET /shopping/api/v1/markets/search/products
const recipeSearchLatency = new Trend('recipe_search_latency', true);                    // GET /personalization/recipes/search
const marketFetchLatency = new Trend('market_fetch_latency', true);                      // GET /shopping/api/v1/markets

// Additional endpoint latencies for complete coverage
const loginLatency = new Trend('login_latency', true);                                   // POST /auth/login
const registerLatency = new Trend('register_latency', true);                             // POST /auth/register
const preferencesLatency = new Trend('preferences_latency', true);                       // POST /personalization/api/v1/user/preferences
const marketSelectLatency = new Trend('market_select_latency', true);                    // POST /personalization/api/v1/user/market
const recipeSwipeLatency = new Trend('recipe_swipe_latency', true);                      // POST /personalization/api/v1/user/record/:action/:recipeId
const shoppingListGetLatency = new Trend('shopping_list_get_latency', true);             // GET /personalization/api/v1/user/active/list
const likedRecipesLatency = new Trend('liked_recipes_latency', true);                    // GET /personalization/api/v1/user/liked-recipes
const shoppingHistoryLatency = new Trend('shopping_history_latency', true);              // GET /personalization/api/v1/user/shopping/history
const getPreferencesLatency = new Trend('get_preferences_latency', true);                // GET /personalization/api/v1/user/preferences

// ===== USER FLOW COMPLETION METRICS =====
// These match the Grafana dashboard "User Flow Completions" panel
const signupFlowComplete = new Counter('signup_flow_complete');           // Full signup flow completed
const loginFlowComplete = new Counter('login_flow_complete');             // Login flow completed  
const swipeFlowComplete = new Counter('swipe_flow_complete');             // Recipe swipe session completed
const shoppingFlowComplete = new Counter('shopping_flow_complete');       // Shopping list creation completed
const questionnaireComplete = new Counter('questionnaire_complete');       // Questionnaire completed

// ===== SESSION & ACTIVITY METRICS =====
const activeUsers = new Gauge('active_users');                            // Currently active VUs
const recipesAddedTotal = new Counter('recipes_added_total');             // Total recipes added to shopping lists
const productsSelectedTotal = new Counter('products_selected_total');     // Total products selected
const searchesPerformed = new Counter('searches_performed');              // Total search queries

// ===== SHOPPING BEHAVIOR METRICS =====
const shoppingListChecks = new Counter('shopping_list_checks');           // Shopping list view/checks
const shoppingSessionsActive = new Gauge('shopping_sessions_active');     // Users currently in shopping mode

// ===== INGREDIENT MATCHING METRICS =====
// Track unmatched ingredients (no product options found)
const ingredientConsulted = new Counter('ingredient_consulted');          // Total ingredients consulted by users
const ingredientMatched = new Counter('ingredient_matched');              // Ingredients with product options
const ingredientUnmatched = new Counter('ingredient_unmatched');          // Ingredients with no product options
const ingredientMatchRate = new Rate('ingredient_match_rate');            // Percentage of matched ingredients

// Track common vs uncommon ingredients for context
const commonIngredientUnmatched = new Counter('common_ingredient_unmatched');    // Common ingredients without options
const uncommonIngredientUnmatched = new Counter('uncommon_ingredient_unmatched'); // Uncommon ingredients without options

// ===== SCALABILITY METRICS =====
const requestsPerVU = new Gauge('requests_per_vu');                       // Efficiency metric for scalability
const concurrentOperations = new Gauge('concurrent_operations');          // Track concurrent operations

// ============= TEST SCENARIOS =============

export const options = getScenarioOptions();

function getScenarioOptions() {
  const baseThresholds = {
    http_req_duration: ['p(95)<3000', 'p(99)<8000'],
    error_rate: ['rate<0.02'],  // 2% error rate max
    rate_limit_rate: ['rate<0.05'], // Less than 5% rate limited
    recommendation_latency: ['p(95)<2500'],
    shopping_list_generate_latency: ['p(95)<8000'],
  };

  const scenarios = {
    // Standard test: Constant realistic load
    standard: {
      scenarios: {
        realistic_load: {
          executor: 'constant-vus',
          vus: parseInt(__ENV.VUS) || 100,
          duration: __ENV.DURATION || '10m',
        },
      },
      thresholds: baseThresholds,
    },

    // Scalability test: Ramp up to find performance curve
    scalability: {
      scenarios: {
        scalability_ramp: {
          executor: 'ramping-vus',
          startVUs: 0,
          stages: [
            { duration: '1m', target: 50 },     // Warm up
            { duration: '2m', target: 100 },    // Light load
            { duration: '3m', target: 250 },    // Moderate load
            { duration: '3m', target: 500 },    // Heavy load
            { duration: '4m', target: 1000 },   // Very heavy load
            { duration: '5m', target: 1000 },   // Sustain peak
            { duration: '2m', target: 0 },      // Cool down
          ],
          gracefulRampDown: '30s',
        },
      },
      thresholds: {
        http_req_duration: ['p(95)<5000', 'p(99)<15000'],
        error_rate: ['rate<0.05'],
        rate_limit_rate: ['rate<0.10'],
      },
    },

    // Max capacity: Find the absolute breaking point
    max_capacity: {
      scenarios: {
        find_limits: {
          executor: 'ramping-vus',
          startVUs: 100,
          stages: [
            { duration: '2m', target: 500 },
            { duration: '2m', target: 1000 },
            { duration: '2m', target: 2000 },
            { duration: '3m', target: 3000 },
            { duration: '3m', target: 5000 },
            { duration: '5m', target: 5000 },   // Sustain peak
            { duration: '2m', target: 0 },
          ],
          gracefulRampDown: '60s',
        },
      },
      thresholds: {
        http_req_failed: ['rate<0.15'],
        http_req_duration: ['p(95)<20000'],
      },
    },

    // Soak test: Long duration for stability
    soak: {
      scenarios: {
        long_duration: {
          executor: 'constant-vus',
          vus: parseInt(__ENV.VUS) || 200,
          duration: __ENV.DURATION || '30m',
        },
      },
      thresholds: baseThresholds,
    },

    // Spike test: Sudden traffic bursts
    spike: {
      scenarios: {
        traffic_spike: {
          executor: 'ramping-vus',
          startVUs: 50,
          stages: [
            { duration: '1m', target: 50 },     // Baseline
            { duration: '10s', target: 500 },   // Spike!
            { duration: '2m', target: 500 },    // Sustain spike
            { duration: '10s', target: 50 },    // Drop
            { duration: '1m', target: 50 },     // Recovery
            { duration: '10s', target: 1000 },  // Bigger spike!
            { duration: '2m', target: 1000 },   // Sustain
            { duration: '1m', target: 0 },      // Cool down
          ],
        },
      },
      thresholds: {
        http_req_duration: ['p(95)<10000'],
        error_rate: ['rate<0.10'],
      },
    },

    // Quick validation
    quick: {
      scenarios: {
        quick_test: {
          executor: 'constant-vus',
          vus: parseInt(__ENV.VUS) || 10,
          duration: __ENV.DURATION || '1m',
        },
      },
      thresholds: baseThresholds,
    },
  };

  return scenarios[SCENARIO] || scenarios.standard;
}

// ============= SETUP PHASE =============

export function setup() {
  console.log('='.repeat(60));
  console.log('Decidish Realistic User Benchmark v1.0');
  console.log('='.repeat(60));
  console.log(`[Setup] Scenario: ${SCENARIO}`);
  console.log(`[Setup] Base URL: ${BASE_URL}`);
  console.log(`[Setup] New User %: ${NEW_USER_PERCENTAGE * 100}%`);
  if (DEBUG) console.log(`[Setup] Debug Mode: ${DEBUG}`);
  
  // Health check
  console.log('[Setup] Checking system health...');
  const healthRes = http.get(`${BASE_URL}/shopping/actuator/health`, { timeout: '10s' });
  if (healthRes.status !== 200) {
    console.warn(`[Setup] Health check returned ${healthRes.status}`);
  } else {
    console.log('[Setup] ✓ System healthy');
  }
  
  // Check Munich markets availability
  console.log('[Setup] Checking Munich markets availability...');
  const marketRes = http.get(`${BASE_URL}/shopping/api/v1/markets?plz=${MARKET_POSTAL_CODE}`);
  let availableMarkets = [];
  
  if (marketRes.status === 200) {
    try {
      const markets = marketRes.json();
      if (Array.isArray(markets)) {
        availableMarkets = markets.map(m => ({
          id: m.id || m.market_id,
          name: m.name || m.market_name,
        }));
        console.log(`[Setup] ✓ Found ${availableMarkets.length} markets in Munich (PLZ: ${MARKET_POSTAL_CODE})`);
      }
    } catch (e) {
      console.error(`[Setup] Failed to parse markets: ${e.message}`);
    }
  } else {
    console.error(`[Setup] Markets fetch failed: ${marketRes.status}`);
  }
  
  if (availableMarkets.length === 0) {
    throw new Error('[CRITICAL] No markets found! Please seed the database first.');
  }
  
  // Pre-create test user pool
  // Scale user pool based on scenario to handle up to 1000 VUs
  // Rule: 5 users per VU to avoid token contention during parallel logins
  const userPool = [];
  const scenarioVUs = {
    'standard': 100,
    'scalability': 1000,
    'max_capacity': 5000,
    'soak': 200,
    'spike': 1000,
    'quick': 10,
  };
  const targetVUs = parseInt(__ENV.VUS) || scenarioVUs[SCENARIO] || 100;
  const numUsers = parseInt(__ENV.USERS) || Math.max(targetVUs * 5, 500);
  let createdCount = 0;
  let existingCount = 0;
  
  console.log(`[Setup] Creating ${numUsers} test users for ${targetVUs} target VUs...`);
  for (let i = 0; i < numUsers; i++) {
    const timestamp = Date.now();
    const username = `bench_realistic_${i}_${timestamp}@test.com`;
    const password = 'BenchmarkTest123!';
    
    const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
      username: username,
      password: password,
      name: `Benchmark User ${i}`,
    }), { headers: { 'Content-Type': 'application/json' } });
    
    const isDuplicate = registerRes.status === 409 || 
                        (registerRes.status === 500 && registerRes.body && registerRes.body.includes('duplicate'));
    
    if (registerRes.status === 200 || registerRes.status === 201) {
      userPool.push({ username, password, isSetUp: false });
      createdCount++;
    } else if (isDuplicate) {
      userPool.push({ username, password, isSetUp: true });
      existingCount++;
    } else if (i < 5) {
      // Only log first few failures to avoid spam
      console.warn(`[Setup] User ${i} registration failed: ${registerRes.status}`);
    }
  }
  
  console.log(`[Setup] ✓ User pool ready: ${createdCount} new, ${existingCount} existing`);
  console.log('='.repeat(60));
  
  return {
    userPool,
    markets: availableMarkets,
    config: {
      newUserPercentage: NEW_USER_PERCENTAGE,
      maxRecipesPerSession: MAX_RECIPES_PER_SESSION,
      marketPostalCode: MARKET_POSTAL_CODE,
    },
  };
}

// ============= HELPER FUNCTIONS =============

function getAuthHeaders(authToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Cookie'] = `auth_token=${authToken}`;
  }
  return headers;
}

function extractAuthToken(response) {
  const setCookie = response.headers['Set-Cookie'];
  if (setCookie) {
    const match = setCookie.match(/auth_token=([^;]+)/);
    if (match) return match[1];
  }
  return '';
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return min + Math.random() * (max - min);
}

function thinkTime(type) {
  const times = THINK_TIMES[type] || { min: 0.5, max: 2 };
  // Use shorter times in load tests (10% of realistic)
  const scaleFactor = 0.1;
  return randomFloat(times.min * scaleFactor, times.max * scaleFactor);
}

function weightedRandomChoice(items, weights) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Enhanced request measurement with comprehensive error and rate limit tracking
function measureRequest(metricTrend, serviceMetric, requestFn, endpointName = '') {
  const start = Date.now();
  const response = requestFn();
  const duration = Date.now() - start;
  
  // Record latency for specific endpoint
  metricTrend.add(duration);
  
  // Record latency for service-level metric (for bottleneck detection)
  if (serviceMetric) {
    serviceMetric.add(duration);
  }
  
  // Comprehensive error and rate limit tracking
  if (response.status === 429) {
    // Rate limit from REWE API (passed through our backend)
    rateLimitHits.add(1);
    rateLimitRate.add(1);
    reweApiErrors.add(1);
    
    // Track which endpoint triggered the rate limit
    if (endpointName.includes('shopping-list') || endpointName.includes('generate')) {
      shoppingListRateLimits.add(1);
    } else if (endpointName.includes('search')) {
      productSearchRateLimits.add(1);
    }
    
    console.warn(`[RATE LIMIT 429] ${endpointName || 'Unknown endpoint'} - Duration: ${duration}ms`);
  } else if (response.status === 504) {
    // Gateway timeout - often indicates REWE API is slow or rate limiting
    gatewayTimeouts.add(1);
    reweApiErrors.add(1);
    rateLimitRate.add(0); // Not a direct rate limit
    
    if (endpointName.includes('shopping-list') || endpointName.includes('generate')) {
      shoppingListRateLimits.add(1);
    }
    
    console.warn(`[GATEWAY TIMEOUT 504] ${endpointName || 'Unknown endpoint'} - Duration: ${duration}ms`);
  } else if (response.status === 502) {
    // Bad gateway - backend service unavailable
    gatewayErrors.add(1);
    reweApiErrors.add(1);
    rateLimitRate.add(0);
    
    console.warn(`[BAD GATEWAY 502] ${endpointName || 'Unknown endpoint'} - Duration: ${duration}ms`);
  } else if (response.status === 503) {
    // Service unavailable - could be rate limiting
    reweApiErrors.add(1);
    rateLimitRate.add(0);
    
    console.warn(`[SERVICE UNAVAILABLE 503] ${endpointName || 'Unknown endpoint'} - Duration: ${duration}ms`);
  } else {
    rateLimitRate.add(0);
  }
  
  return response;
}

// Simple measurement for endpoints that don't need service-level tracking
function measureEndpoint(metricTrend, requestFn, endpointName = '') {
  return measureRequest(metricTrend, null, requestFn, endpointName);
}

function generatePreferenceVector() {
  return Array(35).fill(0).map(() => Math.random());
}

function isRateLimited(response) {
  return response.status === 429;
}

// Check if an ingredient name is considered "common" (expected to always have products)
function isCommonIngredient(ingredientName) {
  if (!ingredientName) return false;
  const name = ingredientName.toLowerCase().trim();
  return COMMON_INGREDIENTS.some(common => 
    name.includes(common) || common.includes(name)
  );
}

// Track ingredient matching statistics
function trackIngredientMatching(ingredientGroup) {
  const ingredientName = ingredientGroup.ingredientName || ingredientGroup.ingredient_name || '';
  const hasOptions = ingredientGroup.options && ingredientGroup.options.length > 0;
  
  ingredientConsulted.add(1);
  
  if (hasOptions) {
    ingredientMatched.add(1);
    ingredientMatchRate.add(1);
  } else {
    ingredientUnmatched.add(1);
    ingredientMatchRate.add(0);
    
    // Categorize as common or uncommon
    if (isCommonIngredient(ingredientName)) {
      commonIngredientUnmatched.add(1);
      if (isDebugEnabled('ingredients')) {
        console.warn(`[Ingredient WARN] Common ingredient without options: "${ingredientName}"`);
      }
    } else {
      uncommonIngredientUnmatched.add(1);
      if (isDebugEnabled('ingredients')) {
        console.log(`[Ingredient DEBUG] Uncommon ingredient without options: "${ingredientName}"`);
      }
    }
  }
}

// ============= USER FLOW: SIGNUP =============

function signupFlow() {
  const username = `newuser_${Date.now()}_${__VU}_${randomInt(1000, 9999)}@test.com`;
  const password = 'NewUser123!';
  
  return group('New User Signup', () => {
    // Register
    const registerRes = measureRequest(registerLatency, authServiceLatency, () =>
      http.post(`${BASE_URL}/auth/register`, JSON.stringify({
        username: username,
        password: password,
        name: `New User ${__VU}`,
      }), { headers: { 'Content-Type': 'application/json' } }),
      'auth/register'
    );
    
    const registered = check(registerRes, {
      'Registration successful': (r) => r.status === 200 || r.status === 201,
    });
    
    if (!registered) {
      errorRate.add(1);
      failedRequests.add(1);
      console.error(`[Signup ERROR] Registration failed: ${registerRes.status}`);
      return null;
    }
    
    // Login
    const loginRes = measureRequest(loginLatency, authServiceLatency, () =>
      http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        username: username,
        password: password,
      }), { headers: { 'Content-Type': 'application/json' } }),
      'auth/login'
    );
    
    const loggedIn = check(loginRes, {
      'Login successful': (r) => r.status === 200,
    });
    
    if (!loggedIn) {
      errorRate.add(1);
      errors.add(1);
      failedRequests.add(1);
      console.error(`[Signup ERROR] Login failed: ${loginRes.status}`);
      return null;
    }
    
    const authToken = extractAuthToken(loginRes);
    signupFlowComplete.add(1);
    
    if (isDebugEnabled('auth')) {
      console.log(`[Signup DEBUG] New user created: ${username}`);
    }
    
    sleep(thinkTime('quickGlance'));
    return { username, password, authToken, isNew: true };
  });
}

// ============= USER FLOW: LOGIN =============

function loginFlow(userData) {
  return group('User Login', () => {
    const loginRes = measureRequest(loginLatency, authServiceLatency, () =>
      http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        username: userData.username,
        password: userData.password,
      }), { headers: { 'Content-Type': 'application/json' } }),
      'auth/login'
    );
    
    const loggedIn = check(loginRes, {
      'Login successful': (r) => r.status === 200,
    });
    
    if (!loggedIn) {
      errorRate.add(1);
      errors.add(1);
      failedRequests.add(1);
      console.error(`[Login ERROR] Failed: ${loginRes.status}`);
      return null;
    }
    
    const authToken = extractAuthToken(loginRes);
    loginFlowComplete.add(1);
    
    if (isDebugEnabled('auth')) {
      console.log(`[Login DEBUG] Logged in: ${userData.username}`);
    }
    
    sleep(thinkTime('quickGlance'));
    return { ...userData, authToken };
  });
}

// ============= USER FLOW: QUESTIONNAIRE =============

function questionnaireFlow(authToken) {
  const headers = getAuthHeaders(authToken);
  
  return group('Complete Questionnaire', () => {
    // Simulate filling out questionnaire
    sleep(thinkTime('decideSwipe')); // Quick decision time
    
    const prefVector = generatePreferenceVector();
    const allergies = Math.random() > 0.7 ? ['peanuts', 'shellfish'] : [];
    const dietary = Math.random() > 0.8 ? ['vegetarian'] : 
                    Math.random() > 0.9 ? ['vegan'] : [];
    
    const prefRes = measureRequest(preferencesLatency, personalizationServiceLatency, () =>
      http.post(`${BASE_URL}/personalization/api/v1/user/preferences`, JSON.stringify({
        dietary_restrictions: dietary,
        allergies: allergies,
        cuisine_preferences: ['italian', 'asian', 'german'].slice(0, randomInt(1, 3)),
        spice_level: ['mild', 'medium', 'hot'][randomInt(0, 2)],
        cooking_time: [15, 30, 45, 60][randomInt(0, 3)],
        budget: [50, 100, 150, 200][randomInt(0, 3)],
        skill_level: ['beginner', 'intermediate', 'advanced'][randomInt(0, 2)],
        min_cooking_time: 10,
        max_cooking_time: 60,
        preference_vector: prefVector,
      }), { headers, timeout: '10s' }),
      'personalization/preferences'
    );
    
    if (prefRes.status === 0) {
      console.warn('[Questionnaire TIMEOUT] Timed out');
      return false;
    }
    
    const saved = check(prefRes, {
      'Preferences saved': (r) => r.status === 200 || r.status === 201,
    });
    
    if (!saved) {
      errorRate.add(1);
      console.error(`[Questionnaire ERROR] Failed: ${prefRes.status}`);
    } else {
      questionnaireComplete.add(1);
      if (isDebugEnabled('preferences')) {
        console.log('[Questionnaire DEBUG] Preferences saved');
      }
    }
    
    sleep(thinkTime('quickGlance'));
    return saved;
  });
}

// ============= USER FLOW: MARKET SELECTION =============

function marketSelectionFlow(authToken, markets) {
  const headers = getAuthHeaders(authToken);
  
  return group('Select Market', () => {
    // Fetch markets
    const marketRes = measureRequest(marketFetchLatency, coreServiceLatency, () =>
      http.get(`${BASE_URL}/shopping/api/v1/markets?plz=${MARKET_POSTAL_CODE}`, { headers }),
      'shopping/markets'
    );
    
    const fetched = check(marketRes, {
      'Markets fetched': (r) => r.status === 200,
    });
    
    if (!fetched) {
      errorRate.add(1);
      console.error(`[Market ERROR] Fetch failed: ${marketRes.status}`);
      // Use fallback from setup data
      if (markets.length > 0) {
        return markets[0].id;
      }
      return null;
    }
    
    try {
      const fetchedMarkets = marketRes.json();
      if (!Array.isArray(fetchedMarkets) || fetchedMarkets.length === 0) {
        console.warn('[Market WARN] No markets found');
        return markets.length > 0 ? markets[0].id : null;
      }
      
      // User browses and selects a market
      sleep(thinkTime('browseSearch'));
      
      const selectedMarket = randomChoice(fetchedMarkets);
      const marketId = selectedMarket.id || selectedMarket.market_id;
      
      if (isDebugEnabled('market')) {
        console.log(`[Market DEBUG] Selected: ${marketId}`);
      }
      
      // Save market selection
      const selectRes = measureRequest(marketSelectLatency, personalizationServiceLatency, () =>
        http.post(`${BASE_URL}/personalization/api/v1/user/market`,
          JSON.stringify({ market_id: String(marketId) }),
          { headers }),
        'personalization/market'
      );
      
      check(selectRes, {
        'Market selected': (r) => r.status === 200 || r.status === 201,
      });
      
      sleep(thinkTime('quickGlance'));
      return marketId;
    } catch (e) {
      console.error(`[Market ERROR] Parse error: ${e.message}`);
      return markets.length > 0 ? markets[0].id : null;
    }
  });
}

// ============= USER FLOW: RECIPE SWIPING =============

function recipeSwipingFlow(authToken, numSwipes = null) {
  const headers = getAuthHeaders(authToken);
  const targetSwipes = numSwipes || randomInt(5, 15);
  
  return group('Recipe Swiping', () => {
    // Get recommendations
    const recRes = measureRequest(recommendationLatency, personalizationServiceLatency, () =>
      http.get(`${BASE_URL}/personalization/api/v1/recipes/recommend`, { headers, timeout: '15s' }),
      'personalization/recommend'
    );
    
    if (recRes.status === 0) {
      console.warn('[Swipe TIMEOUT] Recommendations timed out');
      return { likedRecipes: [], viewedRecipe: null };
    }
    
    // 404 is acceptable for new users without preferences
    if (recRes.status === 404 || !recRes.body || recRes.body === 'null') {
      if (isDebugEnabled('recommendations')) {
        console.log('[Swipe DEBUG] No recommendations (user may need setup)');
      }
      return { likedRecipes: [], viewedRecipe: null };
    }
    
    const fetched = check(recRes, {
      'Recommendations fetched': (r) => r.status === 200,
    });
    
    if (!fetched) {
      errorRate.add(1);
      console.error(`[Swipe ERROR] Failed: ${recRes.status}`);
      return { likedRecipes: [], viewedRecipe: null };
    }
    
    try {
      const recipes = recRes.json();
      if (!Array.isArray(recipes) || recipes.length === 0) {
        return { likedRecipes: [], viewedRecipe: null };
      }
      
      const likedRecipes = [];
      let viewedRecipe = null;
      const numToSwipe = Math.min(targetSwipes, recipes.length);
      
      if (isDebugEnabled('recommendations')) {
        console.log(`[Swipe DEBUG] Swiping through ${numToSwipe} recipes`);
      }
      
      for (let i = 0; i < numToSwipe; i++) {
        const recipe = recipes[i];
        const recipeId = recipe.id || recipe.recipe_id;
        
        // 15% chance to view ingredients (read the recipe details)
        if (Math.random() < 0.15) {
          sleep(thinkTime('readRecipe'));
          viewedRecipe = recipeId;
        }
        
        // Decide: 65% like, 35% dislike
        sleep(thinkTime('decideSwipe'));
        const action = Math.random() > 0.35 ? 'like' : 'dislike';
        
        const swipeStart = Date.now();
        const actionRes = http.post(
          `${BASE_URL}/personalization/api/v1/user/record/${action}/${recipeId}`,
          JSON.stringify({}),
          { headers }
        );
        recipeSwipeLatency.add(Date.now() - swipeStart);
        personalizationServiceLatency.add(Date.now() - swipeStart);
        
        check(actionRes, {
          [`Recipe ${action} recorded`]: (r) => r.status === 200 || r.status === 201,
        });
        
        if (action === 'like') {
          likedRecipes.push(recipeId);
        }
      }
      
      swipeFlowComplete.add(1);
      return { likedRecipes, viewedRecipe };
    } catch (e) {
      console.error(`[Swipe ERROR] Exception: ${e.message}`);
      return { likedRecipes: [], viewedRecipe: null };
    }
  });
}

// ============= USER FLOW: ADD RECIPE TO SHOPPING LIST =============

function addRecipeToShoppingListFlow(authToken, recipeId, marketId) {
  const headers = getAuthHeaders(authToken);
  
  return group('Add Recipe to Shopping List', () => {
    // Step 1: Generate shopping list with product options (THIS IS THE MAIN REWE API CALL)
    const generateRes = measureRequest(shoppingListGenerateLatency, coreServiceLatency, () =>
      http.post(
        `${BASE_URL}/shopping/shopping-list/generate?marketId=${marketId}`,
        JSON.stringify([recipeId]),
        { headers, timeout: '30s' }
      ),
      'shopping/shopping-list/generate'
    );
    
    if (generateRes.status === 0) {
      console.warn('[Shopping TIMEOUT] Generate timed out');
      return false;
    }
    
    if (isRateLimited(generateRes)) {
      console.warn('[Shopping RATE LIMIT] Rate limited during generate');
      return false;
    }
    
    const generated = check(generateRes, {
      'Shopping list generated': (r) => r.status === 200,
    });
    
    if (!generated) {
      errorRate.add(1);
      if (generateRes.status !== 504) {
        console.error(`[Shopping ERROR] Generate failed: ${generateRes.status}`);
      }
      return false;
    }
    
    if (isDebugEnabled('shopping')) {
      console.log(`[Shopping DEBUG] Generated list for recipe ${recipeId}`);
    }
    
    try {
      const shoppingList = generateRes.json();
      const items = shoppingList.items || [];
      const cartItems = [];
      
      // Step 2: User selects products for each ingredient
      // Track ingredient matching statistics for all ingredients
      items.forEach((ingredientGroup, idx) => {
        // Track ingredient matching for Grafana dashboard
        trackIngredientMatching(ingredientGroup);
        
        if (ingredientGroup.options && ingredientGroup.options.length > 0) {
          // Simulate user thinking about options
          sleep(thinkTime('selectProduct'));
          
          // 85% chance to add (15% "already have it")
          if (Math.random() > 0.15) {
            // User picks an option (usually first, sometimes random)
            const optionIdx = Math.random() > 0.7 ? 
              randomInt(0, ingredientGroup.options.length - 1) : 0;
            const selectedOption = ingredientGroup.options[optionIdx];
            const product = selectedOption.product;
            
            if (product.id) {
              cartItems.push({
                product_id: product.id,
                quantity: Math.max(1, Math.ceil(selectedOption.quantityToBuy || 1)),
                recipe_id: recipeId,
              });
              productsSelectedTotal.add(1);
            }
          }
        }
      });
      
      if (cartItems.length === 0) {
        if (isDebugEnabled('shopping')) {
          console.log('[Shopping DEBUG] User had all ingredients');
        }
        return true;
      }
      
      // Step 3: Add to shopping list
      const addRes = measureRequest(shoppingListAddLatency, personalizationServiceLatency, () =>
        http.post(
          `${BASE_URL}/personalization/api/v1/user/add-to-list`,
          JSON.stringify(cartItems),
          { headers, timeout: '15s' }
        ),
        'personalization/add-to-list'
      );
      
      if (addRes.status === 0) {
        console.warn('[Shopping TIMEOUT] Add timed out');
        return false;
      }
      
      const added = check(addRes, {
        'Items added to list': (r) => r.status === 200,
      });
      
      if (!added) {
        console.error(`[Shopping ERROR] Add failed: ${addRes.status}`);
      } else {
        shoppingFlowComplete.add(1);
        recipesAddedTotal.add(1);
        if (isDebugEnabled('shopping')) {
          console.log(`[Shopping DEBUG] Added ${cartItems.length} products`);
        }
      }
      
      sleep(thinkTime('quickGlance'));
      return added;
    } catch (e) {
      console.error(`[Shopping ERROR] Exception: ${e.message}`);
      return false;
    }
  });
}

// ============= USER FLOW: CHECK SHOPPING LIST =============

function checkShoppingListFlow(authToken) {
  const headers = getAuthHeaders(authToken);
  
  return group('Check Shopping List', () => {
    shoppingListChecks.add(1);
    
    // Get active shopping list
    const listRes = measureRequest(shoppingListGetLatency, personalizationServiceLatency, () =>
      http.get(`${BASE_URL}/personalization/api/v1/user/active/list`, { headers }),
      'personalization/active/list'
    );
    
    // 404 is normal if no list exists
    if (listRes.status === 404) {
      if (isDebugEnabled('shopping')) {
        console.log('[Check List DEBUG] No active list');
      }
      return { hasItems: false };
    }
    
    const fetched = check(listRes, {
      'Active list fetched': (r) => r.status === 200,
    });
    
    if (!fetched) {
      return { hasItems: false };
    }
    
    try {
      const list = listRes.json();
      
      // Handle "no active list" message
      if (list.message && list.message.includes('No active')) {
        return { hasItems: false };
      }
      
      const groups = list.groups || [];
      const allItems = [];
      
      groups.forEach(group => {
        if (group.items && Array.isArray(group.items)) {
          allItems.push(...group.items);
        }
      });
      
      if (allItems.length === 0) {
        return { hasItems: false };
      }
      
      // Simulate checking items (user is shopping)
      sleep(thinkTime('checkShoppingList'));
      
      // Maybe check off some items (20% chance per check)
      if (Math.random() > 0.8) {
        const numToCheck = Math.min(randomInt(1, 3), allItems.length);
        for (let i = 0; i < numToCheck; i++) {
          const item = allItems[randomInt(0, allItems.length - 1)];
          if (item.id) {
            http.put(`${BASE_URL}/personalization/api/v1/user/update/item`,
              JSON.stringify({ item_id: item.id, checked: true }),
              { headers }
            );
          }
        }
      }
      
      // 5% chance to complete the list
      if (Math.random() > 0.95 && list.id) {
        http.put(`${BASE_URL}/personalization/api/v1/user/complete/list/${list.id}`, null, { headers });
        if (isDebugEnabled('shopping')) {
          console.log('[Check List DEBUG] Completed shopping list');
        }
      }
      
      return { hasItems: true, itemCount: allItems.length };
    } catch (e) {
      console.error(`[Check List ERROR] Exception: ${e.message}`);
      return { hasItems: false };
    }
  });
}

// ============= USER FLOW: VIEW MY RECIPES =============

function viewMyRecipesFlow(authToken) {
  const headers = getAuthHeaders(authToken);
  
  return group('View My Recipes', () => {
    // Get liked recipes
    const start = Date.now();
    const likedRes = http.get(`${BASE_URL}/personalization/api/v1/user/liked-recipes`, { headers });
    likedRecipesLatency.add(Date.now() - start);
    personalizationServiceLatency.add(Date.now() - start);
    
    // 404 is normal for new users
    if (likedRes.status === 404) {
      if (isDebugEnabled('history')) {
        console.log('[My Recipes DEBUG] No liked recipes');
      }
      return;
    }
    
    check(likedRes, {
      'Liked recipes fetched': (r) => r.status === 200,
    });
    
    // Simulate browsing/reading recipes (cooking time)
    sleep(thinkTime('readRecipe'));
  });
}

// ============= USER FLOW: VIEW SHOPPING HISTORY =============

function viewShoppingHistoryFlow(authToken) {
  const headers = getAuthHeaders(authToken);
  
  return group('View Shopping History', () => {
    const start = Date.now();
    const historyRes = http.get(`${BASE_URL}/personalization/api/v1/user/shopping/history`, { headers });
    shoppingHistoryLatency.add(Date.now() - start);
    personalizationServiceLatency.add(Date.now() - start);
    
    check(historyRes, {
      'Shopping history fetched': (r) => r.status === 200,
    });
    
    // Simulate browsing history
    sleep(thinkTime('browseSearch'));
  });
}

// ============= USER FLOW: SEARCH =============

function searchFlow(authToken, marketId) {
  const headers = getAuthHeaders(authToken);
  const numSearches = randomInt(1, 5);
  
  group('Search Flow', () => {
    for (let i = 0; i < numSearches; i++) {
      // Randomly choose product or recipe search
      if (Math.random() > 0.4) {
        // Product search (60%) - THIS CAN TRIGGER REWE API CALLS
        const query = randomChoice(PRODUCT_SEARCH_TERMS);
        const encodedQuery = encodeURIComponent(query);
        
        const searchRes = measureRequest(productSearchLatency, coreServiceLatency, () =>
          http.get(`${BASE_URL}/shopping/api/v1/markets/search/products?query=${encodedQuery}&marketId=${marketId}`, { headers }),
          'shopping/search/products'
        );
        
        check(searchRes, {
          'Product search successful': (r) => r.status === 200,
        });
        
        searchesPerformed.add(1);
        
        if (isDebugEnabled('search')) {
          console.log(`[Search DEBUG] Product: "${query}" = ${searchRes.status}`);
        }
      } else {
        // Recipe search (40%)
        const query = randomChoice(RECIPE_SEARCH_TERMS);
        const encodedQuery = encodeURIComponent(query);
        
        const searchRes = measureRequest(recipeSearchLatency, personalizationServiceLatency, () =>
          http.get(`${BASE_URL}/personalization/recipes/search?q=${encodedQuery}`, { headers }),
          'personalization/recipes/search'
        );
        
        check(searchRes, {
          'Recipe search successful': (r) => r.status === 200,
        });
        
        searchesPerformed.add(1);
        
        if (isDebugEnabled('search')) {
          console.log(`[Search DEBUG] Recipe: "${query}" = ${searchRes.status}`);
        }
      }
      
      // Browse results before next search
      sleep(thinkTime('browseSearch'));
    }
  });
}

// ============= USER FLOW: UPDATE PREFERENCES =============

function updatePreferencesFlow(authToken) {
  const headers = getAuthHeaders(authToken);
  
  return group('Update Preferences', () => {
    // User decides to change preferences (rare)
    sleep(thinkTime('decideSwipe'));
    
    const prefVector = generatePreferenceVector();
    
    const prefRes = measureRequest(preferencesLatency, personalizationServiceLatency, () =>
      http.post(`${BASE_URL}/personalization/api/v1/user/preferences`, JSON.stringify({
        dietary_restrictions: Math.random() > 0.5 ? ['vegetarian'] : [],
        allergies: Math.random() > 0.7 ? ['gluten'] : [],
        cuisine_preferences: ['italian', 'asian', 'german', 'mexican'].slice(0, randomInt(1, 4)),
        spice_level: ['mild', 'medium', 'hot'][randomInt(0, 2)],
        cooking_time: [15, 30, 45, 60, 90][randomInt(0, 4)],
        budget: [50, 100, 150, 200, 300][randomInt(0, 4)],
        skill_level: ['beginner', 'intermediate', 'advanced'][randomInt(0, 2)],
        preference_vector: prefVector,
      }), { headers, timeout: '10s' }),
      'personalization/preferences'
    );
    
    check(prefRes, {
      'Preferences updated': (r) => r.status === 200 || r.status === 201,
    });
    
    if (isDebugEnabled('preferences')) {
      console.log(`[Preferences DEBUG] Updated: ${prefRes.status}`);
    }
    
    sleep(thinkTime('quickGlance'));
  });
}

// ============= USER FLOW: CHANGE MARKET =============

function changeMarketFlow(authToken, markets) {
  const headers = getAuthHeaders(authToken);
  
  return group('Change Market', () => {
    // User decides to change their preferred market (very rare)
    if (markets.length === 0) return null;
    
    // Fetch markets again
    const marketRes = measureRequest(marketFetchLatency, coreServiceLatency, () =>
      http.get(`${BASE_URL}/shopping/api/v1/markets?plz=${MARKET_POSTAL_CODE}`, { headers }),
      'shopping/markets'
    );
    
    if (marketRes.status !== 200) return null;
    
    try {
      const fetchedMarkets = marketRes.json();
      if (!Array.isArray(fetchedMarkets) || fetchedMarkets.length === 0) return null;
      
      // Browse and select new market
      sleep(thinkTime('browseSearch'));
      
      const newMarket = randomChoice(fetchedMarkets);
      const marketId = newMarket.id || newMarket.market_id;
      
      const selectRes = measureRequest(marketSelectLatency, personalizationServiceLatency, () =>
        http.post(`${BASE_URL}/personalization/api/v1/user/market`,
          JSON.stringify({ market_id: String(marketId) }),
          { headers }),
        'personalization/market'
      );
      
      check(selectRes, {
        'Market changed': (r) => r.status === 200 || r.status === 201,
      });
      
      if (isDebugEnabled('market')) {
        console.log(`[Market DEBUG] Changed to: ${marketId}`);
      }
      
      sleep(thinkTime('quickGlance'));
      return marketId;
    } catch (e) {
      return null;
    }
  });
}

// ============= MAIN VU FUNCTION =============

export default function (data) {
  const { userPool, markets, config } = data;
  
  activeUsers.add(1);
  
  const isNewUser = Math.random() < config.newUserPercentage;
  let session = null;
  let marketId = null;
  
  if (isNewUser) {
    // ============= NEW USER FLOW =============
    session = signupFlow();
    
    if (session && session.authToken) {
      // Complete questionnaire (creates user_embedding)
      const prefsOk = questionnaireFlow(session.authToken);
      
      // Select market (from Munich markets)
      marketId = marketSelectionFlow(session.authToken, markets);
      
      if (prefsOk && marketId) {
        // Initial recipe swiping
        const swipeResult = recipeSwipingFlow(session.authToken, randomInt(5, 10));
        
        // Add 1-3 recipes to shopping list
        const recipesToAdd = Math.min(config.maxRecipesPerSession, swipeResult.likedRecipes.length);
        for (let i = 0; i < recipesToAdd; i++) {
          if (swipeResult.likedRecipes[i]) {
            addRecipeToShoppingListFlow(session.authToken, swipeResult.likedRecipes[i], marketId);
          }
        }
      } else {
        if (isDebugEnabled('flow')) {
          console.log('[Flow DEBUG] New user setup incomplete');
        }
      }
    }
  } else {
    // ============= RETURNING USER FLOW =============
    const userData = randomChoice(userPool);
    session = loginFlow(userData);
    
    if (session && session.authToken) {
      // Check if user has preferences/market set up
      let hasSetup = false;
      
      const prefRes = http.get(`${BASE_URL}/personalization/api/v1/user/preferences`,
        { headers: getAuthHeaders(session.authToken) });
      
      if (prefRes.status === 200) {
        try {
          const prefs = prefRes.json();
          marketId = prefs.market_id;
          hasSetup = true;
        } catch (e) {}
      } else if (prefRes.status === 404) {
        // User needs setup
        const prefsOk = questionnaireFlow(session.authToken);
        marketId = marketSelectionFlow(session.authToken, markets);
        hasSetup = prefsOk && marketId;
      }
      
      if (!marketId) {
        marketId = markets.length > 0 ? markets[0].id : null;
      }
      
      // Activity distribution (realistic weights):
      // - swipe: 35% (browsing recipes)
      // - shopping_add: 20% (add recipe to shopping list)
      // - check_list: 15% (checking shopping list while shopping)
      // - my_recipes: 10% (viewing liked recipes, usually when cooking)
      // - search: 8% (searching products/recipes)
      // - history: 7% (viewing shopping history)
      // - update_prefs: 3% (rarely update preferences)
      // - change_market: 2% (very rarely change market)
      const activities = [
        'swipe', 'shopping_add', 'check_list', 'my_recipes',
        'search', 'history', 'update_prefs', 'change_market'
      ];
      const weights = [35, 20, 15, 10, 8, 7, 3, 2];
      const activity = weightedRandomChoice(activities, weights);
      
      if (isDebugEnabled('flow')) {
        console.log(`[Flow DEBUG] Activity: ${activity}, Market: ${marketId}`);
      }
      
      switch (activity) {
        case 'swipe':
          const swipeResult = recipeSwipingFlow(session.authToken);
          // 40% chance to also add a recipe after swiping
          if (swipeResult.likedRecipes.length > 0 && marketId && Math.random() > 0.6) {
            addRecipeToShoppingListFlow(
              session.authToken,
              randomChoice(swipeResult.likedRecipes),
              marketId
            );
          }
          break;
          
        case 'shopping_add':
          // Get recommendations and add to shopping list
          const recRes = http.get(`${BASE_URL}/personalization/api/v1/recipes/recommend`,
            { headers: getAuthHeaders(session.authToken) });
          if (recRes.status === 200 && recRes.body && marketId) {
            try {
              const recipes = recRes.json();
              if (Array.isArray(recipes) && recipes.length > 0) {
                const recipe = randomChoice(recipes);
                addRecipeToShoppingListFlow(
                  session.authToken,
                  recipe.id || recipe.recipe_id,
                  marketId
                );
              }
            } catch (e) {}
          }
          break;
          
        case 'check_list':
          // Simulates user actively shopping (multiple checks)
          shoppingSessionsActive.add(1);
          checkShoppingListFlow(session.authToken);
          // 30% chance for a second check (user still shopping)
          if (Math.random() > 0.7) {
            sleep(thinkTime('betweenSessions'));
            checkShoppingListFlow(session.authToken);
          }
          shoppingSessionsActive.add(-1);
          break;
          
        case 'my_recipes':
          viewMyRecipesFlow(session.authToken);
          break;
          
        case 'search':
          if (marketId) {
            searchFlow(session.authToken, marketId);
          }
          break;
          
        case 'history':
          viewShoppingHistoryFlow(session.authToken);
          break;
          
        case 'update_prefs':
          updatePreferencesFlow(session.authToken);
          break;
          
        case 'change_market':
          changeMarketFlow(session.authToken, markets);
          break;
      }
    }
  }
  
  // Think time between sessions
  sleep(thinkTime('betweenSessions'));
  
  activeUsers.add(-1);
}

// ============= TEARDOWN =============

export function teardown(data) {
  console.log('='.repeat(60));
  console.log('Decidish Realistic User Benchmark - Complete');
  console.log('='.repeat(60));
  console.log('');
  console.log('📊 USER FLOW METRICS:');
  console.log(`  Signups completed: ${signupFlowComplete}`);
  console.log(`  Logins completed: ${loginFlowComplete}`);
  console.log(`  Questionnaires completed: ${questionnaireComplete}`);
  console.log(`  Swipe sessions completed: ${swipeFlowComplete}`);
  console.log(`  Shopping flows completed: ${shoppingFlowComplete}`);
  console.log('');
  console.log('📦 ACTIVITY METRICS:');
  console.log(`  Recipes added to list: ${recipesAddedTotal}`);
  console.log(`  Products selected: ${productsSelectedTotal}`);
  console.log(`  Searches performed: ${searchesPerformed}`);
  console.log(`  Shopping list checks: ${shoppingListChecks}`);
  console.log('');
  console.log('🥕 INGREDIENT MATCHING METRICS:');
  console.log(`  Total ingredients consulted: ${ingredientConsulted}`);
  console.log(`  Ingredients with products (matched): ${ingredientMatched}`);
  console.log(`  Ingredients without products (unmatched): ${ingredientUnmatched}`);
  console.log(`  Common ingredients unmatched: ${commonIngredientUnmatched}`);
  console.log(`  Uncommon ingredients unmatched: ${uncommonIngredientUnmatched}`);
  console.log('');
  console.log('⚠️  RATE LIMIT & ERROR METRICS:');
  console.log(`  Rate limit hits (429): ${rateLimitHits}`);
  console.log(`  Gateway timeouts (504): ${gatewayTimeouts}`);
  console.log(`  Gateway errors (502): ${gatewayErrors}`);
  console.log(`  Total REWE API errors: ${reweApiErrors}`);
  console.log(`  Shopping list rate limits: ${shoppingListRateLimits}`);
  console.log(`  Product search rate limits: ${productSearchRateLimits}`);
  console.log(`  Failed requests: ${failedRequests}`);
  console.log('');
  console.log('='.repeat(60));
}
