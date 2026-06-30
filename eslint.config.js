import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Monorepo dependency lattice, lint-enforced. Honest invariants only (the
// aspirational "ui must not import supabase" was superseded — ui kernel shell
// widgets legitimately call supabase kernel hooks). What we lock:
//   1. feature-slice isolation: no kernel package imports @mzanzihomes/features
//      (the payoff of all 12 slices — apps + features itself may import it).
//   2. package purity: packages must never use the `@/` app alias (it only
//      resolves via a consuming app's vite alias — a hidden leak).
//   3. common stays below ui/features.
// Known debt carrying eslint-disable: 2 `@/` leaks in packages/ui pending the
// services-tier + search-slice phases.
const noFeatures = {
  group: ["@mzanzihomes/features", "@mzanzihomes/features/**"],
  message: "Kernel packages must not import feature slices (lattice: features ← apps only).",
};
const noAppAlias = {
  group: ["@/*", "@/**"],
  message: "Packages must not use the `@/` app alias — import from @mzanzihomes/* or a relative path.",
};
const noUi = {
  group: ["@mzanzihomes/ui", "@mzanzihomes/ui/**"],
  message: "common is the base layer — it must not import ui.",
};
const restrict = (...patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

export default tseslint.config(
  { ignores: ["**/dist/**", "src/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["apps/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Packages: TS parser only (no tseslint recommended rules — they carry
  // pre-existing debt unrelated to boundaries) + the lattice rules below.
  // react-hooks plugin registered so the code's inline disable directives
  // resolve, but its rules stay off to keep this gate boundary-focused.
  {
    extends: [tseslint.configs.base],
    files: ["packages/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    linterOptions: { reportUnusedDisableDirectives: false },
  },
  // Lattice boundaries (packages only; apps may import anything).
  { files: ["packages/common/**/*.{ts,tsx}"], rules: restrict(noUi, noFeatures, noAppAlias) },
  { files: ["packages/ui/**/*.{ts,tsx}"], rules: restrict(noFeatures, noAppAlias) },
  { files: ["packages/supabase/**/*.{ts,tsx}"], rules: restrict(noFeatures, noAppAlias) },
  { files: ["packages/features/**/*.{ts,tsx}"], rules: restrict(noAppAlias) },
);
