import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

process.env.ESBUILD_BINARY_PATH = path.resolve('./node_modules/esbuild/bin/esbuild');

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@mzanzihomes/ui": path.resolve(__dirname, "./packages/ui/src"),
      "@mzanzihomes/supabase": path.resolve(__dirname, "./packages/supabase/src"),
      "@mzanzihomes/common": path.resolve(__dirname, "./packages/common/src"),
    },
  },
}));
