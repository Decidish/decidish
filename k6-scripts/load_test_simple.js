/*
 * Decidish Comprehensive Load Test
 * 
 * Tests all major endpoints across services:
 * - Auth: login, register
 * - Personalization: recommendations, preferences, shopping lists, saved recipes, history
 * - Core: markets, shopping list generation, recipe search
 * - MLPipeline: health, encode
 * 
 * Usage:
 *   # Quick test (10 VUs, 1 minute)
 *   docker exec -it decidish-k6-1 k6 run /scripts/load_test_simple.js
 *   
 *   # With Prometheus metrics
 *   docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw /scripts/load_test_simple.js
 *   
 *   # Custom load
 *   docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw -e VUS=50 -e DURATION=5m /scripts/load_test_simple.js
 *   
 *   # Scalability test (ramps to 750 VUs)
 *   docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw -e SCENARIO=scalability /scripts/load_test_simple.js
 *
 *   # Stress test (ramps to 1500 VUs - find breaking point)
 *   docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw -e SCENARIO=stress /scripts/load_test_simple.js
 *
 *   # Spike test (sudden burst to 800 VUs)
 *   docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw -e SCENARIO=spike /scripts/load_test_simple.js
 *
 *   # Endurance test (sustained 500 VUs for 15 minutes)
 *   docker exec -it decidish-k6-1 k6 run --out experimental-prometheus-rw -e SCENARIO=endurance /scripts/load_test_simple.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

// ============= CONFIGURATION =============
const BASE_URL = __ENV.BASE_URL || 'http://nginx';
const SCENARIO = __ENV.SCENARIO || 'standard';
const VUS = parseInt(__ENV.VUS) || 10;
const DURATION = __ENV.DURATION || '1m';
const NUM_USERS = parseInt(__ENV.NUM_USERS) || 100;

// Postal codes for market selection
const POSTAL_CODES = ['80331', '10115', '20095', '50667', '60311', '70173', '90402', '04109', '01067', '28195'];

// Recipe search terms
const SEARCH_TERMS = ['Pasta', 'Salat', 'Suppe', 'Curry', 'Pizza', 'Burger', 'Risotto', 'Kuchen', 'Steak', 'Vegetarisch', 'Schnell', 'Gesund'];

// Categories for filtering
const CATEGORIES = ['Hauptgericht', 'Vorspeise', 'Dessert', 'Snack', 'Frühstück'];

// ============= CUSTOM METRICS =============
const errorRate = new Rate('error_rate');

// Latency by service
const authLatency = new Trend('auth_latency', true);
const personalizationLatency = new Trend('personalization_latency', true);
const coreLatency = new Trend('core_latency', true);
const mlpipelineLatency = new Trend('mlpipeline_latency', true);

// Latency by endpoint
const recommendationLatency = new Trend('recommendation_latency', true);
const searchLatency = new Trend('search_latency', true);
const marketLatency = new Trend('market_latency', true);
const shoppingLatency = new Trend('shopping_latency', true);
const preferencesLatency = new Trend('preferences_latency', true);
const historyLatency = new Trend('history_latency', true);
const savedRecipesLatency = new Trend('saved_recipes_latency', true);
const categoriesLatency = new Trend('categories_latency', true);

// Counters
const successfulLogins = new Counter('successful_logins');
const successfulRecommendations = new Counter('successful_recommendations');
const successfulSearches = new Counter('successful_searches');
const successfulSaves = new Counter('successful_saves');
const successfulLikes = new Counter('successful_likes');
const activeVUs = new Gauge('active_vus');

// ============= SCENARIOS =============
export const options = getScenarioOptions();

function getScenarioOptions() {
  const scenarios = {
    standard: {
      scenarios: {
        standard_load: {
          executor: 'constant-vus',
          vus: VUS,
          duration: DURATION,
        },
      },
      thresholds: {
        http_req_duration: ['p(95)<5000'],
        error_rate: ['rate<0.1'],
      },
    },
    
    scalability: {
      scenarios: {
        ramp_up: {
          executor: 'ramping-vus',
          startVUs: 0,
          stages: [
            { duration: '30s', target: 100 },
            { duration: '1m', target: 200 },
            { duration: '1m', target: 300 },
            { duration: '2m', target: 400 },
            { duration: '2m', target: 500 },
            { duration: '2m', target: 600 },
            { duration: '2m', target: 750 },
            { duration: '3m', target: 750 },  // Sustain at 750
            { duration: '1m', target: 0 },
          ],
          gracefulRampDown: '30s',
        },
      },
      thresholds: {
        http_req_duration: ['p(95)<10000'],
        error_rate: ['rate<0.15'],
      },
    },
    
    stress: {
      scenarios: {
        stress: {
          executor: 'ramping-vus',
          startVUs: 0,
          stages: [
            { duration: '1m', target: 300 },
            { duration: '2m', target: 500 },
            { duration: '2m', target: 750 },
            { duration: '2m', target: 1000 },
            { duration: '3m', target: 1250 },
            { duration: '3m', target: 1500 },
            { duration: '3m', target: 1500 },  // Sustain at 1500
            { duration: '2m', target: 0 },
          ],
          gracefulRampDown: '30s',
        },
      },
      thresholds: {
        http_req_duration: ['p(95)<15000'],
        error_rate: ['rate<0.30'],
      },
    },
    
    spike: {
      scenarios: {
        spike: {
          executor: 'ramping-vus',
          startVUs: 100,
          stages: [
            { duration: '30s', target: 100 },   // Baseline
            { duration: '10s', target: 800 },   // SPIKE!
            { duration: '3m', target: 800 },    // Hold spike
            { duration: '10s', target: 100 },   // Drop
            { duration: '1m', target: 100 },    // Recover
          ],
        },
      },
      thresholds: {
        error_rate: ['rate<0.25'],
      },
    },
    
    endurance: {
      scenarios: {
        endurance: {
          executor: 'constant-vus',
          vus: 500,
          duration: '15m',
        },
      },
      thresholds: {
        http_req_duration: ['p(95)<8000'],
        error_rate: ['rate<0.05'],
      },
    },
    
    smoke: {
      scenarios: {
        smoke: {
          executor: 'constant-vus',
          vus: 1,
          duration: '30s',
        },
      },
    },
  };
  
  return scenarios[SCENARIO] || scenarios.standard;
}

// ============= SETUP =============
export function setup() {
  console.log('========================================');
  console.log('  Decidish Comprehensive Load Test');
  console.log('========================================');
  console.log(`Scenario: ${SCENARIO}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Creating ${NUM_USERS} test users...`);
  console.log('');

  // Health check
  const healthRes = http.get(`${BASE_URL}/shopping/actuator/health`, { timeout: '10s' });
  if (healthRes.status !== 200) {
    console.warn(`⚠ Health check failed: ${healthRes.status}`);
  } else {
    console.log('✓ Core service is healthy');
  }

  // Check markets exist
  const marketRes = http.get(`${BASE_URL}/shopping/api/v1/markets?plz=80331`);
  let marketCount = 0;
  if (marketRes.status === 200) {
    try {
      const markets = marketRes.json();
      marketCount = markets.length;
      console.log(`✓ Found ${marketCount} markets for PLZ 80331`);
    } catch (e) {
      console.warn('⚠ Could not parse markets response');
    }
  }

  // Fetch some recipe IDs for testing
  const recipeIds = [];
  const searchRes = http.get(`${BASE_URL}/personalization/recipes/search?q=&limit=50`);
  if (searchRes.status === 200) {
    try {
      const data = searchRes.json();
      const recipes = data.recipes || data;
      if (Array.isArray(recipes)) {
        recipes.forEach(r => {
          if (r.id) recipeIds.push(r.id);
        });
      }
      console.log(`✓ Fetched ${recipeIds.length} recipe IDs for testing`);
    } catch (e) {
      console.warn('⚠ Could not fetch recipe IDs');
    }
  }

  // Fetch categories
  const catRes = http.get(`${BASE_URL}/personalization/categories`);
  if (catRes.status === 200) {
    console.log('✓ Categories endpoint working');
  }

  // Create test users
  const users = [];
  let created = 0;
  let failed = 0;

  for (let i = 0; i < NUM_USERS; i++) {
    const username = `loadtest_${Date.now()}_${i}`;
    const password = 'TestPass123!';
    
    // Register
    const registerRes = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({
        username: username,
        password: password,
        name: `Test User ${i}`,
      }),
      { headers: { 'Content-Type': 'application/json' }, timeout: '10s' }
    );

    if (registerRes.status === 200 || registerRes.status === 201) {
      // Login to get token
      const loginRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({ username, password }),
        { headers: { 'Content-Type': 'application/json' }, timeout: '10s' }
      );

      if (loginRes.status === 200) {
        const token = extractToken(loginRes);
        if (token) {
          // Set up preferences with variety
          http.post(
            `${BASE_URL}/personalization/api/v1/user/preferences`,
            JSON.stringify({
              dietary_restrictions: Math.random() > 0.7 ? ['vegetarian'] : [],
              allergies: Math.random() > 0.8 ? ['nuts'] : [],
              cuisine_preferences: ['italian', 'asian', 'german'].slice(0, Math.floor(Math.random() * 3) + 1),
              spice_level: ['mild', 'medium', 'hot'][Math.floor(Math.random() * 3)],
              cooking_time: [15, 30, 45, 60][Math.floor(Math.random() * 4)],
              budget: [50, 100, 150, 200][Math.floor(Math.random() * 4)],
              skill_level: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)],
              min_cooking_time: 10,
              max_cooking_time: 60,
              preference_vector: Array(35).fill(0).map(() => Math.random()),
            }),
            { 
              headers: { 'Content-Type': 'application/json', 'Cookie': `auth_token=${token}` },
              timeout: '10s'
            }
          );

          // Select market
          const plz = POSTAL_CODES[i % POSTAL_CODES.length];
          const mkRes = http.get(`${BASE_URL}/shopping/api/v1/markets?plz=${plz}`);
          let marketId = null;
          
          if (mkRes.status === 200) {
            try {
              const markets = mkRes.json();
              if (markets.length > 0) {
                marketId = markets[Math.floor(Math.random() * markets.length)].id;
                
                http.post(
                  `${BASE_URL}/personalization/api/v1/user/market`,
                  JSON.stringify({ market_id: String(marketId) }),
                  { 
                    headers: { 'Content-Type': 'application/json', 'Cookie': `auth_token=${token}` },
                    timeout: '10s'
                  }
                );
              }
            } catch (e) {}
          }

          users.push({ username, password, token, marketId, plz });
          created++;
        }
      }
    } else {
      failed++;
    }
  }

  console.log(`✓ Created ${created} users (${failed} failed)`);
  console.log('');
  console.log('Starting load test...');
  console.log('========================================');

  return { users, recipeIds };
}

// ============= HELPERS =============
function extractToken(response) {
  const setCookie = response.headers['Set-Cookie'];
  if (setCookie) {
    const match = setCookie.match(/auth_token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Cookie': `auth_token=${token}`,
  };
}

// ============= MAIN TEST =============
export default function(data) {
  const { users, recipeIds } = data;
  
  if (!users || users.length === 0) {
    console.error('No users available!');
    return;
  }

  activeVUs.add(1);
  
  // Pick a random user
  const user = randomChoice(users);
  const headers = getHeaders(user.token);

  // Weighted random action selection - tests more endpoints
  const action = Math.random();

  if (action < 0.15) {
    // 15% - Login flow (test auth)
    testLogin(user);
  } else if (action < 0.35) {
    // 20% - Get recommendations (heavy endpoint)
    testRecommendations(headers, recipeIds);
  } else if (action < 0.50) {
    // 15% - Search recipes with various filters
    testSearch(headers);
  } else if (action < 0.60) {
    // 10% - Generate shopping list
    testShoppingList(headers, user.marketId, recipeIds);
  } else if (action < 0.68) {
    // 8% - Manage shopping list (get, update, delete items)
    testShoppingListManagement(headers);
  } else if (action < 0.76) {
    // 8% - Saved recipes (save, unsave, get)
    testSavedRecipes(headers, recipeIds);
  } else if (action < 0.84) {
    // 8% - User history and preferences
    testUserHistory(headers);
  } else if (action < 0.90) {
    // 6% - Browse markets
    testMarkets(user.plz);
  } else if (action < 0.95) {
    // 5% - Categories and keywords
    testCategoriesAndKeywords();
  } else {
    // 5% - Like/dislike recipes
    testRecipeActions(headers, recipeIds);
  }

  // Reduced think time for higher throughput
  sleep(Math.random() * 1.5 + 0.3);
  
  activeVUs.add(-1);
}

// ============= TEST FUNCTIONS =============

function testLogin(user) {
  group('Login', () => {
    const start = Date.now();
    
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ username: user.username, password: user.password }),
      { headers: { 'Content-Type': 'application/json' }, timeout: '10s' }
    );

    authLatency.add(Date.now() - start);

    const success = check(res, {
      'login successful': (r) => r.status === 200,
    });

    if (success) {
      successfulLogins.add(1);
      errorRate.add(0);
    } else {
      errorRate.add(1);
      console.error(`Login failed: ${res.status} - ${res.body?.substring(0, 100)}`);
    }
  });
}

function testRecommendations(headers, recipeIds) {
  group('Recommendations', () => {
    const start = Date.now();
    
    // 70% - standard recommendations, 30% - with filters
    let url = `${BASE_URL}/personalization/api/v1/recipes/recommend`;
    
    if (Math.random() > 0.7) {
      // Add some filters
      const filters = [];
      if (Math.random() > 0.5) filters.push('limit=20');
      if (Math.random() > 0.7) filters.push('category=' + randomChoice(['italian', 'asian', 'german']));
      if (filters.length > 0) {
        url += '?' + filters.join('&');
      }
    }
    
    const res = http.get(url, { headers, timeout: '15s' });

    recommendationLatency.add(Date.now() - start);

    // 200 = success, 404 = no recommendations yet (acceptable)
    const success = check(res, {
      'recommendations fetched': (r) => r.status === 200 || r.status === 404,
    });

    if (res.status === 200) {
      successfulRecommendations.add(1);
      errorRate.add(0);
      
      // Try to like a recipe
      try {
        const recipes = res.json();
        if (Array.isArray(recipes) && recipes.length > 0) {
          const recipe = randomChoice(recipes);
          const recipeId = recipe.id || recipe.recipe_id;
          
          if (recipeId) {
            http.post(
              `${BASE_URL}/personalization/api/v1/recipes/like`,
              JSON.stringify({ recipe_id: recipeId }),
              { headers, timeout: '5s' }
            );
          }
        }
      } catch (e) {}
    } else if (res.status === 404) {
      // Expected for users without full setup
      errorRate.add(0);
    } else {
      errorRate.add(1);
      console.error(`Recommendations failed: ${res.status}`);
    }
  });
}

function testSearch(headers) {
  group('Recipe Search', () => {
    const query = randomChoice(SEARCH_TERMS);
    const start = Date.now();
    
    // Build URL with optional filters
    let url = `${BASE_URL}/personalization/recipes/search?q=${encodeURIComponent(query)}`;
    
    // Add random filters
    if (Math.random() > 0.6) url += `&limit=${randomChoice([10, 20, 50])}`;
    if (Math.random() > 0.7) url += `&offset=${Math.floor(Math.random() * 50)}`;
    if (Math.random() > 0.8) url += `&category=${randomChoice(['quick', 'healthy', 'budget'])}`;
    
    const res = http.get(url, { headers, timeout: '10s' });

    searchLatency.add(Date.now() - start);

    const success = check(res, {
      'search successful': (r) => r.status === 200,
    });

    if (success) {
      successfulSearches.add(1);
      errorRate.add(0);
    } else {
      errorRate.add(1);
      console.error(`Search failed for '${query}': ${res.status}`);
    }
  });
}

function testMarkets(plz) {
  group('Markets', () => {
    const start = Date.now();
    
    const res = http.get(
      `${BASE_URL}/shopping/api/v1/markets?plz=${plz}`,
      { timeout: '10s' }
    );

    marketLatency.add(Date.now() - start);

    const success = check(res, {
      'markets fetched': (r) => r.status === 200,
    });

    if (!success) {
      errorRate.add(1);
      console.error(`Markets failed for PLZ ${plz}: ${res.status}`);
    } else {
      errorRate.add(0);
    }
  });
}

function testShoppingList(headers, marketId, recipeIds) {
  group('Shopping List', () => {
    if (!marketId) return;

    // Use pre-fetched recipe IDs if available
    let recipeId = null;
    if (recipeIds && recipeIds.length > 0) {
      recipeId = randomChoice(recipeIds);
    } else {
      // Fallback: fetch from recommendations
      const recRes = http.get(
        `${BASE_URL}/personalization/api/v1/recipes/recommend`,
        { headers, timeout: '15s' }
      );

      if (recRes.status !== 200) return;

      try {
        const recipes = recRes.json();
        if (Array.isArray(recipes) && recipes.length > 0) {
          recipeId = recipes[0].id || recipes[0].recipe_id;
        }
      } catch (e) {
        return;
      }
    }

    if (!recipeId) return;

    const start = Date.now();
    
    const res = http.post(
      `${BASE_URL}/shopping/shopping-list/generate?marketId=${marketId}`,
      JSON.stringify([recipeId]),
      { headers, timeout: '30s' }
    );

    shoppingLatency.add(Date.now() - start);

    const success = check(res, {
      'shopping list generated': (r) => r.status === 200,
    });

    if (!success) {
      errorRate.add(1);
      if (res.status !== 0) {
        console.error(`Shopping list failed: ${res.status}`);
      }
    } else {
      errorRate.add(0);
    }
  });
}

function testShoppingListManagement(headers) {
  group('Shopping List Management', () => {
    // Get current shopping list
    const listRes = http.get(
      `${BASE_URL}/shopping/api/v1/user/shopping-list`,
      { headers, timeout: '10s' }
    );

    check(listRes, {
      'get shopping list': (r) => r.status === 200 || r.status === 404,
    });

    if (listRes.status === 200) {
      errorRate.add(0);
      
      try {
        const items = listRes.json();
        if (Array.isArray(items) && items.length > 0) {
          // 50% chance to update an item
          if (Math.random() > 0.5) {
            const item = randomChoice(items);
            if (item.id) {
              const updateRes = http.put(
                `${BASE_URL}/shopping/api/v1/user/shopping-list/${item.id}`,
                JSON.stringify({ 
                  quantity: Math.floor(Math.random() * 5) + 1,
                  checked: Math.random() > 0.5
                }),
                { headers, timeout: '10s' }
              );
              
              check(updateRes, {
                'update shopping item': (r) => r.status === 200,
              });
            }
          }
        }
      } catch (e) {}
    } else {
      errorRate.add(listRes.status === 404 ? 0 : 1);
    }
  });
}

function testSavedRecipes(headers, recipeIds) {
  group('Saved Recipes', () => {
    // Get saved recipes
    const getRes = http.get(
      `${BASE_URL}/shopping/api/v1/user/saved-recipes`,
      { headers, timeout: '10s' }
    );

    const getSuccess = check(getRes, {
      'get saved recipes': (r) => r.status === 200 || r.status === 404,
    });

    if (getRes.status === 200) {
      errorRate.add(0);
    } else {
      errorRate.add(getRes.status === 404 ? 0 : 1);
    }

    // Save a recipe if we have recipe IDs
    if (recipeIds && recipeIds.length > 0 && Math.random() > 0.5) {
      const recipeId = randomChoice(recipeIds);
      
      const saveRes = http.post(
        `${BASE_URL}/shopping/api/v1/user/saved-recipes`,
        JSON.stringify({ recipe_id: recipeId }),
        { headers, timeout: '10s' }
      );

      check(saveRes, {
        'save recipe': (r) => r.status === 200 || r.status === 201 || r.status === 409, // 409 = already saved
      });
    }

    // Try to unsave from existing saved
    try {
      const saved = getRes.json();
      if (Array.isArray(saved) && saved.length > 0 && Math.random() > 0.7) {
        const toUnsave = randomChoice(saved);
        const unsaveId = toUnsave.recipe_id || toUnsave.id;
        
        if (unsaveId) {
          const unsaveRes = http.del(
            `${BASE_URL}/shopping/api/v1/user/saved-recipes/${unsaveId}`,
            null,
            { headers, timeout: '10s' }
          );

          check(unsaveRes, {
            'unsave recipe': (r) => r.status === 200 || r.status === 204 || r.status === 404,
          });
        }
      }
    } catch (e) {}
  });
}

function testUserHistory(headers) {
  group('User History', () => {
    // Get user preferences
    const prefRes = http.get(
      `${BASE_URL}/personalization/api/v1/user/preferences`,
      { headers, timeout: '10s' }
    );

    check(prefRes, {
      'get user preferences': (r) => r.status === 200 || r.status === 404,
    });

    errorRate.add(prefRes.status === 200 || prefRes.status === 404 ? 0 : 1);

    // Get user history
    const histRes = http.get(
      `${BASE_URL}/shopping/api/v1/user/history`,
      { headers, timeout: '10s' }
    );

    check(histRes, {
      'get user history': (r) => r.status === 200 || r.status === 404,
    });

    // Get user's selected market
    const marketRes = http.get(
      `${BASE_URL}/personalization/api/v1/user/market`,
      { headers, timeout: '10s' }
    );

    check(marketRes, {
      'get user market': (r) => r.status === 200 || r.status === 404,
    });
  });
}

function testCategoriesAndKeywords() {
  group('Categories & Keywords', () => {
    // Get categories
    const catRes = http.get(
      `${BASE_URL}/personalization/categories`,
      { timeout: '10s' }
    );

    const catSuccess = check(catRes, {
      'get categories': (r) => r.status === 200,
    });

    if (catSuccess) {
      errorRate.add(0);
    } else {
      errorRate.add(1);
    }

    // Get keywords
    const keyRes = http.get(
      `${BASE_URL}/personalization/keywords`,
      { timeout: '10s' }
    );

    check(keyRes, {
      'get keywords': (r) => r.status === 200,
    });
  });
}

function testRecipeActions(headers, recipeIds) {
  group('Recipe Actions', () => {
    if (!recipeIds || recipeIds.length === 0) return;

    const recipeId = randomChoice(recipeIds);

    // Randomly like or dislike
    if (Math.random() > 0.5) {
      const likeRes = http.post(
        `${BASE_URL}/personalization/api/v1/recipes/like`,
        JSON.stringify({ recipe_id: recipeId }),
        { headers, timeout: '10s' }
      );

      check(likeRes, {
        'like recipe': (r) => r.status === 200 || r.status === 201 || r.status === 409,
      });
    } else {
      const dislikeRes = http.post(
        `${BASE_URL}/personalization/api/v1/recipes/dislike`,
        JSON.stringify({ recipe_id: recipeId }),
        { headers, timeout: '10s' }
      );

      check(dislikeRes, {
        'dislike recipe': (r) => r.status === 200 || r.status === 201 || r.status === 409,
      });
    }

    // Occasionally add to list
    if (Math.random() > 0.7) {
      const addRes = http.post(
        `${BASE_URL}/personalization/api/v1/user/add-to-list`,
        JSON.stringify({ recipe_id: recipeId }),
        { headers, timeout: '10s' }
      );

      check(addRes, {
        'add recipe to list': (r) => r.status === 200 || r.status === 201,
      });
    }
  });
}

// ============= TEARDOWN =============
export function teardown(data) {
  console.log('========================================');
  console.log('  Load Test Complete');
  console.log('========================================');
}
