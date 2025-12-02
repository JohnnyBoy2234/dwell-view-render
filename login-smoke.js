import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  duration: '5s',
};

const BASE_URL = __ENV.BASE_URL || 'https://rentlekker.com';

export default function () {
  const res = http.get(`${BASE_URL}/auth`);

  console.log('Status:', res.status);

  check(res, {
    'status is 200/301/302': (r) =>
      r.status === 200 || r.status === 301 || r.status === 302,
  });
}
