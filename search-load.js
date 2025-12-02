import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // ramp to 20 users
    { duration: '1m', target: 100 },   // ramp to 100 users
    { duration: '2m', target: 200 },   // hold at 200 users
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% of requests under 800ms
    http_req_failed: ['rate<0.01'],   // <1% failures
  },
};

// Use env var if set, else default
const BASE_URL = __ENV.BASE_URL || 'https://rentlekker.com/properties';


export default function () {
  // Adjust this path to your real search route
  const url = `${BASE_URL}/api/search?city=Cape%20Town`;

  const res = http.get(url);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
