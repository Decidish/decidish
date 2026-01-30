import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// CUSTOM METRICS
const errorRate = new Rate('errors');
const jobImpactCounter = new Counter('job_impact_tests');
const recommendationTime = new Trend('recommendation_latency');
const shoppingListTime = new Trend('shopping_list_latency');
const searchTime = new Trend('search_latency');

// CONFIGURATION
const BASE_URL = __ENV.BASE_URL || 'http://nginx';
const ENVIRONMENT = __ENV.ENVIRONMENT || 'staging'; // staging, production, local
const TOTAL_USERS = parseInt(__ENV.TOTAL_USERS) || 50;
const ENABLE_JOB_LOAD = __ENV.ENABLE_JOB_LOAD === 'true'; // Simulate background jobs
const TEST_DURATION = __ENV.TEST_DURATION || '5m';

// DEBUG Configuration
const DEBUG = __ENV.DEBUG || ''; // Set to 'all' or specific phases like 'market,search,recommendations'
const debugCategories = DEBUG ? DEBUG.toLowerCase().split(',').map(c => c.trim()) : [];
const isDebugEnabled = (category) => {
  if (!DEBUG) return false;
  if (DEBUG.toLowerCase() === 'all') return true;
  return debugCategories.includes(category.toLowerCase());
};

// POSTAL CODES - Diverse German postal codes for distributed load testing
// Covers major cities across different regions to test horizontal scalability
const POSTAL_CODES = [
  '10115', // Berlin Mitte
  '10178', // Berlin Alexanderplatz
  '20095', // Hamburg
  '80331', // Munich
  '60311', // Frankfurt
  '50667', // Cologne
  '70173', // Stuttgart
  '40210', // Düsseldorf
  '04109', // Leipzig
  '01067', // Dresden
  '30159', // Hannover
  '90402', // Nuremberg
  '28195', // Bremen
  '76133', // Karlsruhe
  '68159', // Mannheim
];

// SEARCH TERMS - German product/ingredient names from REWE database
const PRODUCT_SEARCH_TERMS = [
  'Tomaten', 'Kartoffeln', 'Zwiebeln', 'Knoblauch', 'Paprika',
  'Hähnchen', 'Rindfleisch', 'Lachs', 'Garnelen', 'Käse',
  'Milch', 'Butter', 'Eier', 'Sahne', 'Joghurt',
  'Brot', 'Nudeln', 'Reis', 'Mehl', 'Zucker',
  'Äpfel', 'Bananen', 'Orangen', 'Zitronen', 'Erdbeeren',
  'Salat', 'Gurke', 'Brokkoli', 'Spinat', 'Champignons'
];

const RECIPE_SEARCH_TERMS = [
  'Salat', 'Suppe', 'Curry', 'Hähnchen', 'Rindfleisch',
  'Fisch', 'vegetarisch', 'vegan', 'Dessert', 'Kuchen',
  'Brot', 'Frühstück', 'Abendessen', 'Mittagessen', 'Snack',
  'Vorspeise', 'Hauptspeise', 'italienisch', 'asiatisch', 'mexikanisch',
  'mediterran', 'Pasta', 'Kartoffelgratin', 'Bruschetta', 'Muffins'
];

console.log(`[CONFIG] Environment: ${ENVIRONMENT}, Base URL: ${BASE_URL}, Users: ${TOTAL_USERS}`);
console.log(`[CONFIG] Job Load Testing: ${ENABLE_JOB_LOAD}, Duration: ${TEST_DURATION}`);
console.log(`[CONFIG] Using ${POSTAL_CODES.length} different postal codes for load distribution`);
console.log(`[CONFIG] Using ${PRODUCT_SEARCH_TERMS.length} German product search terms and ${RECIPE_SEARCH_TERMS.length} German recipe search terms`);
if (DEBUG) console.log(`[CONFIG] Debug Mode: ${DEBUG}`);

export const options = {
  stages: [
    { duration: '30s', target: Math.floor(TOTAL_USERS * 0.4) },
    { duration: TEST_DURATION, target: TOTAL_USERS },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],
    'errors': ['rate<0.05'],
    'recommendation_latency': ['p(95)<2000'],
  },
};

