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
  
  console.log(`[Setup] Creating ${numUsers} test users...`);
  for (let i = 0; i < numUsers; i++) {
    const username = `loadtest_user_${Date.now()}_${i}`;
    const password = 'TestPass123!';
    
    const res = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
      username: username,
      password: password,
      name: `Load Test User ${i}`,
    }), { headers: { 'Content-Type': 'application/json' } });
    
    const isDuplicate = res.status === 500 && res.body && res.body.includes("duplicate key");
    
    if (res.status === 200 || res.status === 201 || res.status === 409 || isDuplicate) {
      userPool.push({ 
        username, 
        password, 
        isNew: false, // Pre-created users start as "returning"
        hasPreferences: false,
        hasMarket: false,
      });
    }
  }
  
  console.log(`[Setup] ✓ Ready with ${userPool.length} users`);
  
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
      return null;
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
      return null;
    }
    
    const authToken = extractAuthToken(loginRes);
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
      console.log(`[Login] Failed for ${userData.username}: ${loginRes.status}`);
      return null;
    }
    
    const authToken = extractAuthToken(loginRes);
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
      }), { headers })
    );
    
    const saved = check(prefRes, {
      'Preferences saved': (r) => r.status === 200 || r.status === 201,
    });
    
    if (!saved) {
      errorRate.add(1);
      console.log(`[Questionnaire] Failed: ${prefRes.status} - ${prefRes.body?.substring(0, 100)}`);
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
      return null;
    }
    
    try {
      const markets = marketRes.json();
      if (!Array.isArray(markets) || markets.length === 0) {
        console.log(`[Market] No markets for PLZ ${postalCode}`);
        return null;
      }
      
      // User selects a market
      const selectedMarket = randomChoice(markets);
      const marketId = selectedMarket.id || selectedMarket.market_id;
      
      const selectRes = measureRequest(personalizationLatency, () =>
        http.post(`${BASE_URL}/personalization/api/v1/user/market`, 
          JSON.stringify({ market_id: String(marketId) }), 
          { headers })
      );
      
      check(selectRes, {
        'Market selected': (r) => r.status === 200 || r.status === 201,
      });
      
      sleep(0.3);
      return marketId;
    } catch (e) {
      console.log(`[Market] Parse error: ${e.message}`);
      return null;
    }
  });
}

// ============= USER FLOW: RECIPE SWIPING =============

function recipeSwipeFlow(authToken) {
  const headers = getAuthHeaders(authToken);
  
  return group('Recipe Swipe Flow', () => {
    // Get recommendations
    const recRes = measureRequest(recommendationLatency, () =>
      http.get(`${BASE_URL}/personalization/api/v1/recipes/recommend`, { headers })
    );
    
    const fetched = check(recRes, {
      'Recommendations fetched': (r) => r.status === 200,
    });
    
    if (!fetched || !recRes.body || recRes.body === 'null') {
      return { likedRecipes: [], recipes: [] };
    }
    
    try {
      const recipes = recRes.json();
      if (!Array.isArray(recipes) || recipes.length === 0) {
        return { likedRecipes: [], recipes: [] };
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
        
        check(actionRes, {
          [`Recipe ${action} recorded`]: (r) => r.status === 200 || r.status === 201,
        });
        
        if (action === 'like') {
          likedRecipes.push(recipeId);
        }
        
        sleep(0.2); // Simulate looking at recipe
      }
      
      swipeFlowComplete.add(1);
      return { likedRecipes, recipes };
    } catch (e) {
      console.log(`[Swipe] Error: ${e.message}`);
      return { likedRecipes: [], recipes: [] };
    }
  });
}

// ============= USER FLOW: SHOPPING LIST =============

function shoppingListFlow(authToken, recipeId, marketId) {
  const headers = getAuthHeaders(authToken);
  
  return group('Shopping List Flow', () => {
    // Step 1: Generate shopping list with product options
    const generateRes = measureRequest(shoppingListGenerateLatency, () =>
      http.post(
        `${BASE_URL}/shopping/shopping-list/generate?marketId=${marketId}`,
        JSON.stringify([recipeId]),
        { headers }
      )
    );
    
    const generated = check(generateRes, {
      'Shopping list generated': (r) => r.status === 200,
    });
    
    if (!generated) {
      errorRate.add(1);
      console.log(`[Shopping] Generate failed: ${generateRes.status}`);
      return false;
    }
    
    try {
      const shoppingList = generateRes.json();
      const items = shoppingList.items || [];
      const cartItems = [];
      
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
            }
          }
        }
        sleep(0.05); // Simulate scanning options
      });
      
      if (cartItems.length === 0) {
        return true; // User had everything
      }
      
      // Step 2: Add selected products to shopping list
      const addRes = measureRequest(shoppingListAddLatency, () =>
        http.post(
          `${BASE_URL}/personalization/api/v1/user/add-to-list`,
          JSON.stringify(cartItems),
          { headers }
        )
      );
      
      const added = check(addRes, {
        'Items added to list': (r) => r.status === 200,
      });
      
      if (!added) {
        console.log(`[Shopping] Add failed: ${addRes.status}`);
      }
      
      shoppingFlowComplete.add(1);
      return added;
    } catch (e) {
      console.log(`[Shopping] Error: ${e.message}`);
      return false;
    }
  });
}

