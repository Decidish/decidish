import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

// CUSTOM METRICS
const errorRate = new Rate('errors');

const BASE_URL = 'http://nginx';
const TOTAL_USERS = 50;

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'],
    'errors': ['rate<0.01'],
  },
};

export function setup() {
  const createdUsers = [];
  console.log(`[Setup] Registering ${TOTAL_USERS} test users...`);
  
  const checkRes = http.get(`${BASE_URL}/`);
  if (checkRes.status === 0) {
    throw new Error(`[CRITICAL] Cannot reach ${BASE_URL}. Is k6 on the 'app-network'?`);
  }

  for (let i = 1; i <= TOTAL_USERS; i++) {
    const username = `bench_user_${i}_${__VU}@test.com`;
    const password = 'password123';
    
    const res = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
      username: username,
      password: password,
      name: `Benchmark User ${i}`
    }), { headers: { 'Content-Type': 'application/json' } });

    // Accept 200/201 (Created) OR 500 (Duplicate Key)
    const isDuplicate = res.status === 500 && res.body && res.body.includes("duplicate key");

    if (res.status === 200 || res.status === 201 || res.status === 409 || isDuplicate) {
      createdUsers.push({ username, password });
    } else {
      console.error(`[Setup Failed] User ${i}: Status ${res.status} - ${res.body}`);
    }
  }

  if (createdUsers.length === 0) throw new Error("No users created!");
  console.log(`[Setup] Ready with ${createdUsers.length} users.`);
  return createdUsers; 
}

export default function (data) {
  const user = data[Math.floor(Math.random() * data.length)];
  let authToken = '';

  // 1. LOGIN
  group('Auth Flow', () => {
    const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      username: user.username,
      password: user.password
    }), { headers: { 'Content-Type': 'application/json' } });

    const success = check(loginRes, {
      'Logged in': (r) => r.status === 200,
    });

    if (!success) {
      errorRate.add(1);
      console.log(`Login Failed: ${loginRes.status} ${loginRes.body}`);
      return; 
    }

    // --- CRITICAL FIX: EXTRACT COOKIE MANUALLY ---
    // k6 ignores the cookie because the domain (.decidish.win) doesn't match host (nginx)
    // We parse the header string manually: "auth_token=xyz; Path=/; Domain=..."
    const setCookie = loginRes.headers['Set-Cookie'];
    if (setCookie) {
        // Regex to grab everything between "auth_token=" and the next ";"
        const match = setCookie.match(/auth_token=([^;]+)/);
        if (match) {
            authToken = match[1];
        }
    }
    
    // Fallback: If your app changes to return it in JSON later
    if (!authToken && loginRes.json('token')) {
        authToken = loginRes.json('token');
    }

    if (!authToken) {
       console.log("CRITICAL: Could not find auth_token in Cookie or Body!");
       errorRate.add(1);
    }
  });

  // 2. PREPARE HEADERS (Manually inject Cookie)
  const headers = { 
    'Content-Type': 'application/json'
  };
  
  // Your Go Middleware looks for c.Cookie("auth_token"). 
  // We simulate the browser sending it back.
  if (authToken) {
      headers['Cookie'] = `auth_token=${authToken}`;
  }

  // 3. BROWSING
  if (authToken) {
      group('Discovery', () => {
        const recRes = http.get(`${BASE_URL}/personalization/api/v1/recipes/recommend`, { headers });
        // DEBUG: Print error if it fails
        if (recRes.status !== 200) {
            console.log(`[Recs Failed] Status: ${recRes.status}`);
            // Only print body if it's short (avoid spamming console with HTML)
            if (recRes.body && recRes.body.length < 200) {
                console.log(`[Recs Body] ${recRes.body}`);
            }
        }
        check(recRes, { 'Recommendations OK': (r) => r.status === 200 });
        
        sleep(1);
      });
  }

  sleep(2); 
}