export function setup() {
  const createdUsers = [];
  console.log(`[Setup] Registering ${TOTAL_USERS} test users...`);
  
  const checkRes = http.get(`${BASE_URL}/`);
  if (checkRes.status === 0) {
    throw new Error(`[CRITICAL] Cannot reach ${BASE_URL}. Is the app running?`);
  }

  for (let i = 1; i <= TOTAL_USERS; i++) {
    const username = `bench_user_${i}_${Date.now()}@test.com`;
    const password = 'password123';
    
    const res = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
      username: username,
      password: password,
      name: `Benchmark User ${i}`
    }), { headers: { 'Content-Type': 'application/json' } });

    const isDuplicate = res.status === 500 && res.body && res.body.includes("duplicate key");

    if (res.status === 200 || res.status === 201 || res.status === 409 || isDuplicate) {
      createdUsers.push({ username, password, userId: i });
    } else {
      console.error(`[Setup Failed] User ${i}: Status ${res.status}`);
    }
  }

  if (createdUsers.length === 0) throw new Error("No users created!");
  console.log(`[Setup] Ready with ${createdUsers.length} users.`);
  
  // Check if database is seeded with markets across different postal codes
  console.log("[Setup] Checking if database is seeded across multiple regions...");
  const samplePostalCodes = [POSTAL_CODES[0], POSTAL_CODES[Math.floor(POSTAL_CODES.length / 2)], POSTAL_CODES[POSTAL_CODES.length - 1]];
  let totalMarkets = 0;
  
  for (const plz of samplePostalCodes) {
    const marketCheckRes = http.get(`${BASE_URL}/shopping/api/v1/markets?plz=${plz}`);
    if (marketCheckRes.status === 200) {
      try {
        const markets = marketCheckRes.json();
        const marketCount = Array.isArray(markets) ? markets.length : (markets.markets ? markets.markets.length : 0);
        totalMarkets += marketCount;
        console.log(`[Setup] Postal code ${plz}: Found ${marketCount} markets`);
      } catch (e) {
        console.warn(`[Setup WARNING] Could not parse markets response for ${plz}:`, e.message);
      }
    } else {
      console.warn(`[Setup WARNING] Markets endpoint failed for ${plz} (${marketCheckRes.status})`);
    }
  }
  
  if (totalMarkets === 0) {
    console.warn("[Setup WARNING] No markets found in any region. Seed data before running full tests.");
  } else {
    console.log(`[Setup] Database check complete: ${totalMarkets} markets across ${samplePostalCodes.length} sample regions`);
  }
  
  // Optionally trigger background job for testing
  if (ENABLE_JOB_LOAD) {
    console.log("[Setup] Triggering background job: Import Recipes from REWE...");
    const jobRes = http.post(`${BASE_URL}/personalization/recipes/rewe`, 
      JSON.stringify({}), 
      { headers: { 'Content-Type': 'application/json' }, timeout: '10s' }
    );
    console.log(`[Setup] Job trigger response: ${jobRes.status}`);
  }

  return createdUsers; 
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
  if (response.json && response.json('token')) {
    return response.json('token');
  }
  return '';
}

function getRandomPostalCode() {
  return POSTAL_CODES[Math.floor(Math.random() * POSTAL_CODES.length)];
}

function getRandomProductSearchTerm() {
  return PRODUCT_SEARCH_TERMS[Math.floor(Math.random() * PRODUCT_SEARCH_TERMS.length)];
}

function getRandomRecipeSearchTerm() {
  return RECIPE_SEARCH_TERMS[Math.floor(Math.random() * RECIPE_SEARCH_TERMS.length)];
}

// ============= MAIN USER FLOW =============

