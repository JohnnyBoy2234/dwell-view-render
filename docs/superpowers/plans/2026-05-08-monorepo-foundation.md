# Monorepo Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Turborepo monorepo workspace and extract shared code into `packages/ui`, `packages/supabase`, and `packages/common` so that the existing app still builds from root with all imports resolved through the new packages.

**Architecture:** The repo root becomes the monorepo workspace root. Shared code moves into `packages/`. The current app stays at root and resolves packages via Vite path aliases — it is not yet moved to `apps/` (that happens in Plans 2–4). This plan is non-destructive: the app continues to build throughout.

**Tech Stack:** Turborepo 2.x, npm workspaces, Vite 7, TypeScript 5.5, React 18

---

## File Map

### Modified
- `package.json` — rename, add workspaces, add turbo devDep, remove spurious `root:` entry
- `vite.config.ts` — add `@mzanzihomes/*` path aliases
- `tsconfig.json` — add `@mzanzihomes/*` path mappings

### Created
- `turbo.json`
- `packages/ui/package.json`
- `packages/ui/tsconfig.json`
- `packages/ui/tailwind.config.ts` (copied from root)
- `packages/ui/src/index.ts`
- `packages/supabase/package.json`
- `packages/supabase/tsconfig.json`
- `packages/supabase/src/index.ts`
- `packages/common/package.json`
- `packages/common/tsconfig.json`
- `packages/common/src/index.ts`

### Moved (source → destination)
| Source | Destination |
|---|---|
| `src/components/ui/*` | `packages/ui/src/components/` |
| `src/components/common/*` | `packages/ui/src/common/` |
| `src/styles/` | `packages/ui/src/styles/` |
| `src/integrations/supabase/client.ts` | `packages/supabase/src/client.ts` |
| `src/integrations/supabase/types.ts` | `packages/supabase/src/types.ts` |
| `src/hooks/useAuth.tsx` | `packages/supabase/src/hooks/useAuth.tsx` |
| `src/hooks/useMessaging.tsx` | `packages/supabase/src/hooks/useMessaging.tsx` |
| `src/hooks/useRealtime.tsx` | `packages/supabase/src/hooks/useRealtime.tsx` |
| `src/hooks/useNotifications.tsx` | `packages/supabase/src/hooks/useNotifications.tsx` |
| `src/hooks/useLandlordNotifications.tsx` | `packages/supabase/src/hooks/useLandlordNotifications.tsx` |
| `src/lib/` | `packages/common/src/lib/` |
| `src/constants/` | `packages/common/src/constants/` |
| `src/types/` | `packages/common/src/types/` |
| `src/data/` | `packages/common/src/data/` |

After each move, the original path gets a re-export shim so existing imports in `src/` still resolve during migration. Shims are removed at the end of Plan 4 when the app is fully split.

---

## Task 1: Update root `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Apply changes to `package.json`**

Replace the entire file with:

