import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://nginx';
const POLL_INTERVAL = parseInt(__ENV.POLL_INTERVAL || '5', 10); // seconds
const TIMEOUT = parseInt(__ENV.TIMEOUT || '1800', 10); // seconds (30 minutes)

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  const triggerRes = http.post(`${BASE_URL}/shopping/api/v1/jobs/weekly-sync`, JSON.stringify({}), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  });

  check(triggerRes, {
    'trigger accepted': (r) => r.status === 200,
  });

  let elapsed = 0;
  let lastStatus = null;
  let lastMetrics = null;

  while (elapsed < TIMEOUT) {
    const statusRes = http.get(`${BASE_URL}/shopping/api/v1/jobs/status`, { timeout: '10s' });
    const ok = check(statusRes, {
      'status ok': (r) => r.status === 200,
    });

    if (ok) {
      try {
        const body = statusRes.json();
        lastStatus = body.status;
        lastMetrics = body.metrics;
        if (lastStatus === 'idle' && lastMetrics && lastMetrics.endTimeMs > 0) {
          break;
        }
      } catch (e) {
        // ignore parse errors and retry
      }
    }

    sleep(POLL_INTERVAL);
    elapsed += POLL_INTERVAL;
  }

  if (lastMetrics) {
    check(lastMetrics, {
      'weekly sync completed': () => lastMetrics.endTimeMs > 0,
      'api calls made': () => (lastMetrics.apiCalls || 0) > 0,
      'products processed': () => (lastMetrics.productsProcessed || 0) > 0,
      'rate limit not excessive': () => (lastMetrics.rateLimitHits || 0) < (lastMetrics.apiCalls || 1) * 0.5,
    });
  }
}