// ============= USER FLOW: SHOPPING LIST MANAGEMENT =============

function shoppingListManagementFlow(authToken) {
  const headers = getAuthHeaders(authToken);
  
  return group('Shopping List Management', () => {
    // Get active shopping list
    const listRes = http.get(`${BASE_URL}/personalization/api/v1/user/active/list`, { headers });
    
    const hasList = check(listRes, {
      'Active list fetched': (r) => r.status === 200,
    });
    
    if (!hasList) return;
    
    try {
      const list = listRes.json();
      
      // Check if we have a valid list with items
      if (list.message && list.message.includes('No active')) {
        return;
      }
      
      const groups = list.groups || [];
      const allItems = [];
      
      groups.forEach(group => {
        if (group.items && Array.isArray(group.items)) {
          allItems.push(...group.items);
        }
      });
      
      if (allItems.length === 0) return;
      
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
      console.log(`[List Management] Error: ${e.message}`);
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
    
    const searchRes = measureRequest(productSearchLatency, () =>
      http.get(`${BASE_URL}/shopping/api/v1/markets/search/products?query=${encodedQuery}&marketId=${marketId}`, { headers })
    );
    
    check(searchRes, {
      'Product search successful': (r) => r.status === 200,
    });
    
    sleep(0.3);
  });
  
  group('Recipe Search', () => {
    const query = randomChoice(RECIPE_SEARCH_TERMS);
    const encodedQuery = encodeURIComponent(query);
    
    const searchRes = measureRequest(recipeSearchLatency, () =>
      http.get(`${BASE_URL}/personalization/recipes/search?q=${encodedQuery}`, { headers })
    );
    
    check(searchRes, {
      'Recipe search successful': (r) => r.status === 200,
    });
    
    sleep(0.3);
  });
}

// ============= USER FLOW: VIEW HISTORY =============

function viewHistoryFlow(authToken) {
  const headers = getAuthHeaders(authToken);
  
  group('View History', () => {
    // User history - may return 404 if no history (expected)
    http.get(`${BASE_URL}/personalization/api/v1/user/history`, { headers, tags: { name: 'get_history' } });
    
    // Shopping history
    http.get(`${BASE_URL}/personalization/api/v1/user/shopping/history`, { headers, tags: { name: 'get_shopping_history' } });
    
    // Liked recipes - may return 404 if no likes (expected)
    http.get(`${BASE_URL}/personalization/api/v1/user/liked-recipes`, { headers, tags: { name: 'get_liked_recipes' } });
    
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
      // New users go through questionnaire
      questionnaireFlow(session.authToken);
      
      // Select market
      const marketId = marketSelectionFlow(session.authToken, testConfig.postalCodes);
      
      if (marketId) {
        // Initial recipe exploration
        const swipeResult = recipeSwipeFlow(session.authToken);
        
        // Maybe create first shopping list
        if (swipeResult.likedRecipes.length > 0 && Math.random() > 0.5) {
          const recipeId = randomChoice(swipeResult.likedRecipes);
          shoppingListFlow(session.authToken, recipeId, marketId);
        }
      }
    }
  } else {
    // RETURNING USER FLOW
    const userData = randomChoice(userPool);
    session = loginFlow(userData);
    
    if (session && session.authToken) {
      // Returning user might update preferences occasionally
      if (Math.random() > 0.9) {
        questionnaireFlow(session.authToken);
      }
      
      // Get market (or select new one)
      let marketId = null;
      if (Math.random() > 0.1) {
        // 90% already have a market, just need to get it
        const prefRes = http.get(`${BASE_URL}/personalization/api/v1/user/preferences`, 
          { headers: getAuthHeaders(session.authToken), tags: { name: 'get_preferences' } });
        // 200 = has preferences, 404 = new user without preferences (expected)
        if (prefRes.status === 200) {
          try {
            const prefs = prefRes.json();
            marketId = prefs.market_id;
          } catch (e) {}
        }
        // Don't count 404 as error for preferences check
      }
      
      if (!marketId) {
        marketId = marketSelectionFlow(session.authToken, testConfig.postalCodes);
      }
      
      // Main activities
      const activities = ['swipe', 'shopping', 'search', 'history', 'manage'];
      const activity = randomChoice(activities);
      
      switch (activity) {
        case 'swipe':
          const swipeResult = recipeSwipeFlow(session.authToken);
          if (swipeResult.likedRecipes.length > 0 && marketId && Math.random() > 0.3) {
            const recipeId = randomChoice(swipeResult.likedRecipes);
            shoppingListFlow(session.authToken, recipeId, marketId);
          }
          break;
          
        case 'shopping':
          // Direct shopping from recommendations
          const recRes = http.get(`${BASE_URL}/personalization/api/v1/recipes/recommend`, 
            { headers: getAuthHeaders(session.authToken) });
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