```json
{
  "name": "mzanzihomes",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "supabase": "supabase",
    "build:all": "turbo build"
  },
  "dependencies": {
    "@capacitor/android": "^7.4.2",
    "@capacitor/camera": "^7.0.2",
    "@capacitor/cli": "^7.4.2",
    "@capacitor/core": "^7.4.2",
    "@capacitor/geolocation": "^7.1.5",
    "@capacitor/haptics": "^7.0.2",
    "@capacitor/ios": "^7.4.2",
    "@capacitor/keyboard": "^7.0.3",
    "@capacitor/network": "^7.0.2",
    "@capacitor/push-notifications": "^7.0.3",
    "@capacitor/splash-screen": "^7.0.3",
    "@capacitor/status-bar": "^7.0.3",
    "@googlemaps/js-api-loader": "^1.16.10",
    "@hookform/resolvers": "^3.9.0",
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-alert-dialog": "^1.1.1",
    "@radix-ui/react-aspect-ratio": "^1.1.7",
    "@radix-ui/react-avatar": "^1.1.0",
    "@radix-ui/react-checkbox": "^1.1.1",
    "@radix-ui/react-collapsible": "^1.1.0",
    "@radix-ui/react-context-menu": "^2.2.1",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-hover-card": "^1.1.1",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-menubar": "^1.1.1",
    "@radix-ui/react-navigation-menu": "^1.2.0",
    "@radix-ui/react-popover": "^1.1.1",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-radio-group": "^1.2.0",
    "@radix-ui/react-scroll-area": "^1.1.0",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slider": "^1.2.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.1",
    "@radix-ui/react-toggle": "^1.1.0",
    "@radix-ui/react-toggle-group": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.4",
    "@react-pdf/renderer": "^4.3.1",
    "@supabase/supabase-js": "^2.55.0",
    "@tanstack/react-query": "^5.56.2",
    "@testing-library/react": "^16.3.0",
    "@types/canvas-confetti": "^1.9.0",
    "@vercel/analytics": "^1.5.0",
    "@vercel/speed-insights": "^1.3.1",
    "canvas-confetti": "^1.9.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.0",
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.2.0",
    "embla-carousel-react": "^8.3.0",
    "fabric": "^6.7.1",
    "fabricjs-react": "^2.1.0",
    "framer-motion": "^12.23.12",
    "hono": "^4.3.9",
    "input-otp": "^1.2.4",
    "jspdf": "^4.0.0",
    "lucide-react": "^0.540.0",
    "motion": "^12.38.0",
    "next-themes": "^0.4.6",
    "openai": "^6.3.0",
    "pdf-lib": "^1.17.1",
    "qrcode.react": "^4.2.0",
    "radix-ui": "^1.4.3",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-dropzone": "^14.3.8",
    "react-error-boundary": "^6.0.0",
    "react-helmet": "^6.1.0",
    "react-hook-form": "^7.62.0",
    "react-pdf": "^10.0.1",
    "react-qr-code": "^2.0.18",
    "react-resizable-panels": "^2.1.3",
    "react-router-dom": "^7.8.2",
    "recharts": "^2.12.7",
    "sonner": "^1.5.0",
    "swiper": "^11.2.10",
    "tailwind-merge": "^2.5.2",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^0.9.3",
    "vitest": "^4.0.15",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@eslint/js": "^9.9.0",
    "@playwright/test": "^1.57.0",
    "@tailwindcss/typography": "^0.5.15",
    "@types/node": "^22.5.5",
    "@types/react": "^18.3.24",
    "@types/react-dom": "18",
    "@vitejs/plugin-react": "5",
    "@vitejs/plugin-react-swc": "^4.0.1",
    "autoprefixer": "^10.4.20",
    "esbuild": "^0.25.9",
    "eslint": "^9.9.0",
    "eslint-plugin-react-hooks": "^5.1.0-rc.0",
    "eslint-plugin-react-refresh": "^0.4.9",
    "globals": "^15.9.0",
    "lovable-tagger": "^1.1.7",
    "postcss": "^8.4.47",
    "supabase": "^2.53.6",
    "tailwindcss": "^3.4.11",
    "turbo": "^2.3.3",
    "typescript": "^5.5.3",
    "typescript-eslint": "^8.0.1",
    "vite": "^7.1.5",
    "vite-tsconfig-paths": "^6.1.1"
  },
  "overrides": {
    "lovable-tagger": {
      "vite": "$vite"
    }
  }
}
```

Key changes from original: renamed to `mzanzihomes`, added `"workspaces"`, added `"turbo"` to devDependencies, added `"build:all"` script, removed the spurious `"root": "tanstack/react-query"` line.

- [ ] **Step 2: Run install to register workspaces**

```bash
npm install
```

Expected: Installs successfully, `node_modules/.package-lock.json` updated. No errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: rename to mzanzihomes, add npm workspaces + turbo"
```

---

## Task 2: Create `turbo.json`

**Files:**
- Create: `turbo.json`

- [ ] **Step 1: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

`"dependsOn": ["^build"]` means "build my dependencies before building me" — packages build before apps.

- [ ] **Step 2: Verify turbo is available**

```bash
npx turbo --version
```

Expected: prints a version like `2.3.3`.

- [ ] **Step 3: Commit**

```bash
git add turbo.json
git commit -m "chore: add turbo.json pipeline config"
```

---

## Task 3: Scaffold `packages/ui`

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`

