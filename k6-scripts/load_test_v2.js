/*
 * Decidish Load Test v2.0 - Realistic User Flows
 * 
 * This script simulates realistic user behavior including:
 * - New user signup vs returning user login
 * - Complete questionnaire flow
 * - Recipe swiping with likes/dislikes
 * - Shopping list generation and management
 * - Search and browse flows
 * 
 * Usage:
 *   docker exec -it decidish-k6-1 k6 run /scripts/load_test_v2.js
 *   
 * Quick tests:
 *   docker exec -it decidish-k6-1 k6 run --vus 10 --duration 1m /scripts/load_test_v2.js
 *   
 * Scalability test (ramp to 100 VUs):
 *   docker exec -it decidish-k6-1 k6 run -e SCENARIO=scalability /scripts/load_test_v2.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';

// ============= CONFIGURATION =============
const BASE_URL = __ENV.BASE_URL || 'http://nginx';

// DEBUG Configuration - Set DEBUG=all or DEBUG=auth,market,shopping,recommendations,search
const DEBUG = __ENV.DEBUG || '';
const debugCategories = DEBUG ? DEBUG.toLowerCase().split(',').map(c => c.trim()) : [];
const isDebugEnabled = (category) => {
  if (!DEBUG) return false;
  if (DEBUG.toLowerCase() === 'all') return true;
  return debugCategories.includes(category.toLowerCase());
};

if (DEBUG) console.log(`[CONFIG] Debug Mode: ${DEBUG}`);

// Test scenarios - can be overridden with -e SCENARIO=scalability
const SCENARIO = __ENV.SCENARIO || 'standard';

// User distribution
const NEW_USER_PERCENTAGE = 0.3; // 30% new users, 70% returning

// Standard postal codes across Germany for distribution
const POSTAL_CODES = [
  '80331', // München
  '10115', // Berlin
  '20095', // Hamburg
  '50667', // Köln
  '60311', // Frankfurt
  '70173', // Stuttgart
  '90402', // Nürnberg
  '04109', // Leipzig
  '01067', // Dresden
  '28195', // Bremen
  '40213', // Düsseldorf
  '30159', // Hannover
  '45127', // Essen
  '44135', // Dortmund
  '68159', // Mannheim
];

// Product search terms
const PRODUCT_SEARCH_TERMS = [
  'Milch', 'Butter', 'Käse', 'Brot', 'Eier',
  'Tomaten', 'Kartoffeln', 'Zwiebeln', 'Knoblauch', 'Paprika',
  'Hähnchen', 'Rind', 'Schwein', 'Lachs', 'Thunfisch',
  'Reis', 'Nudeln', 'Mehl', 'Zucker', 'Salz',
  'Öl', 'Essig', 'Senf', 'Ketchup', 'Mayonnaise',
  'Äpfel', 'Bananen', 'Orangen', 'Zitronen', 'Joghurt',
];

// Recipe search terms
const RECIPE_SEARCH_TERMS = [
  'Pasta', 'Pizza', 'Salat', 'Suppe', 'Curry',
  'Steak', 'Burger', 'Wrap', 'Bowl', 'Risotto',
  'Kuchen', 'Auflauf', 'Eintopf', 'Schnitzel', 'Gulasch',
  'Pfannkuchen', 'Omelette', 'Lasagne', 'Spaghetti', 'Carbonara',
  'Thai', 'Mexikanisch', 'Italienisch', 'Asiatisch', 'Vegetarisch',
];

// ============= CUSTOM METRICS =============

// Error tracking
const errorRate = new Rate('error_rate');
const failedRequests = new Counter('failed_requests');

// Per-service latency metrics
const authLatency = new Trend('auth_service_latency', true);
const coreLatency = new Trend('core_service_latency', true);
const personalizationLatency = new Trend('personalization_service_latency', true);

// Per-endpoint latency metrics
const recommendationLatency = new Trend('recommendation_latency', true);
const shoppingListGenerateLatency = new Trend('shopping_list_generate_latency', true);
const shoppingListAddLatency = new Trend('shopping_list_add_latency', true);
const productSearchLatency = new Trend('product_search_latency', true);
const recipeSearchLatency = new Trend('recipe_search_latency', true);
const marketFetchLatency = new Trend('market_fetch_latency', true);

// Flow completion metrics
const signupComplete = new Counter('signup_flow_complete');
const loginComplete = new Counter('login_flow_complete');
const shoppingFlowComplete = new Counter('shopping_flow_complete');
const swipeFlowComplete = new Counter('swipe_flow_complete');

// Concurrency metrics
const activeUsers = new Gauge('active_users');
const peakConcurrentUsers = new Gauge('peak_concurrent_users');

// ============= TEST SCENARIOS =============

export const options = getScenarioOptions();

function getScenarioOptions() {
  const scenarios = {
    // Standard test: constant load for steady-state testing
    standard: {
      scenarios: {
        standard_load: {
          executor: 'constant-vus',
          vus: parseInt(__ENV.VUS) || 50,
          duration: __ENV.DURATION || '5m',
        },
      },
      thresholds: {
        // Overall HTTP error rate (expected 404s will cause this to be higher)
        // We rely on custom error_rate for actual errors
        http_req_duration: ['p(95)<3000'],         // 95th percentile < 3s
        error_rate: ['rate<0.01'],                 // Custom error tracking
        recommendation_latency: ['p(95)<2000'],    // Recommendations < 2s
        shopping_list_generate_latency: ['p(95)<5000'], // Shopping list < 5s
      },
    },
    
    // Scalability test: ramp up to find breaking point
    scalability: {
      scenarios: {
        scalability_ramp: {
          executor: 'ramping-vus',
          startVUs: 0,
          stages: [
            { duration: '1m', target: 10 },    // Warm up
            { duration: '2m', target: 50 },    // Ramp to 50
            { duration: '2m', target: 100 },   // Ramp to 100
            { duration: '3m', target: 200 },   // Ramp to 200
            { duration: '3m', target: 500 },   // Ramp to 500
            { duration: '5m', target: 500 },   // Sustain 500
            { duration: '2m', target: 0 },     // Cool down
          ],
          gracefulRampDown: '30s',
        },
      },
      thresholds: {
        // Allow 15% http_req_failed to account for expected 404s from new users
        http_req_failed: ['rate<0.15'],           
        http_req_duration: ['p(95)<10000'],        // 10s allowed during stress
        error_rate: ['rate<0.05'],                 // Custom error tracking (real errors only)
      },
    },
    
    // Spike test: sudden burst of users
    spike: {
      scenarios: {
        spike_test: {
          executor: 'ramping-vus',
          startVUs: 10,
          stages: [
            { duration: '30s', target: 10 },   // Baseline
            { duration: '10s', target: 200 },  // Spike!
            { duration: '1m', target: 200 },   // Stay at spike
            { duration: '10s', target: 10 },   // Recover
            { duration: '1m', target: 10 },    // Baseline
          ],
        },
      },
    },
    
    // Soak test: long duration for memory leaks
    soak: {
      scenarios: {
        soak_test: {
          executor: 'constant-vus',
          vus: parseInt(__ENV.VUS) || 50,
          duration: __ENV.DURATION || '30m',
        },
      },
      thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<3000'],
      },
    },
    
    // Breakpoint test: find max capacity
    breakpoint: {
      scenarios: {
        breakpoint: {
          executor: 'ramping-arrival-rate',
          startRate: 10,
          timeUnit: '1s',
          preAllocatedVUs: 100,
          maxVUs: 2000,
          stages: [
            { duration: '2m', target: 50 },    // 50 req/s
            { duration: '2m', target: 100 },   // 100 req/s
            { duration: '2m', target: 200 },   // 200 req/s
            { duration: '2m', target: 500 },   // 500 req/s
            { duration: '2m', target: 1000 },  // 1000 req/s - likely break
          ],
        },
      },
      thresholds: {
        http_req_failed: ['rate<0.10'],  // Allow 10% during breakpoint
      },
    },
  };
  
  return scenarios[SCENARIO] || scenarios.standard;
}

// ============= SETUP PHASE =============

export function setup() {
  console.log(`[Setup] Initializing Decidish Load Test v2.0`);
  console.log(`[Setup] Scenario: ${SCENARIO}`);
  console.log(`[Setup] Base URL: ${BASE_URL}`);
  
  // Health check using actuator endpoint
  console.log("[Setup] Checking system health...");
  const healthRes = http.get(`${BASE_URL}/shopping/actuator/health`, { timeout: '10s' });
  if (healthRes.status !== 200) {
    console.warn(`[Setup WARNING] Health check returned ${healthRes.status}. System might not be ready.`);
  } else {
    console.log("[Setup] ✓ System is healthy");
  }
  
  // Check markets availability
  console.log("[Setup] Checking database seeding...");
  let totalMarkets = 0;
  const samplePLZs = [POSTAL_CODES[0], POSTAL_CODES[5], POSTAL_CODES[10]];
  
  for (const plz of samplePLZs) {
    const marketRes = http.get(`${BASE_URL}/shopping/api/v1/markets?plz=${plz}`);
    if (marketRes.status === 200) {
      try {
        const markets = marketRes.json();
        totalMarkets += Array.isArray(markets) ? markets.length : 0;
      } catch (e) {
        console.warn(`[Setup] Could not parse markets for ${plz}`);
      }
    }
  }
  
  if (totalMarkets === 0) {
    console.error("[Setup ERROR] No markets found! Run seed_load_test_complete.sql first.");
  } else {
    console.log(`[Setup] ✓ Found ${totalMarkets} markets across ${samplePLZs.length} sample regions`);
  }
  
  // Pre-create a pool of test users
  const userPool = [];
  const numUsers = parseInt(__ENV.USERS) || 100;
  let createdCount = 0;
  let failedCount = 0;
  
  console.log(`[Setup] Creating ${numUsers} test users...`);
  for (let i = 0; i < numUsers; i++) {
    const username = `loadtest_user_${Date.now()}_${i}`;
    const password = 'TestPass123!';
    
    const res = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
      username: username,
      password: password,
      name: `Load Test User ${i}`,
    }), { headers: { 'Content-Type': 'application/json' }, timeout: '10s' });
    
    const isDuplicate = res.status === 500 && res.body && res.body.includes("duplicate key");
    
    if (res.status === 200 || res.status === 201 || res.status === 409 || isDuplicate) {
      userPool.push({ 
        username, 
        password, 
        isNew: false, // Pre-created users start as "returning"
        hasPreferences: false,
        hasMarket: false,
      });
      createdCount++;
    } else {
      failedCount++;
      if (failedCount <= 5) {
        console.warn(`[Setup] Failed to create user ${i}: Status ${res.status}`);
      }
    }
  }
  
  console.log(`[Setup] ✓ Created ${createdCount} users (${failedCount} failed)`);
  
  return {
    userPool,
    testConfig: {
      newUserPercentage: NEW_USER_PERCENTAGE,
      postalCodes: POSTAL_CODES,
    }
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

// Weighted random selection for realistic activity distribution
function weightedRandomChoice(items, weights) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

function measureRequest(metricTrend, requestFn) {
  const start = Date.now();
  const response = requestFn();
  const duration = Date.now() - start;
  metricTrend.add(duration);
  return response;
}

function generatePreferenceVector() {
  return Array(35).fill(0).map(() => Math.random());
}

// ============= USER FLOW: SIGNUP =============

function signupFlow(userData) {
  const username = `newuser_${Date.now()}_${__VU}_${randomInt(1000, 9999)}`;
  const password = 'NewUserPass123!';
  
  return group('Signup Flow', () => {
    // Register new account
    const registerRes = measureRequest(authLatency, () => 
      http.post(`${BASE_URL}/auth/register`, JSON.stringify({
        username: username,
        password: password,
        name: `New User ${__VU}`,
      }), { headers: { 'Content-Type': 'application/json' } })
    );
    
    const registered = check(registerRes, {
      'Registration successful': (r) => r.status === 200 || r.status === 201,
    });
    
    if (!registered) {
      errorRate.add(1);
      failedRequests.add(1);
      console.error(`[Signup ERROR] Registration failed - Status: ${registerRes.status}, Body: ${registerRes.body ? registerRes.body.substring(0, 200) : 'empty'}`);
      return null;
    }
    
    if (isDebugEnabled('auth')) {
      console.log(`[Signup DEBUG] Registered user: ${username}`);
    }
    
    // Login with new credentials
    const loginRes = measureRequest(authLatency, () =>
      http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        username: username,
        password: password,
      }), { headers: { 'Content-Type': 'application/json' } })
    );
    
    const loggedIn = check(loginRes, {
      'Login successful': (r) => r.status === 200,
    });
    
    if (!loggedIn) {
      errorRate.add(1);
      failedRequests.add(1);
      console.error(`[Signup ERROR] Login after registration failed - Status: ${loginRes.status}, Body: ${loginRes.body ? loginRes.body.substring(0, 200) : 'empty'}`);
      return null;
    }
    
    const authToken = extractAuthToken(loginRes);
    if (!authToken) {
      console.error(`[Signup ERROR] Could not extract auth token! Headers: ${JSON.stringify(loginRes.headers)}`);
    }
    signupComplete.add(1);
    
    sleep(0.5);
    return { username, password, authToken, isNew: true };
  });
}

// ============= USER FLOW: LOGIN =============

function loginFlow(userData) {
  return group('Login Flow', () => {
    const loginRes = measureRequest(authLatency, () =>
      http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        username: userData.username,
        password: userData.password,
      }), { headers: { 'Content-Type': 'application/json' } })
    );
    
    const loggedIn = check(loginRes, {
      'Login successful': (r) => r.status === 200,
    });
    
    if (!loggedIn) {
      errorRate.add(1);
      failedRequests.add(1);
      console.error(`[Login ERROR] Failed for ${userData.username} - Status: ${loginRes.status}, Body: ${loginRes.body ? loginRes.body.substring(0, 200) : 'empty'}`);
      return null;
    }
    
    const authToken = extractAuthToken(loginRes);
    if (!authToken) {
      console.error(`[Login ERROR] Could not extract auth token for ${userData.username}! Headers: ${JSON.stringify(loginRes.headers)}`);
    }
    
    if (isDebugEnabled('auth')) {
      console.log(`[Login DEBUG] Successfully logged in: ${userData.username}`);
    }
    
    loginComplete.add(1);
    
    sleep(0.3);
    return { ...userData, authToken };
  });
}

// ============= USER FLOW: QUESTIONNAIRE =============

function questionnaireFlow(authToken) {
  const headers = getAuthHeaders(authToken);
  
  return group('Questionnaire Flow', () => {
    // Simulate filling out questionnaire
    sleep(randomInt(2, 5) * 0.1); // Think time
    
    const prefVector = generatePreferenceVector();
    const allergies = Math.random() > 0.7 ? ['peanuts', 'shellfish'] : [];
    const dietary = Math.random() > 0.8 ? ['vegetarian'] : [];
    
    const prefRes = measureRequest(personalizationLatency, () =>
      http.post(`${BASE_URL}/personalization/api/v1/user/preferences`, JSON.stringify({
        dietary_restrictions: dietary,
        allergies: allergies,
        cuisine_preferences: ['italian', 'asian', 'mexican'].slice(0, randomInt(1, 3)),
        spice_level: ['mild', 'medium', 'hot'][randomInt(0, 2)],
        cooking_time: [15, 30, 45, 60][randomInt(0, 3)],
        budget: [50, 100, 150, 200][randomInt(0, 3)],
        skill_level: ['beginner', 'intermediate', 'advanced'][randomInt(0, 2)],
        min_cooking_time: 10,
        max_cooking_time: 60,
        preference_vector: prefVector,
      }), { headers, timeout: '10s' })
    );
    
    // Handle timeout
    if (prefRes.status === 0) {
      console.warn(`[Questionnaire TIMEOUT] Save preferences timed out`);
      return false;
    }
    
    const saved = check(prefRes, {
      'Preferences saved': (r) => r.status === 200 || r.status === 201,
    });
    
    if (!saved) {
      errorRate.add(1);
      console.error(`[Questionnaire ERROR] Failed - Status: ${prefRes.status}`);
    } else if (isDebugEnabled('preferences')) {
      console.log(`[Questionnaire DEBUG] Preferences saved successfully`);
    }
    
    sleep(0.3);
    return saved;
  });
}

// ============= USER FLOW: MARKET SELECTION =============

function marketSelectionFlow(authToken, postalCodes) {
  const headers = getAuthHeaders(authToken);
  const postalCode = randomChoice(postalCodes);
  
  return group('Market Selection', () => {
    // Fetch markets for postal code
    const marketRes = measureRequest(marketFetchLatency, () =>
      http.get(`${BASE_URL}/shopping/api/v1/markets?plz=${postalCode}`, { headers })
    );
    
    const fetched = check(marketRes, {
      'Markets fetched': (r) => r.status === 200,
    });
    
    if (!fetched) {
      errorRate.add(1);
      console.error(`[Market ERROR] Failed to fetch markets for PLZ ${postalCode} - Status: ${marketRes.status}, Body: ${marketRes.body ? marketRes.body.substring(0, 200) : 'empty'}`);
      return null;
    }
    
    if (isDebugEnabled('market')) {
      console.log(`[Market DEBUG] Fetched markets for PLZ ${postalCode}, Status: ${marketRes.status}`);
    }
    
    try {
      const markets = marketRes.json();
      if (!Array.isArray(markets) || markets.length === 0) {
        console.warn(`[Market WARN] No markets found for PLZ ${postalCode}`);
        return null;
      }
      
      if (isDebugEnabled('market')) {
        console.log(`[Market DEBUG] Found ${markets.length} markets for PLZ ${postalCode}`);
      }
      
      // User selects a market
      const selectedMarket = randomChoice(markets);
      const marketId = selectedMarket.id || selectedMarket.market_id;
      
      if (isDebugEnabled('market')) {
        console.log(`[Market DEBUG] Selected market ID: ${marketId}`);
      }
      
      const selectRes = measureRequest(personalizationLatency, () =>
        http.post(`${BASE_URL}/personalization/api/v1/user/market`, 
          JSON.stringify({ market_id: String(marketId) }), 
          { headers })
      );
      
      const selected = check(selectRes, {
        'Market selected': (r) => r.status === 200 || r.status === 201,
      });
      
      if (!selected) {
        console.error(`[Market ERROR] Failed to select market ${marketId} - Status: ${selectRes.status}, Body: ${selectRes.body ? selectRes.body.substring(0, 200) : 'empty'}`);
      }
      
      sleep(0.3);
      return marketId;
    } catch (e) {
      console.error(`[Market ERROR] Parse error for PLZ ${postalCode}: ${e.message}`);
      return null;
    }
  });
}

// ============= USER FLOW: RECIPE SWIPING =============

function recipeSwipeFlow(authToken, hasCompletedSetup = false) {
  const headers = getAuthHeaders(authToken);
  
  return group('Recipe Swipe Flow', () => {
    // Get recommendations
    const recRes = measureRequest(recommendationLatency, () =>
      http.get(`${BASE_URL}/personalization/api/v1/recipes/recommend`, { headers, timeout: '15s' })
    );
    
    // Handle timeout separately
    if (recRes.status === 0) {
      console.warn(`[Swipe TIMEOUT] Recommendations request timed out`);
      return { likedRecipes: [], recipes: [] };
    }
    
    // If user has completed setup (questionnaire + market), they MUST get recommendations
    // 404 is only acceptable for users who haven't completed setup
    if (hasCompletedSetup) {
      const fetched = check(recRes, {
        'Recommendations fetched': (r) => r.status === 200,
      });
      
      if (!fetched) {
        errorRate.add(1);
        console.error(`[Swipe ERROR] User completed setup but got no recommendations - Status: ${recRes.status}`);
        return { likedRecipes: [], recipes: [] };
      }
    } else {
      // For users without confirmed setup, 404 is acceptable
      const fetched = check(recRes, {
        'Recommendations fetched or user not set up': (r) => r.status === 200 || r.status === 404,
      });
      
      if (!fetched) {
        errorRate.add(1);
        console.error(`[Swipe ERROR] Failed to fetch recommendations - Status: ${recRes.status}, Body: ${recRes.body ? recRes.body.substring(0, 200) : 'empty'}`);
        return { likedRecipes: [], recipes: [] };
      }
    }
    
    // Handle 404 or empty response
    if (recRes.status === 404 || !recRes.body || recRes.body === 'null' || recRes.body === '[]') {
      if (isDebugEnabled('recommendations')) {
        console.log(`[Swipe DEBUG] No recommendations available (status: ${recRes.status}) - user may not be set up`);
      }
      return { likedRecipes: [], recipes: [] };
    }
    
    if (isDebugEnabled('recommendations')) {
      console.log(`[Swipe DEBUG] Recommendations response (first 200 chars): ${recRes.body.substring(0, 200)}`);
    }
    
    try {
      const recipes = recRes.json();
      if (!Array.isArray(recipes) || recipes.length === 0) {
        if (isDebugEnabled('recommendations')) {
          console.log(`[Swipe DEBUG] No recipes in response array`);
        }
        return { likedRecipes: [], recipes: [] };
      }
      
      if (isDebugEnabled('recommendations')) {
        console.log(`[Swipe DEBUG] Found ${recipes.length} recipes to swipe`);
      }
      
      const likedRecipes = [];
      const numSwipes = Math.min(randomInt(5, 10), recipes.length);
      
      // Swipe through recipes - 60% like, 40% dislike
      for (let i = 0; i < numSwipes; i++) {
        const recipe = recipes[i];
        const recipeId = recipe.id || recipe.recipe_id;
        const action = Math.random() > 0.4 ? 'like' : 'dislike';
        
        const actionRes = http.post(
          `${BASE_URL}/personalization/api/v1/user/record/${action}/${recipeId}`,
          JSON.stringify({}),
          { headers }
        );
        
        const actionSuccess = check(actionRes, {
          [`Recipe ${action} recorded`]: (r) => r.status === 200 || r.status === 201,
        });
        
        if (!actionSuccess) {
          console.error(`[Swipe ERROR] Failed to record ${action} for recipe ${recipeId} - Status: ${actionRes.status}`);
        }
        
        if (action === 'like') {
          likedRecipes.push(recipeId);
        }
        
        sleep(0.2); // Simulate looking at recipe
      }
      
      swipeFlowComplete.add(1);
      return { likedRecipes, recipes };
    } catch (e) {
      console.error(`[Swipe ERROR] Exception: ${e.message}`);
      return { likedRecipes: [], recipes: [] };
    }
  });
}

// ============= USER FLOW: SHOPPING LIST =============

function shoppingListFlow(authToken, recipeId, marketId) {
  const headers = getAuthHeaders(authToken);
  
  return group('Shopping List Flow', () => {
    // Step 1: Generate shopping list with product options
    // This endpoint can be slow, so we use a longer timeout
    const generateRes = measureRequest(shoppingListGenerateLatency, () =>
      http.post(
        `${BASE_URL}/shopping/shopping-list/generate?marketId=${marketId}`,
        JSON.stringify([recipeId]),
        { headers, timeout: '30s' }
      )
    );
    
    // Handle timeout (status 0) separately from other errors
    if (generateRes.status === 0) {
      console.warn(`[Shopping TIMEOUT] Generate timed out for recipe ${recipeId}, market ${marketId}`);
      return false;
    }
    
    const generated = check(generateRes, {
      'Shopping list generated': (r) => r.status === 200,
    });
    
    if (!generated) {
      errorRate.add(1);
      // Don't log full HTML for 504 errors
      if (generateRes.status === 504) {
        console.error(`[Shopping ERROR] Gateway timeout (504) for recipe ${recipeId}, market ${marketId}`);
      } else {
        const bodyPreview = generateRes.body ? generateRes.body.substring(0, 100) : 'empty';
        console.error(`[Shopping ERROR] Generate failed for recipe ${recipeId}, market ${marketId} - Status: ${generateRes.status}`);
      }
      return false;
    }
    
    if (isDebugEnabled('shopping')) {
      console.log(`[Shopping DEBUG] Generated shopping list for recipe ${recipeId}, market ${marketId}`);
      console.log(`[Shopping DEBUG] Response (first 300 chars): ${generateRes.body ? generateRes.body.substring(0, 300) : 'empty'}`);
    }
    
    try {
      const shoppingList = generateRes.json();
      const items = shoppingList.items || [];
      const cartItems = [];
      
      if (isDebugEnabled('shopping')) {
        console.log(`[Shopping DEBUG] Found ${items.length} ingredient groups`);
      }
      
      // Simulate user selecting products
      items.forEach((ingredientGroup, idx) => {
        if (ingredientGroup.options && ingredientGroup.options.length > 0) {
          // 80% chance to select, 20% chance to "already have"
          if (Math.random() > 0.2) {
            const selectedOption = ingredientGroup.options[randomInt(0, ingredientGroup.options.length - 1)];
            const product = selectedOption.product;
            
            if (product.id) {
              cartItems.push({
                product_id: product.id,
                quantity: Math.max(1, Math.ceil(selectedOption.quantityToBuy || 1)),
                recipe_id: recipeId,
              });
              
              if (isDebugEnabled('shopping')) {
                console.log(`[Shopping DEBUG] Selected: ${product.name} (id: ${product.id}, qty: ${Math.ceil(selectedOption.quantityToBuy || 1)})`);
              }
            } else if (isDebugEnabled('shopping')) {
              console.log(`[Shopping DEBUG] Skipped product without ID: ${product.name}`);
            }
          }
        }
        sleep(0.05); // Simulate scanning options
      });
      
      if (cartItems.length === 0) {
        if (isDebugEnabled('shopping')) {
          console.log(`[Shopping DEBUG] No items to add - user had everything or no valid products`);
        }
        return true; // User had everything
      }
      
      if (isDebugEnabled('shopping')) {
        console.log(`[Shopping DEBUG] Adding ${cartItems.length} items to shopping list`);
      }
      
      // Step 2: Add selected products to shopping list
      const addRes = measureRequest(shoppingListAddLatency, () =>
        http.post(
          `${BASE_URL}/personalization/api/v1/user/add-to-list`,
          JSON.stringify(cartItems),
          { headers, timeout: '15s' }
        )
      );
      
      // Handle timeout
      if (addRes.status === 0) {
        console.warn(`[Shopping TIMEOUT] Add to list timed out`);
        return false;
      }
      
      const added = check(addRes, {
        'Items added to list': (r) => r.status === 200,
      });
      
      if (!added) {
        console.error(`[Shopping ERROR] Add to list failed - Status: ${addRes.status}, Body: ${addRes.body ? addRes.body.substring(0, 200) : 'empty'}`);
      } else if (isDebugEnabled('shopping')) {
        console.log(`[Shopping DEBUG] Successfully added ${cartItems.length} items to list`);
      }
      
      shoppingFlowComplete.add(1);
      return added;
    } catch (e) {
      console.error(`[Shopping ERROR] Exception: ${e.message}`);
      return false;
    }
  });
}

// ============= USER FLOW: SHOPPING LIST MANAGEMENT =============

function shoppingListManagementFlow(authToken) {
  const headers = getAuthHeaders(authToken);
  
  return group('Shopping List Management', () => {
    // Get active shopping list - 404 is expected if user has no active list
    const listRes = http.get(`${BASE_URL}/personalization/api/v1/user/active/list`, { headers });
    
    // 200 = has active list, 404 = no active list (expected, not an error)
    const hasList = check(listRes, {
      'Active list fetched or none exists': (r) => r.status === 200 || r.status === 404,
    });
    
    // 404 or message about no active list is normal - user just hasn't created one yet
    if (listRes.status === 404) {
      if (isDebugEnabled('shopping')) {
        console.log(`[List Management DEBUG] No active shopping list (404) - normal for users without lists`);
      }
      return;
    }
    
    if (listRes.status !== 200) {
      if (isDebugEnabled('shopping')) {
        console.log(`[List Management DEBUG] Unexpected status: ${listRes.status}`);
      }
      return;
    }
    
    try {
      const list = listRes.json();
      
      // Check if we have a valid list with items (some APIs return 200 with message)
      if (list.message && list.message.includes('No active')) {
        if (isDebugEnabled('shopping')) {
          console.log(`[List Management DEBUG] No active list (message response)`);
        }
        return;
      }
      
      const groups = list.groups || [];
      const allItems = [];
      
      groups.forEach(group => {
        if (group.items && Array.isArray(group.items)) {
          allItems.push(...group.items);
        }
      });
      
      if (allItems.length === 0) {
        if (isDebugEnabled('shopping')) {
          console.log(`[List Management DEBUG] Shopping list is empty`);
        }
        return;
      }
      
      if (isDebugEnabled('shopping')) {
        console.log(`[List Management DEBUG] Found ${allItems.length} items in ${groups.length} groups`);
      }
      
      // Simulate checking off some items
      const numChecks = Math.min(randomInt(1, 3), allItems.length);
      for (let i = 0; i < numChecks; i++) {
        const item = randomChoice(allItems);
        if (item.id) {
          http.put(`${BASE_URL}/personalization/api/v1/user/update/item`,
            JSON.stringify({ item_id: item.id, checked: true }),
            { headers }
          );
          sleep(0.1);
        }
      }
      
      // 20% chance to complete the list
      if (Math.random() > 0.8 && list.id) {
        http.put(`${BASE_URL}/personalization/api/v1/user/complete/list/${list.id}`, null, { headers });
      }
      
    } catch (e) {
      console.error(`[List Management ERROR] Exception: ${e.message}`);
    }
    
    sleep(0.3);
  });
}

// ============= USER FLOW: SEARCH =============

function searchFlow(authToken, marketId) {
  const headers = getAuthHeaders(authToken);
  
  group('Product Search', () => {
    const query = randomChoice(PRODUCT_SEARCH_TERMS);
    const encodedQuery = encodeURIComponent(query);
    
    if (isDebugEnabled('search')) {
      console.log(`[Search DEBUG] Searching products for: ${query}, market: ${marketId}`);
    }
    
    const searchRes = measureRequest(productSearchLatency, () =>
      http.get(`${BASE_URL}/shopping/api/v1/markets/search/products?query=${encodedQuery}&marketId=${marketId}`, { headers })
    );
    
    const success = check(searchRes, {
      'Product search successful': (r) => r.status === 200,
    });
    
    if (!success) {
      console.error(`[Search ERROR] Product search failed for '${query}' - Status: ${searchRes.status}, Body: ${searchRes.body ? searchRes.body.substring(0, 200) : 'empty'}`);
    } else if (isDebugEnabled('search')) {
      console.log(`[Search DEBUG] Product search returned: ${searchRes.body ? searchRes.body.substring(0, 100) : 'empty'}`);
    }
    
    sleep(0.3);
  });
  
  group('Recipe Search', () => {
    const query = randomChoice(RECIPE_SEARCH_TERMS);
    const encodedQuery = encodeURIComponent(query);
    
    if (isDebugEnabled('search')) {
      console.log(`[Search DEBUG] Searching recipes for: ${query}`);
    }
    
    const searchRes = measureRequest(recipeSearchLatency, () =>
      http.get(`${BASE_URL}/personalization/recipes/search?q=${encodedQuery}`, { headers })
    );
    
    const success = check(searchRes, {
      'Recipe search successful': (r) => r.status === 200,
    });
    
    if (!success) {
      console.error(`[Search ERROR] Recipe search failed for '${query}' - Status: ${searchRes.status}, Body: ${searchRes.body ? searchRes.body.substring(0, 200) : 'empty'}`);
    } else if (isDebugEnabled('search')) {
      console.log(`[Search DEBUG] Recipe search returned: ${searchRes.body ? searchRes.body.substring(0, 100) : 'empty'}`);
    }
    
    sleep(0.3);
  });
}

// ============= USER FLOW: VIEW HISTORY =============

function viewHistoryFlow(authToken) {
  const headers = getAuthHeaders(authToken);
  
  group('View History', () => {
    // User history - 404 is expected for new users with no history
    const historyRes = http.get(`${BASE_URL}/personalization/api/v1/user/history`, { headers, tags: { name: 'get_history' } });
    // 200 = has history, 404 = no history yet (expected, not an error)
    check(historyRes, {
      'History fetched or empty': (r) => r.status === 200 || r.status === 404,
    });
    if (isDebugEnabled('history')) {
      console.log(`[History DEBUG] User history status: ${historyRes.status}`);
    }
    
    // Shopping history - 200 expected (may return empty array)
    const shoppingHistoryRes = http.get(`${BASE_URL}/personalization/api/v1/user/shopping/history`, { headers, tags: { name: 'get_shopping_history' } });
    check(shoppingHistoryRes, {
      'Shopping history fetched': (r) => r.status === 200,
    });
    
    // Liked recipes - 404 is expected for new users with no likes
    const likedRes = http.get(`${BASE_URL}/personalization/api/v1/user/liked-recipes`, { headers, tags: { name: 'get_liked_recipes' } });
    // 200 = has likes, 404 = no likes yet (expected, not an error)
    check(likedRes, {
      'Liked recipes fetched or empty': (r) => r.status === 200 || r.status === 404,
    });
    if (isDebugEnabled('history')) {
      console.log(`[History DEBUG] Liked recipes status: ${likedRes.status}`);
    }
    
    sleep(0.5);
  });
}

// ============= MAIN VU FUNCTION =============

export default function (data) {
  const { userPool, testConfig } = data;
  
  // Track active users
  activeUsers.add(1);
  
  // Decide if this iteration represents a new or returning user
  const isNewUser = Math.random() < testConfig.newUserPercentage;
  
  let session = null;
  
  if (isNewUser) {
    // NEW USER FLOW
    session = signupFlow(null);
    
    if (session && session.authToken) {
      // New users MUST go through questionnaire (creates user embedding)
      const prefsCompleted = questionnaireFlow(session.authToken);
      
      // New users MUST select market
      const marketId = marketSelectionFlow(session.authToken, testConfig.postalCodes);
      
      // If both completed, user should ALWAYS get recommendations
      const hasCompletedSetup = prefsCompleted && marketId;
      
      if (hasCompletedSetup) {
        // Initial recipe exploration - should always succeed
        const swipeResult = recipeSwipeFlow(session.authToken, true);
        
        // Maybe create first shopping list
        if (swipeResult.likedRecipes.length > 0 && Math.random() > 0.5) {
          const recipeId = randomChoice(swipeResult.likedRecipes);
          shoppingListFlow(session.authToken, recipeId, marketId);
        }
      } else {
        console.error(`[New User ERROR] Failed to complete setup - Prefs: ${prefsCompleted}, Market: ${marketId}`);
      }
    }
  } else {
    // RETURNING USER FLOW
    const userData = randomChoice(userPool);
    session = loginFlow(userData);
    
    if (session && session.authToken) {
      // Check if user has preferences set up
      let marketId = null;
      let hasPreferences = false;
      
      const prefRes = http.get(`${BASE_URL}/personalization/api/v1/user/preferences`, 
        { headers: getAuthHeaders(session.authToken), tags: { name: 'get_preferences' } });
      
      if (prefRes.status === 200) {
        try {
          const prefs = prefRes.json();
          marketId = prefs.market_id;
          hasPreferences = true;
        } catch (e) {}
      } else if (prefRes.status === 404) {
        // User doesn't have preferences - need to complete setup first
        if (isDebugEnabled('flow')) {
          console.log(`[Flow DEBUG] Returning user ${userData.username} has no preferences - completing setup`);
        }
        const prefsCompleted = questionnaireFlow(session.authToken);
        hasPreferences = prefsCompleted;
      }
      
      // If no market, select one
      if (!marketId) {
        marketId = marketSelectionFlow(session.authToken, testConfig.postalCodes);
      }
      
      // Track if user has completed setup for proper error detection
      const hasCompletedSetup = hasPreferences && marketId;
      
      // Main activities with realistic weights:
      // - swipe: 40% (most common - browsing recipes)
      // - shopping: 25% (generating/managing shopping lists)
      // - search: 15% (searching products/recipes)
      // - manage: 12% (managing existing shopping list)
      // - history: 5% (viewing history)
      // - profile: 3% (updating preferences)
      const activities = ['swipe', 'shopping', 'search', 'manage', 'history', 'profile'];
      const weights = [40, 25, 15, 12, 5, 3];
      const activity = weightedRandomChoice(activities, weights);
      
      if (isDebugEnabled('flow')) {
        console.log(`[Flow DEBUG] Selected activity: ${activity}, hasCompletedSetup: ${hasCompletedSetup}`);
      }
      
      switch (activity) {
        case 'swipe':
          const swipeResult = recipeSwipeFlow(session.authToken, hasCompletedSetup);
          if (swipeResult.likedRecipes.length > 0 && marketId && Math.random() > 0.3) {
            const recipeId = randomChoice(swipeResult.likedRecipes);
            shoppingListFlow(session.authToken, recipeId, marketId);
          }
          break;
          
        case 'shopping':
          // Direct shopping from recommendations
          const recRes = http.get(`${BASE_URL}/personalization/api/v1/recipes/recommend`, 
            { headers: getAuthHeaders(session.authToken) });
          // If user completed setup, they should always get recommendations
          if (hasCompletedSetup && recRes.status !== 200) {
            errorRate.add(1);
            console.error(`[Shopping ERROR] User completed setup but got no recommendations - Status: ${recRes.status}`);
          }
          if (recRes.status === 200 && recRes.body && recRes.body !== 'null') {
            try {
              const recipes = recRes.json();
              if (Array.isArray(recipes) && recipes.length > 0 && marketId) {
                const recipe = randomChoice(recipes);
                const recipeId = recipe.id || recipe.recipe_id;
                shoppingListFlow(session.authToken, recipeId, marketId);
              }
            } catch (e) {}
          }
          break;
          
        case 'search':
          searchFlow(session.authToken, marketId);
          break;
          
        case 'history':
          viewHistoryFlow(session.authToken);
          break;
          
        case 'manage':
          shoppingListManagementFlow(session.authToken);
          break;
          
        case 'profile':
          // Occasionally update preferences
          questionnaireFlow(session.authToken);
          break;
      }
    }
  }
  
  // Think time between sessions
  sleep(randomInt(1, 3));
  
  // Reduce active user count
  activeUsers.add(-1);
}

// ============= TEARDOWN =============

export function teardown(data) {
  console.log("[Teardown] Load test completed");
  console.log(`[Teardown] Signup completions: ${signupComplete}`);
  console.log(`[Teardown] Login completions: ${loginComplete}`);
  console.log(`[Teardown] Shopping flow completions: ${shoppingFlowComplete}`);
  console.log(`[Teardown] Swipe flow completions: ${swipeFlowComplete}`);
}
