/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    server: {
      deps: {
        inline: [],
      },
    },
    alias: {
      // Mock the unbuilt canvas native module on Windows
      canvas: '/c/Users/Jonathan D Theron/dwell-view-render/src/test/__mocks__/canvas.ts',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/main.tsx',
        '**/vite-env.d.ts',
      ],
    },
  },
});
