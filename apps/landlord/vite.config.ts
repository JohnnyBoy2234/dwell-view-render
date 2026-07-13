import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname),
  // Env files (.env) live at the monorepo root, not per-app
  envDir: path.resolve(__dirname, "../.."),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@mzanzihomes/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@mzanzihomes/supabase": path.resolve(__dirname, "../../packages/supabase/src"),
      "@mzanzihomes/common": path.resolve(__dirname, "../../packages/common/src"),
      "@mzanzihomes/features": path.resolve(__dirname, "../../packages/features/src"),
    },
  },
  server: {
    host: "::",
    port: 8082,
  },
});