- [ ] **Step 1: Create `packages/ui/package.json`**

```json
{
  "name": "@mzanzihomes/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./components/*": "./src/components/*.tsx",
    "./common/*": "./src/common/*.tsx",
    "./styles": "./src/styles/index.css"
  }
}
```

The `./components/*` and `./common/*` sub-path exports are required because shims in `src/components/ui/` import from `@mzanzihomes/ui/components/<name>`. Without these entries, Node.js module resolution (used in Plans 2–4 when apps are in `apps/`) would fail. Vite's alias resolution handles it during Plan 1, but set it up correctly now.

- [ ] **Step 2: Create `packages/ui/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Commit scaffold**

```bash
git add packages/ui/
git commit -m "chore: scaffold packages/ui"
```

---

## Task 4: Move shadcn components to `packages/ui`

**Files:**
- Move: `src/components/ui/*` → `packages/ui/src/components/`
- Move: `src/components/common/*` → `packages/ui/src/common/`
- Create shims at original paths

- [ ] **Step 1: Copy components to packages/ui**

```bash
cp -r src/components/ui packages/ui/src/components
cp -r src/components/common packages/ui/src/common
```

On Windows PowerShell:
```powershell
Copy-Item -Recurse src\components\ui packages\ui\src\components
Copy-Item -Recurse src\components\common packages\ui\src\common
```

- [ ] **Step 2: Create `packages/ui/src/index.ts` barrel export**

```typescript
// packages/ui/src/index.ts
// shadcn components
export * from './components/accordion';
export * from './components/alert';
export * from './components/alert-dialog';
export * from './components/avatar';
export * from './components/badge';
export * from './components/button';
export * from './components/calendar';
export * from './components/card';
export * from './components/carousel';
export * from './components/checkbox';
export * from './components/collapsible';
export * from './components/command';
export * from './components/context-menu';
export * from './components/dialog';
export * from './components/drawer';
export * from './components/dropdown-menu';
export * from './components/form';
export * from './components/hover-card';
export * from './components/input';
export * from './components/input-otp';
export * from './components/label';
export * from './components/menubar';
export * from './components/navigation-menu';
export * from './components/pagination';
export * from './components/popover';
export * from './components/progress';
export * from './components/radio-group';
export * from './components/resizable';
export * from './components/scroll-area';
export * from './components/select';
export * from './components/separator';
export * from './components/sheet';
export * from './components/sidebar';
export * from './components/skeleton';
export * from './components/slider';
export * from './components/sonner';
export * from './components/switch';
export * from './components/table';
export * from './components/tabs';
export * from './components/textarea';
export * from './components/toast';
export * from './components/toaster';
export * from './components/toggle';
export * from './components/toggle-group';
export * from './components/tooltip';
export * from './components/use-toast';
// common layout components
export * from './common/Loading';
export * from './common/ErrorBoundary';
```

Adjust the component list to match the actual files inside `src/components/ui/` — run `ls src/components/ui/` to see the full list before writing this file.

- [ ] **Step 3: Keep originals as re-export shims**

Replace `src/components/ui/button.tsx` (and all other ui components) with a shim so existing imports still work. Do this for every file in `src/components/ui/`:

```typescript
// src/components/ui/button.tsx  ← shim
export * from '@mzanzihomes/ui/components/button';
```

Since there are many files, use this PowerShell one-liner to generate shims for all ui components:

```powershell
Get-ChildItem src\components\ui -Filter "*.tsx" | ForEach-Object {
  $name = $_.BaseName
  Set-Content $_.FullName "export * from '@mzanzihomes/ui/components/$name';"
}
```

Do the same for `src/components/common/`:

```powershell
Get-ChildItem src\components\common -Filter "*.tsx" | ForEach-Object {
  $name = $_.BaseName
  Set-Content $_.FullName "export * from '@mzanzihomes/ui/common/$name';"
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/ src/components/ui/ src/components/common/
git commit -m "chore: move ui components to packages/ui, add shims"
```

---

## Task 5: Move styles to `packages/ui`

**Files:**
- Move: `src/styles/` → `packages/ui/src/styles/`
- Copy: `tailwind.config.ts` → `packages/ui/tailwind.config.ts`

- [ ] **Step 1: Copy styles**

```powershell
Copy-Item -Recurse src\styles packages\ui\src\styles
```

- [ ] **Step 2: Copy tailwind config to packages/ui**

```powershell
Copy-Item tailwind.config.ts packages\ui\tailwind.config.ts
```

The root `tailwind.config.ts` stays in place so the current Vite build continues to work. In Plans 2–4, each app will import `packages/ui/tailwind.config.ts` directly.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/styles/ packages/ui/tailwind.config.ts
git commit -m "chore: copy styles and tailwind config to packages/ui"
```

---

## Task 6: Scaffold `packages/supabase`

**Files:**
- Create: `packages/supabase/package.json`
- Create: `packages/supabase/tsconfig.json`

- [ ] **Step 1: Create `packages/supabase/package.json`**

```json
{
  "name": "@mzanzihomes/supabase",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

- [ ] **Step 2: Create `packages/supabase/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Commit scaffold**

```bash
git add packages/supabase/
git commit -m "chore: scaffold packages/supabase"
```

---

## Task 7: Move Supabase client + types

**Files:**
- Move: `src/integrations/supabase/client.ts` → `packages/supabase/src/client.ts`
- Move: `src/integrations/supabase/types.ts` → `packages/supabase/src/types.ts`
- Create shims at original paths

- [ ] **Step 1: Create the packages/supabase/src directory and copy files**

```powershell
New-Item -ItemType Directory -Path packages\supabase\src -Force
Copy-Item src\integrations\supabase\client.ts packages\supabase\src\client.ts
Copy-Item src\integrations\supabase\types.ts packages\supabase\src\types.ts
```

- [ ] **Step 2: Replace originals with shims**

`src/integrations/supabase/client.ts`:
```typescript
export * from '@mzanzihomes/supabase/client';
export { default } from '@mzanzihomes/supabase/client';
```

`src/integrations/supabase/types.ts`:
```typescript
export * from '@mzanzihomes/supabase/types';
```

Update `packages/supabase/package.json` to add sub-path exports for these:

```json
{
  "name": "@mzanzihomes/supabase",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./client": "./src/client.ts",
    "./types": "./src/types.ts"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/supabase/src/ src/integrations/supabase/ packages/supabase/package.json
git commit -m "chore: move Supabase client and types to packages/supabase"
```

---

## Task 8: Move shared hooks to `packages/supabase`

**Files:**
- Move: 5 hooks from `src/hooks/` → `packages/supabase/src/hooks/`
- Create shims at original paths
- Create: `packages/supabase/src/index.ts`

- [ ] **Step 1: Copy hooks**

```powershell
New-Item -ItemType Directory -Path packages\supabase\src\hooks -Force
Copy-Item src\hooks\useAuth.tsx packages\supabase\src\hooks\useAuth.tsx
Copy-Item src\hooks\useMessaging.tsx packages\supabase\src\hooks\useMessaging.tsx
Copy-Item src\hooks\useRealtime.tsx packages\supabase\src\hooks\useRealtime.tsx
Copy-Item src\hooks\useNotifications.tsx packages\supabase\src\hooks\useNotifications.tsx
Copy-Item src\hooks\useLandlordNotifications.tsx packages\supabase\src\hooks\useLandlordNotifications.tsx
```

- [ ] **Step 2: Update imports inside each copied hook**

Each hook likely imports from `@/integrations/supabase/client` and `@/integrations/supabase/types`. Open each file in `packages/supabase/src/hooks/` and replace those imports:

```typescript
// Before (in each hook):
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// After:
import { supabase } from '../client';
import type { Database } from '../types';
```

Run this find to check what imports need updating:
```bash
grep -r "@/integrations/supabase" packages/supabase/src/hooks/
```

Fix each occurrence by replacing `@/integrations/supabase/client` → `../client` and `@/integrations/supabase/types` → `../types`.

- [ ] **Step 3: Replace originals with shims**

```powershell
@("useAuth", "useMessaging", "useRealtime", "useNotifications", "useLandlordNotifications") | ForEach-Object {
  Set-Content "src\hooks\$_.tsx" "export * from '@mzanzihomes/supabase/hooks/$_';"
}
```

Update `packages/supabase/package.json` to add hooks sub-path:

```json
{
  "name": "@mzanzihomes/supabase",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./client": "./src/client.ts",
    "./types": "./src/types.ts",
    "./hooks/*": "./src/hooks/*.tsx"
  }
}
```

- [ ] **Step 4: Create `packages/supabase/src/index.ts` barrel**

```typescript
// packages/supabase/src/index.ts
export * from './client';
export * from './hooks/useAuth';
export * from './hooks/useMessaging';
export * from './hooks/useRealtime';
export * from './hooks/useNotifications';
export * from './hooks/useLandlordNotifications';
// Types are large — export them explicitly to avoid re-exporting the entire 80KB types file
export type { Database } from './types';
```

- [ ] **Step 5: Commit**

```bash
git add packages/supabase/ src/hooks/
git commit -m "chore: move shared hooks to packages/supabase"
```

---

## Task 9: Scaffold `packages/common`

**Files:**
- Create: `packages/common/package.json`
- Create: `packages/common/tsconfig.json`

- [ ] **Step 1: Create `packages/common/package.json`**

```json
{
  "name": "@mzanzihomes/common",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./lib/*": "./src/lib/*.ts",
    "./types/*": "./src/types/*.ts",
    "./constants/*": "./src/constants/*.ts"
  }
}
```

- [ ] **Step 2: Create `packages/common/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Commit scaffold**

```bash
git add packages/common/
git commit -m "chore: scaffold packages/common"
```

---

## Task 10: Move utils, constants, types, data to `packages/common`

**Files:**
- Move: `src/lib/` → `packages/common/src/lib/`
- Move: `src/constants/` → `packages/common/src/constants/`
- Move: `src/types/` → `packages/common/src/types/`
- Move: `src/data/` → `packages/common/src/data/`
- Create shims at original paths

- [ ] **Step 1: Copy directories**

```powershell
Copy-Item -Recurse src\lib packages\common\src\lib
Copy-Item -Recurse src\constants packages\common\src\constants
Copy-Item -Recurse src\types packages\common\src\types
Copy-Item -Recurse src\data packages\common\src\data
```

- [ ] **Step 2: Check for internal imports that need updating**

```bash
grep -r "from '@/integrations" packages/common/src/
grep -r "from '@/hooks" packages/common/src/
```

If any `@/integrations/supabase` imports appear in `packages/common/src/`, update them to use `@mzanzihomes/supabase` (since common can depend on supabase). If any appear in `src/lib/supabase-helpers.ts`, update that file in `packages/common/src/lib/supabase-helpers.ts`:

```typescript
// Before
import { supabase } from '@/integrations/supabase/client';
// After
import { supabase } from '@mzanzihomes/supabase/client';
```

- [ ] **Step 3: Replace originals with shims**

```powershell
# lib shims
Get-ChildItem src\lib -Filter "*.ts" | ForEach-Object {
  $name = $_.BaseName
  Set-Content $_.FullName "export * from '@mzanzihomes/common/lib/$name';"
}

# types shims
Get-ChildItem src\types -Filter "*.ts" | ForEach-Object {
  $name = $_.BaseName
  Set-Content $_.FullName "export * from '@mzanzihomes/common/types/$name';"
}

# constants shims
Get-ChildItem src\constants -Filter "*.ts" | ForEach-Object {
  $name = $_.BaseName
  Set-Content $_.FullName "export * from '@mzanzihomes/common/constants/$name';"
}
```

- [ ] **Step 4: Create `packages/common/src/index.ts` barrel**

```typescript
// packages/common/src/index.ts
// Lib utils
export * from './lib/download';
export * from './lib/uuid';
export * from './lib/supabase-helpers';

// Types — re-export all shared interfaces
export * from './types/index';

// Constants
export * from './constants/index';
```

Adjust to match the actual files inside each directory. Run `ls src/lib`, `ls src/types`, `ls src/constants` to see the full lists.

- [ ] **Step 5: Commit**

```bash
git add packages/common/ src/lib/ src/constants/ src/types/ src/data/
git commit -m "chore: move lib, constants, types, data to packages/common"
```

---

## Task 11: Add `@mzanzihomes/*` aliases to Vite + TypeScript

**Files:**
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`

This is what allows `import { Button } from '@mzanzihomes/ui'` to resolve to `packages/ui/src/index.ts` during the Vite build. Without this, Vite won't know where to find the packages.

- [ ] **Step 1: Update `vite.config.ts`**

```typescript
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
```

- [ ] **Step 2: Update `tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@mzanzihomes/ui": ["./packages/ui/src/index.ts"],
      "@mzanzihomes/ui/*": ["./packages/ui/src/*"],
      "@mzanzihomes/supabase": ["./packages/supabase/src/index.ts"],
      "@mzanzihomes/supabase/*": ["./packages/supabase/src/*"],
      "@mzanzihomes/common": ["./packages/common/src/index.ts"],
      "@mzanzihomes/common/*": ["./packages/common/src/*"]
    },
    "noImplicitAny": false,
    "noUnusedParameters": false,
    "skipLibCheck": true,
    "allowJs": true,
    "noUnusedLocals": false,
    "strictNullChecks": false
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts tsconfig.json
git commit -m "chore: add @mzanzihomes/* path aliases to vite and tsconfig"
```

---

## Task 12: Verify the build

- [ ] **Step 1: Run the dev server and check for import errors**

```bash
npm run dev
```

Expected: Dev server starts on port 8080. Open http://localhost:8080 and verify the app loads without blank screen or console errors.

If you see import errors like `Cannot find module '@mzanzihomes/ui/components/button'`:
1. Check that the shim files were written correctly (they should export from `@mzanzihomes/ui/...`)
2. Check that `packages/ui/package.json` `exports` has the matching sub-path
3. Check that `vite.config.ts` alias for `@mzanzihomes/ui` points to `./packages/ui/src`

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: Build completes without errors. `dist/` folder is produced.

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: All tests pass (or same pass/fail ratio as before this plan — we haven't changed logic).

- [ ] **Step 4: Verify the shims in src/ still resolve correctly**

Pick a few files that import from the original paths and confirm they still work:
```bash
grep -r "from '@/components/ui/button'" src/ | head -5
grep -r "from '@/integrations/supabase/client'" src/ | head -5
grep -r "from '@/lib/" src/ | head -5
```

These imports still work because the shims re-export from the packages.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore(monorepo): plan 1 complete — packages extracted, app builds from root"
```

---

## Verification Checklist

- [ ] `npm run build` succeeds with no errors
- [ ] `npm run dev` starts and app loads correctly in browser
- [ ] `npm run test` passes
- [ ] `ls packages/` shows `ui/`, `supabase/`, `common/` each with `package.json`, `tsconfig.json`, `src/`
- [ ] `ls packages/ui/src/components/` shows shadcn component files
- [ ] `ls packages/supabase/src/hooks/` shows 5 hook files
- [ ] `ls packages/common/src/lib/` shows utility files
- [ ] `grep -r "from '@/components/ui" src/` only shows shim files (one-liners)
- [ ] Capacitor build works: `npm run build && npx cap sync`

---

## What's Next

**Plan 2:** Create `apps/tenant` — copy tenant pages, set up Capacitor config with `appId: com.mzanzihomes.tenant`  
**Plan 3:** Create `apps/landlord` — copy landlord pages, set up Capacitor config with `appId: com.mzanzihomes.landlord`  
**Plan 4:** Create `apps/web` — new lightweight app for `mzanzihomes.com`  
**Plan 5:** Create `apps/admin` + cleanup (DocuSign removal, Paystack → CallPay)
