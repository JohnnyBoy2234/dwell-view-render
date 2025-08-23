import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

process.env.ESBUILD_BINARY_PATH = path.resolve('./node_modules/esbuild/bin/esbuild')


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