export default function (data) {
  const user = data[Math.floor(Math.random() * data.length)];
  let authToken = '';
  let marketId = null;
  let recipeId = null;

  // --- PHASE 1: AUTHENTICATION ---
  group('1. Authentication', () => {
    // Login
    const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      username: user.username,
      password: user.password
    }), { headers: { 'Content-Type': 'application/json' } });

    const success = check(loginRes, {
      'Login successful': (r) => r.status === 200 || r.status === 201,
    });

    if (!success) {
      errorRate.add(1);
      console.log(`[Auth DEBUG] Login Failed - Status: ${loginRes.status}, Body: ${loginRes.body}`);
      return; 
    }

    authToken = extractAuthToken(loginRes);
    if (!authToken) {
      errorRate.add(1);
      console.log(`[Auth DEBUG] Could not extract auth token! Headers: ${JSON.stringify(loginRes.headers)}`);
      console.log(`[Auth DEBUG] Response body: ${loginRes.body}`);
      return;
    }

    sleep(0.5);
  });

  const headers = getAuthHeaders(authToken);

  // --- PHASE 2: QUESTIONNAIRE / PREFERENCES ---
  group('2. User Preferences Setup', () => {
    // Generate a simple default preference vector (35 dimensions based on Bruno example)
    const defaultVector = Array(35).fill(0).map(() => Math.random() > 0.5 ? 1 : 0);
    
    const prefRes = http.post(`${BASE_URL}/personalization/api/v1/user/preferences`, 
      JSON.stringify({
        dietary_restrictions: ['vegetarian'],
        allergies: ['peanuts'],
        cuisine_preferences: ['italian', 'asian'],
        spice_level: 'medium',
        cooking_time: 30,
        budget: 100,
        skill_level: 'intermediate',
        preference_vector: defaultVector
      }), 
      { headers }
    );

    const prefSet = check(prefRes, {
      'Preferences set': (r) => r.status === 200 || r.status === 201,
    });
    
    if (!prefSet) {
      console.log(`[Preferences DEBUG] Failed - Status: ${prefRes.status}, Body: ${prefRes.body}`);
      errorRate.add(1);
    }

    sleep(0.3);
  });

  // --- PHASE 3: MARKET SELECTION ---
  group('3. Market Selection', () => {
    // Markets are in the shopping/core service, requires plz (postal code) parameter
    // Use random postal code to distribute load across different regions
    const postalCode = getRandomPostalCode();
    const marketRes = http.get(`${BASE_URL}/shopping/api/v1/markets?plz=${postalCode}`, { headers });
    
    const marketsFetched = check(marketRes, {
      'Markets fetched': (r) => r.status === 200,
    });

    if (!marketsFetched) {
      console.log(`[Market DEBUG] Market selection failed - Postal code: "${postalCode}", Status: ${marketRes.status}, Body: ${marketRes.body}`);
      errorRate.add(1);
    }

    try {
      if (isDebugEnabled('market') || isDebugEnabled('all')) {
        console.log(`[Market DEBUG] Postal code: ${postalCode}`);
        console.log(`[Market DEBUG] Response status: ${marketRes.status}, Content-Type: ${marketRes.headers['Content-Type']}`);
        console.log(`[Market DEBUG] Response body (first 200 chars): ${marketRes.body ? marketRes.body.substring(0, 200) : 'empty'}`);
      }
      
      let markets = null;
      
      // Try parsing as JSON
      if (marketRes.body) {
        const jsonBody = marketRes.json();
        if (isDebugEnabled('market')) {
          console.log(`[Market DEBUG] Parsed JSON keys: ${Object.keys(jsonBody).join(', ')}`);
        }
        
        // Try different response structures
        markets = jsonBody.markets || jsonBody.data || jsonBody;
        
        if (Array.isArray(markets)) {
          if (isDebugEnabled('market')) {
            console.log(`[Market DEBUG] Found ${markets.length} markets as array`);
          }
        } else if (markets && typeof markets === 'object') {
          if (isDebugEnabled('market')) {
            console.log(`[Market DEBUG] Markets is object with keys: ${Object.keys(markets).join(', ')}`);
          }
        }
      }
      
      if (markets && Array.isArray(markets) && markets.length > 0) {
        if (isDebugEnabled('market')) {
          console.log(`[Market DEBUG] First market structure: ${JSON.stringify(markets[0]).substring(0, 100)}`);
        }
        marketId = markets[0].id || markets[0].market_id || markets[0].ID;
        if (isDebugEnabled('market')) {
          console.log(`[Market DEBUG] Selected market ID: ${marketId}`);
        }
        
        if (marketId) {
          const selectRes = http.post(`${BASE_URL}/personalization/api/v1/user/market`, 
            JSON.stringify({ market_id: String(marketId) }), // Convert to string
            { headers }
          );

          const selected = check(selectRes, {
            'Market selected': (r) => r.status === 200 || r.status === 201,
          });
          
          if (!selected) {
            console.log(`[Market DEBUG] Market selection failed - Status: ${selectRes.status}, Body: ${selectRes.body}`);
          }
        } else {
          console.log("[Market DEBUG] Could not extract market ID from market object");
        }
      } else {
        console.log("[Market DEBUG] No markets found in response or markets is not an array");
      }
    } catch (e) {
      console.log(`[Market DEBUG] Exception parsing markets: ${e.message}`);
      console.log(`[Market DEBUG] Stack: ${e.stack}`);
      errorRate.add(1);
    }

    sleep(0.5);
  });

  // --- PHASE 4: RECIPE SWIPER / RECOMMENDATIONS ---
  group('4. Recipe Discovery & Recommendations', () => {
    const recStart = new Date();
    const recRes = http.get(`${BASE_URL}/personalization/api/v1/recipes/recommend`, { headers });
    const recEnd = new Date();
    recommendationTime.add(recEnd - recStart);

    const recFetched = check(recRes, {
      'Recommendations fetched': (r) => r.status === 200,
    });
    
    if (!recFetched) {
      console.log(`[Recommendations DEBUG] Failed - Status: ${recRes.status}, Body: ${recRes.body}`);
      errorRate.add(1);
    }

    try {
      if (isDebugEnabled('recommendations')) {
        console.log(`[Recommendations DEBUG] Response body (first 200 chars): ${recRes.body ? recRes.body.substring(0, 200) : 'empty'}`);
      }
      
      // Handle null/undefined responses
      if (!recRes.body || recRes.body === 'null') {
        if (isDebugEnabled('recommendations')) {
          console.log("[Recommendations DEBUG] Response is null or empty - likely no recipes in database");
        }
        return;
      }
      
      const jsonBody = recRes.json();
      const recipes = jsonBody.recipes || jsonBody.data || jsonBody;
      
      if (isDebugEnabled('recommendations')) {
        console.log(`[Recommendations DEBUG] Found ${Array.isArray(recipes) ? recipes.length : 0} recipes`);
      }
      
      if (recipes && Array.isArray(recipes) && recipes.length > 0) {
        recipeId = recipes[0].id || recipes[0].recipe_id || recipes[0].ID;
        if (isDebugEnabled('recommendations')) {
          console.log(`[Recommendations DEBUG] Selected recipe ID: ${recipeId}`);
        }
        
        // Simulate user recording actions (like) for recipes
        for (let i = 0; i < Math.min(3, recipes.length); i++) {
          const currentRecipeId = recipes[i].id || recipes[i].recipe_id || recipes[i].ID;
          const likeRes = http.post(`${BASE_URL}/personalization/api/v1/user/record/like/${currentRecipeId}`, 
            JSON.stringify({}), 
            { headers }
          );
          if (likeRes.status !== 200 && likeRes.status !== 201) {
            console.log(`[Like DEBUG] Failed - Status: ${likeRes.status}, Body: ${likeRes.body.substring(0, 200)}`);
          }
          check(likeRes, { 'Recipe liked': (r) => r.status === 200 || r.status === 201 });
        }
      } else {
        if (isDebugEnabled('recommendations')) {
          console.log("[Recommendations DEBUG] No recipes found in response");
        }
      }
    } catch (e) {
      console.log(`[Recommendations DEBUG] Exception: ${e.message}`);
      errorRate.add(1);
    }

    sleep(1);
  });

  // --- PHASE 5: SHOPPING LIST WORKFLOW ---
  // Simulates the real user flow: generate product options, select products, add to shopping list
  if (recipeId && marketId) {
    group('5. Shopping List Workflow', () => {
      // Step 1: Generate shopping list with product options for the recipe
      const generateStart = new Date();
      const generateRes = http.post(
        `${BASE_URL}/shopping/shopping-list/generate?marketId=${marketId}`,
        JSON.stringify([recipeId]),
        { headers }
      );
      const generateEnd = new Date();
      shoppingListTime.add(generateEnd - generateStart);

      if (isDebugEnabled('shopping')) {
        console.log(`[Shopping Workflow DEBUG] Generate list status: ${generateRes.status}`);
        console.log(`[Shopping Workflow DEBUG] Response: ${generateRes.body ? generateRes.body.substring(0, 500) : 'empty'}`);
      }

      const generateSuccess = check(generateRes, {
        'Product options generated': (r) => r.status === 200,
      });

      if (!generateSuccess) {
        console.log(`[Shopping Workflow FAILED] Generate status: ${generateRes.status}, Body: ${generateRes.body ? generateRes.body.substring(0, 300) : 'empty'}`);
        return;
      }

      // Step 2: Parse product options and simulate user selections
      let cartItems = [];
      
      try {
        const shoppingList = generateRes.json();
        const items = shoppingList.items || [];
        
        if (isDebugEnabled('shopping')) {
          console.log(`[Shopping Workflow DEBUG] Found ${items.length} ingredient groups`);
        }

        // Simulate user selecting first available product for each ingredient
        items.forEach((ingredientGroup, idx) => {
          if (ingredientGroup.options && ingredientGroup.options.length > 0) {
            const selectedOption = ingredientGroup.options[0]; // Pick first option
            const product = selectedOption.product;
            const quantity = Math.max(1, Math.ceil(selectedOption.quantityToBuy || 1));
            
              // IMPORTANT: Only use products with valid product.id (not null)
              // reweId is NOT unique and will cause foreign key errors
              if (product.id !== null && product.id !== undefined) {
                cartItems.push({
                  product_id: product.id,
                  quantity: quantity,
                  recipe_id: recipeId
                });
              
                if (isDebugEnabled('shopping')) {
                  console.log(`[Shopping Workflow DEBUG] Ingredient ${idx + 1}: Selected ${product.name} (id: ${product.id}, qty: ${quantity})`);
                }
              } else {
                if (isDebugEnabled('shopping')) {
                  console.log(`[Shopping Workflow DEBUG] Ingredient ${idx + 1}: Skipped ${product.name} - no valid product.id (reweId: ${product.reweId})`);
                }
              }
          }
        });

        if (isDebugEnabled('shopping')) {
          console.log(`[Shopping Workflow DEBUG] Selected ${cartItems.length} products total`);
        }

      } catch (e) {
        console.log(`[Shopping Workflow ERROR] Failed to parse product options: ${e.message}`);
        return;
      }

      // Step 3: Add selected products to user's shopping list
      if (cartItems.length > 0) {
        if (isDebugEnabled('shopping')) {
          console.log(`[Shopping Workflow DEBUG] About to add ${cartItems.length} items for recipe_id: ${recipeId}`);
          console.log(`[Shopping Workflow DEBUG] Sample cart item (with fallback): ${JSON.stringify(cartItems[0])}`);
        }
        
        const addStart = new Date();
        const addRes = http.post(
          `${BASE_URL}/personalization/api/v1/user/add-to-list`,
          JSON.stringify(cartItems),
          { headers }
        );
        const addEnd = new Date();
        shoppingListTime.add(addEnd - addStart);

        if (isDebugEnabled('shopping')) {
          console.log(`[Shopping Workflow DEBUG] Add to list status: ${addRes.status}`);
          console.log(`[Shopping Workflow DEBUG] Response: ${addRes.body}`);
        }

        const addSuccess = check(addRes, {
          'Products added to shopping list': (r) => r.status === 200,
        });

        if (!addSuccess) {
          console.log(`[Shopping Workflow FAILED] Add to list status: ${addRes.status}, Body: ${addRes.body ? addRes.body.substring(0, 300) : 'empty'}`);
        }

        // Step 4: Verify shopping list now has items
        sleep(0.2); // Small delay for database consistency

        const listRes = http.get(`${BASE_URL}/personalization/api/v1/user/active/list`, { headers });

        if (isDebugEnabled('shopping')) {
          console.log(`[Shopping Workflow DEBUG] Verification list status: ${listRes.status}`);
          console.log(`[Shopping Workflow DEBUG] Response: ${listRes.body ? listRes.body.substring(0, 500) : 'empty'}`);
        }

        check(listRes, {
          'Shopping list retrieved': (r) => r.status === 200,
        });

        try {
          if (listRes.status === 200 && listRes.body) {
            const jsonBody = listRes.json();
            
            // Handle different response structures
            if (jsonBody.message && jsonBody.message.includes('No active shopping list')) {
              console.log(`[Shopping Workflow WARN] No active list found after adding ${cartItems.length} items`);
            } else {
              const groups = jsonBody.groups || [];
              let itemCount = 0;
              
              groups.forEach(group => {
                if (group.items && Array.isArray(group.items)) {
                  itemCount += group.items.length;
                }
              });
              
              if (isDebugEnabled('shopping')) {
                console.log(`[Shopping Workflow DEBUG] Shopping list has ${itemCount} items in ${groups.length} groups`);
              }
              
              check({ itemCount }, {
                'Shopping list contains items': (data) => data.itemCount > 0,
              });
            }
          }
        } catch (e) {
          console.log(`[Shopping Workflow ERROR] Failed to verify shopping list: ${e.message}`);
        }
      } else {
        console.log(`[Shopping Workflow WARN] No products to add - recipe may have no ingredients or no product matches`);
      }

      sleep(0.5);
    });
  }

  // --- PHASE 6: SHOPPING LIST PAGE & HISTORY ---
  group('6. Shopping List Management', () => {
    // Get active shopping list
    const activeRes = http.get(`${BASE_URL}/personalization/api/v1/user/active/list`, { headers });
    
    if (isDebugEnabled('shopping') || activeRes.status !== 200) {
      console.log(`[PHASE 6 DEBUG] Active shopping list status: ${activeRes.status}`);
    }
    if (activeRes.status !== 200) {
      console.log(`[PHASE 6 DEBUG] Response: ${activeRes.body.substring(0, 200)}`);
    }
    
    check(activeRes, {
      'Active list fetched': (r) => r.status === 200,
    });

    // Get shopping list history
    const historyRes = http.get(`${BASE_URL}/personalization/api/v1/user/shopping/history`, { headers });
    
    if (isDebugEnabled('shopping') || historyRes.status !== 200) {
      console.log(`[PHASE 6 DEBUG] Shopping history status: ${historyRes.status}`);
    }
    if (historyRes.status !== 200) {
      console.log(`[PHASE 6 DEBUG] Response: ${historyRes.body.substring(0, 200)}`);
    }
    
    check(historyRes, {
      'History fetched': (r) => r.status === 200,
    });

    sleep(0.5);
  });

  // --- PHASE 7: SEARCH PRODUCTS (from core/shopping service) ---
  group('7. Search Products', () => {
    const productQuery = getRandomProductSearchTerm();
    // "Äpfel" becomes "%C3%84pfel"
    const encodedQuery = encodeURIComponent(productQuery);
    const searchStart = new Date();
    const searchRes = http.get(`${BASE_URL}/shopping/api/v1/markets/search/products?query=${encodedQuery}&marketId=${marketId || 1}`, { headers });
    const searchEnd = new Date();
    searchTime.add(searchEnd - searchStart);

    if (searchRes.status !== 200) {
      console.log(`[Products Search DEBUG] Failed for query '${productQuery}' - Status: ${searchRes.status}, Body: ${searchRes.body.substring(0, 200)}`);
    }

    check(searchRes, {
      'Products searched': (r) => r.status === 200,
    });

    sleep(0.5);
  });

  // --- PHASE 8: SEARCH RECIPES ---
  group('8. Search Recipes', () => {
    const recipeQuery = getRandomRecipeSearchTerm();
    const encodedRecipeQuery = encodeURIComponent(recipeQuery);
    const recipeSearchRes = http.get(`${BASE_URL}/personalization/recipes/search?q=${encodedRecipeQuery}`, { headers });
    
    if (recipeSearchRes.status !== 200) {
      console.log(`[Recipes Search DEBUG] Failed for query '${recipeQuery}' - Status: ${recipeSearchRes.status}, Body: ${recipeSearchRes.body.substring(0, 200)}`);
    }
    
    check(recipeSearchRes, {
      'Recipes searched': (r) => r.status === 200,
    });

    sleep(0.5);
  });

  // --- PHASE 9: PROFILE & PREFERENCES UPDATE ---
  group('9. Profile Updates', () => {
    // Update market preference
    if (marketId) {
      const marketUpdateRes = http.post(`${BASE_URL}/personalization/api/v1/user/market`, 
        JSON.stringify({ market_id: String(marketId) }), // Convert to string
        { headers }
      );
      check(marketUpdateRes, {
        'Market preference updated': (r) => r.status === 200 || r.status === 201,
      });
    }

    // Update dietary preferences
    const prefUpdateVector = Array(35).fill(0).map(() => Math.random() > 0.5 ? 1 : 0);
    const prefUpdateRes = http.post(`${BASE_URL}/personalization/api/v1/user/preferences`, 
      JSON.stringify({
        dietary_restrictions: ['vegan'],
        allergies: ['shellfish'],
        cuisine_preferences: ['thai', 'mexican'],
        spice_level: 'high',
        cooking_time: 45,
        budget: 150,
        skill_level: 'advanced',
        preference_vector: prefUpdateVector
      }), 
      { headers }
    );

    if (prefUpdateRes.status !== 200 && prefUpdateRes.status !== 201) {
      console.log(`[Preferences Update DEBUG] Failed - Status: ${prefUpdateRes.status}, Body: ${prefUpdateRes.body.substring(0, 200)}`);
    }

    check(prefUpdateRes, {
      'Preferences updated': (r) => r.status === 200 || r.status === 201,
    });

    sleep(0.5);
  });

  // --- PHASE 10: ADD RECIPE VIA URL (if applicable) ---
  group('10. Recipe Import', () => {
    const importRes = http.post(`${BASE_URL}/personalization/api/v1/recipes/import`, 
      JSON.stringify({ 
        url: 'https://example.com/recipe/pasta',
        source: 'manual'
      }), 
      { headers, timeout: '5s' }
    );

    // This might not be implemented, so don't hard-fail
    if (importRes.status !== 0) {
      check(importRes, {
        'Recipe imported or attempted': (r) => r.status < 500,
      });
    }

    sleep(0.5);
  });

  // --- PHASE 11: USER ACTIVITY TRACKING ---
  group('11. Activity Tracking', () => {
    // Record a like action for the recipe using the /user/record/:action/:recipeID endpoint
    if (recipeId) {
      const activityRes = http.post(`${BASE_URL}/personalization/api/v1/user/record/like/${recipeId}`, 
        JSON.stringify({}), 
        { headers }
      );

      if (activityRes.status !== 200 && activityRes.status !== 201) {
        console.log(`[Activity DEBUG] Failed - Status: ${activityRes.status}, Body: ${activityRes.body.substring(0, 200)}`);
      }

      check(activityRes, {
        'Activity recorded': (r) => r.status === 200 || r.status === 201,
      });
    }

    sleep(0.3);
  });

  // --- PHASE 12: VERIFY APP RESPONSIVENESS UNDER JOB LOAD ---
  if (ENABLE_JOB_LOAD && __VU % 10 === 0) {
    group('12. Performance Check (During Job Load)', () => {
      jobImpactCounter.add(1);

      // Quick health check
      const healthRes = http.get(`${BASE_URL}/health`, { headers, timeout: '5s' });
      check(healthRes, {
        'Health check OK': (r) => r.status === 200,
      });

      // Get recommendations again to measure latency
      const recStart = new Date();
      const recRes = http.get(`${BASE_URL}/personalization/api/v1/recipes/recommend`, { headers });
      const recEnd = new Date();
      recommendationTime.add(recEnd - recStart);

      check(recRes, {
        'Recommendations still responsive': (r) => r.status === 200,
      });
    });
  }

  sleep(2); 
}