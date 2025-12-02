import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  duration: '10s',
};

const AUTH_URL = 'https://rsfrvjaqxhoqavvscvwf.supabase.co/auth/v1/token?grant_type=password';

export default function () {
  const payload = JSON.stringify({
    email: 'jttrading34@gmail.com',      
    password: 'Koopies008@',            
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZnJ2amFxeGhvcWF2dnNjdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDIzOTYsImV4cCI6MjA2OTg3ODM5Nn0.3yeCVbJs6twyx62wYh9BxCUoqpqiMt-174JmdRyhJig',
    },
  };

  const res = http.post(AUTH_URL, payload, params);

  console.log('Status:', res.status);
  console.log('Body:', res.body);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
