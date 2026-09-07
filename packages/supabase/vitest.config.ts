import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // useAuth is a React hook that reads window/localStorage/sessionStorage.
    // A concrete (non-opaque) origin is required or jsdom won't expose window APIs.
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
    setupFiles: ['./src/test/setup.ts'],
  },
});
