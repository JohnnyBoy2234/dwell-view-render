# apps/tenant — Tenant Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `apps/tenant` — a standalone Vite + Capacitor app for tenant users (Play Store "MzanziHomes"), with only tenant-facing routes and a role guard that redirects landlords to download the Landlord app.

**Architecture:** Copy the root `src/` tree into `apps/tenant/src/` so all existing components, hooks, services, and shims are available. Remove landlord/admin/marketing pages, then write a fresh `App.tsx` with a tenant-only router and role guard. Shared code resolves from `packages/*` via Vite path aliases (identical pattern to the root config, adjusted for the `apps/tenant` relative path). The existing `src/components/ui/` shims and `src/hooks/useAuth.tsx` shim are preserved by the copy, so they keep working as-is.

**Tech Stack:** Vite 7, React 18, TypeScript 5.5, TailwindCSS 3, Capacitor 7, npm workspaces, Turborepo

---

### Task 1: Create apps/tenant config files

**Files:**
- Create: `apps/tenant/package.json`
- Create: `apps/tenant/vite.config.ts`
- Create: `apps/tenant/tsconfig.json`
- Create: `apps/tenant/tsconfig.app.json`
- Create: `apps/tenant/tsconfig.node.json`
- Create: `apps/tenant/index.html`
- Create: `apps/tenant/capacitor.config.ts`
- Create: `apps/tenant/tailwind.config.ts`
- Create: `apps/tenant/postcss.config.js`

- [ ] **Step 1: Create apps/tenant/package.json**

```json
{
  "name": "@mzanzihomes/tenant",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "@mzanzihomes/ui": "*",
    "@mzanzihomes/supabase": "*",
    "@mzanzihomes/common": "*"
  },
  "devDependencies": {
    "@types/node": "^22.5.5",
    "@types/react": "^18.3.24",
    "@types/react-dom": "18",
    "@vitejs/plugin-react-swc": "^4.0.1",
    "autoprefixer": "^10.4.20",
    "esbuild": "^0.25.9",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.11",
    "typescript": "^5.5.3",
    "typescript-eslint": "^8.0.1",
    "vite": "^7.1.5",
    "vite-tsconfig-paths": "^6.1.1",
    "vitest": "^4.0.15"
  }
}
```

- [ ] **Step 2: Create apps/tenant/vite.config.ts**

The `@/` alias points to `./src` (apps/tenant/src). The `@mzanzihomes/*` aliases point two levels up to the packages.

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@mzanzihomes/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@mzanzihomes/supabase": path.resolve(__dirname, "../../packages/supabase/src"),
      "@mzanzihomes/common": path.resolve(__dirname, "../../packages/common/src"),
    },
  },
  server: {
    host: "::",
    port: 8081,
  },
});
```

- [ ] **Step 3: Create apps/tenant/tsconfig.json**

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
      "@mzanzihomes/ui": ["../../packages/ui/src/index.ts"],
      "@mzanzihomes/ui/*": ["../../packages/ui/src/*"],
      "@mzanzihomes/supabase": ["../../packages/supabase/src/index.ts"],
      "@mzanzihomes/supabase/*": ["../../packages/supabase/src/*"],
      "@mzanzihomes/common": ["../../packages/common/src/index.ts"],
      "@mzanzihomes/common/*": ["../../packages/common/src/*"]
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

- [ ] **Step 4: Create apps/tenant/tsconfig.app.json**

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
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitAny": false,
    "noFallthroughCasesInSwitch": false,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@mzanzihomes/ui": ["../../packages/ui/src/index.ts"],
      "@mzanzihomes/ui/*": ["../../packages/ui/src/*"],
      "@mzanzihomes/supabase": ["../../packages/supabase/src/index.ts"],
      "@mzanzihomes/supabase/*": ["../../packages/supabase/src/*"],
      "@mzanzihomes/common": ["../../packages/common/src/index.ts"],
      "@mzanzihomes/common/*": ["../../packages/common/src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create apps/tenant/tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Create apps/tenant/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>MzanziHomes</title>
    <style>
      :root {
        --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
    </style>
    <meta name="theme-color" content="#2563eb" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="shortcut icon" href="/logo2.png">
    <link rel="icon" type="image/png" href="/logo2.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/logo2.png">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create apps/tenant/capacitor.config.ts**

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mzanzihomes.tenant',
  appName: 'MzanziHomes',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT_CONTENT",
      backgroundColor: "#1E40AF",
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Camera: {
      permissions: {
        camera: "Camera access is required to take photos of properties and documents.",
        photos: "Photo library access is required to select images."
      }
    },
    Geolocation: {
      permissions: {
        location: "Location access is required to find properties near you."
      }
    }
  }
};

export default config;
```

- [ ] **Step 8: Create apps/tenant/tailwind.config.ts**

Copy the root `tailwind.config.ts` verbatim into `apps/tenant/tailwind.config.ts`. The content of `tailwind.config.ts` at the repo root (with all design tokens: ocean-blue colors, ios-* colors, ios-* shadows, keyframes, animations, etc.) must be reproduced exactly.

```bash
# PowerShell command to copy:
Copy-Item -Path "tailwind.config.ts" -Destination "apps/tenant/tailwind.config.ts"
```

- [ ] **Step 9: Create apps/tenant/postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 10: Commit config scaffold**

```bash
git add apps/tenant/
git commit -m "feat(tenant): scaffold apps/tenant config files"
```

---

### Task 2: Copy src/ contents to apps/tenant/src/

**Files:**
- Create: `apps/tenant/src/` (entire directory from root `src/`)

The root `src/` already has shims in place:
- `src/components/ui/*.tsx` → shims to `@mzanzihomes/ui/components/*`
- `src/hooks/useAuth.tsx` → shim to `@mzanzihomes/supabase/hooks/useAuth`
- `src/integrations/supabase/client.ts` → shim to `@mzanzihomes/supabase/client`

Copying `src/` preserves all these shims, so `apps/tenant/src/` already has the right package references without further changes.

- [ ] **Step 1: Copy the full src/ directory**

```powershell
# Run from repo root (C:\Users\Jonathan D Theron\dwell-view-render)
New-Item -ItemType Directory -Force -Path "apps/tenant"
Copy-Item -Path "src" -Destination "apps/tenant/src" -Recurse -Force
```

- [ ] **Step 2: Verify the copy succeeded**

```powershell
(Get-ChildItem -Recurse "apps/tenant/src").Count
```

Expected: several hundred files. The command should complete without errors.

- [ ] **Step 3: Commit the copied source**

```bash
git add apps/tenant/src/
git commit -m "feat(tenant): copy root src into apps/tenant/src"
```

---

### Task 3: Remove non-tenant pages from apps/tenant/src/pages/

**Files:**
- Delete: `apps/tenant/src/pages/admin/` (entire directory)
- Delete: `apps/tenant/src/pages/accounting/` (entire directory)
- Delete: `apps/tenant/src/pages/landlord/` (entire directory)
- Delete: listed individual pages (see steps below)

These pages are landlord-only, admin-only, or public marketing pages that don't belong in the tenant mobile app. Removing them reduces bundle size and clarifies the app's scope. The tenant app's new `App.tsx` (Task 4) won't route to any of these, so removing them ensures they never accidentally make it into the bundle.

- [ ] **Step 1: Remove entire subdirectories**

```powershell
Remove-Item -Recurse -Force "apps/tenant/src/pages/admin"
Remove-Item -Recurse -Force "apps/tenant/src/pages/accounting"
Remove-Item -Recurse -Force "apps/tenant/src/pages/landlord"
```

- [ ] **Step 2: Remove landlord-specific page files**

```powershell
@(
  "EnhancedLandlordDashboard.tsx",
  "LandlordInspection.tsx",
  "LandlordMaintenance.tsx",
  "LeaseBuilder.tsx",
  "LeaseDashboard.tsx",
  "ListProperty.tsx",
  "ListSale.tsx",
  "AddProperty.tsx",
  "AddPropertyUnlisted.tsx",
  "ListingTypePage.tsx",
  "PropertyManagement.tsx",
  "Applications.tsx",
  "SaleListings.tsx"
) | ForEach-Object { Remove-Item -Force "apps/tenant/src/pages/$_" -ErrorAction SilentlyContinue }
```

- [ ] **Step 3: Remove DocuSign pages**

```powershell
@(
  "DocuSignCallback.tsx",
  "DocuSignRedirect.tsx"
) | ForEach-Object { Remove-Item -Force "apps/tenant/src/pages/$_" -ErrorAction SilentlyContinue }
```

- [ ] **Step 4: Remove public marketing pages**

These belong in `apps/web`, not in the mobile tenant app.

```powershell
@(
  "About.tsx",
  "AboutLandlord.tsx",
  "AboutTenant.tsx",
  "AboutSeller.tsx",
  "Blog.tsx",
  "BlogPost.tsx",
  "Contact.tsx",
  "Index.tsx",
  "Pricing.tsx",
  "SafeRenting.tsx",
  "PrivacyPolicy.tsx",
  "TermsOfService.tsx",
  "MobileTest.tsx",
  "JoinPage.tsx"
) | ForEach-Object { Remove-Item -Force "apps/tenant/src/pages/$_" -ErrorAction SilentlyContinue }
```

- [ ] **Step 5: Verify remaining pages**

```powershell
Get-ChildItem -Recurse "apps/tenant/src/pages" -Filter "*.tsx" | Select-Object -ExpandProperty Name | Sort-Object
```

Expected surviving pages (roughly):
```
ApplicationDetail.tsx
ApplyInvite.tsx
Auth.tsx
EnhancedTenantDashboard.tsx
InventoryStart.tsx
KycCapture.tsx
LeaseSignature.tsx
MaintenanceTicketDetails.tsx
Messages.tsx
MobileCapture.tsx
NotFound.tsx
Notifications.tsx
PaymentFailed.tsx
PaymentSuccess.tsx
Properties.tsx
PropertyDetail.tsx
RentalApplication.tsx
ResetPassword.tsx
SettingsPage.tsx
TenantMessages.tsx
VerifyId.tsx
tenant/TenantInspection.tsx
tenant/TenantInventory.tsx
tenant/TenantLeaseDocuments.tsx
tenant/TenantMaintenance.tsx
tenant/TenantMaintenanceResponses.tsx
tenant/TenantPayments.tsx
tenant/TenantProofOfPayment.tsx
tenant/TenantPropertyViewings.tsx
tenant/TenantSupport.tsx
```

- [ ] **Step 6: Commit the deleted pages**

```bash
git add -A apps/tenant/src/pages/
git commit -m "feat(tenant): remove landlord/admin/marketing pages from tenant app"
```

---

### Task 4: Write apps/tenant/src/App.tsx and apps/tenant/src/main.tsx

**Files:**
- Create: `apps/tenant/src/App.tsx`
- Create: `apps/tenant/src/main.tsx`

The new `App.tsx` wraps the entire app in the same provider stack as the root (QueryClient, TooltipProvider, AuthProvider, etc.) and adds a `TenantRoleGuard` component. The guard reads `isLandlord` and `isAdmin` from `useAuth` — if either is true for a logged-in user, it shows a "wrong app" screen instead of the routes. The tenant routes are a trimmed version of the root's `AppRoutes`.

Note: `@vercel/analytics` is removed — the tenant app is Capacitor-only, not deployed to Vercel.

- [ ] **Step 1: Write apps/tenant/src/main.tsx**

```typescript
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 2: Write apps/tenant/src/App.tsx**

```typescript
import * as React from "react";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { RouteGuard } from "@/components/RouteGuard";
import { MiniNavbar } from "@/components/ui/mini-navbar";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { MobileServices } from "@/services/mobileServices";
import { MobileNetworkStatus } from "@/components/mobile/MobileNetworkStatus";
import { AISupportChat } from "@/components/support/AISupportChat";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import { AuthenticatedRoute } from "@/components/AuthenticatedRoute";
import { VerificationGate } from "@/components/VerificationGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PaymentRedirectHandler } from "@/components/payments/PaymentRedirectHandler";
import { SidebarProvider } from "@/components/ui/sidebar";
import { EnhancedDashboardLayout } from "@/components/dashboard/EnhancedDashboardLayout";
import TenantDashboardRoutes from "@/components/dashboard/TenantDashboardRoutes";
import { PlanGuard } from "@/components/PlanGuard";
import Properties from "@/pages/Properties";
import PropertyDetail from "@/pages/PropertyDetail";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import EnhancedTenantDashboard from "@/pages/EnhancedTenantDashboard";
import TenantMessages from "@/pages/TenantMessages";
import Notifications from "@/pages/Notifications";
import ApplyInvite from "@/pages/ApplyInvite";
import ApplicationDetail from "@/pages/ApplicationDetail";
import RentalApplication from "@/pages/RentalApplication";
import { LeaseSignature } from "@/pages/LeaseSignature";
import KycCapture from "@/pages/KycCapture";
import VerifyId from "@/pages/VerifyId";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFailed from "@/pages/PaymentFailed";
import Messages from "@/pages/Messages";
import MobileCapture from "@/pages/MobileCapture";
import InventoryStart from "@/pages/InventoryStart";
import MaintenanceTicketDetails from "@/pages/MaintenanceTicketDetails";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

function TenantRoleGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isLandlord, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user && (isLandlord || isAdmin)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-5xl mb-4">🏠</div>
          <h2 className="text-xl font-bold text-foreground">Wrong App</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This app is for tenants. Please download{" "}
            <strong>MzanziHomes Landlord</strong> to manage your properties.
          </p>
          <button
            onClick={() => window.open("https://play.google.com/store/apps/details?id=com.mzanzihomes.landlord", "_blank")}
            className="mt-4 w-full rounded-ios-button bg-primary py-3 px-6 text-sm font-semibold text-primary-foreground"
          >
            Get MzanziHomes Landlord
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  useEffect(() => {
    MobileServices.initialize();
  }, []);

  return (
    <>
      <PaymentRedirectHandler />
      <Routes>
        {/* Public browsing */}
        <Route path="/" element={<><MiniNavbar /><div className="pt-28 sm:pt-24"><Properties /></div></>} />
        <Route path="/properties" element={<><MiniNavbar /><div className="pt-28 sm:pt-24"><Properties /></div></>} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/apply/:id" element={<PropertyDetail />} />

        {/* Auth */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Tenant dashboard */}
        <Route path="/enhancedtenantdashboard" element={<EnhancedTenantDashboard />} />
        <Route path="/enhancedtenantdashboard/leases" element={<EnhancedTenantDashboard />} />
        <Route path="/tenant-dashboard/*" element={<TenantDashboardRoutes />} />
        <Route path="/tenant/*" element={<TenantDashboardRoutes />} />

        {/* Lease signing — tenant side only */}
        <Route path="/lease/sign/:contractId" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="pro" featureName="Lease Management">
              <LeaseSignature />
            </PlanGuard>
          </AuthenticatedRoute>
        } />

        {/* Applications */}
        <Route path="/apply/invite/:token" element={
          <RouteGuard>
            <PlanGuard requiredPlan="pro" featureName="Tenant Applications">
              <ApplyInvite />
            </PlanGuard>
          </RouteGuard>
        } />
        <Route path="/application/:id" element={
          <RouteGuard>
            <PlanGuard requiredPlan="pro" featureName="Tenant Applications">
              <ApplicationDetail />
            </PlanGuard>
          </RouteGuard>
        } />
        <Route path="/rental-application/:propertyId" element={
          <RouteGuard>
            <PlanGuard requiredPlan="pro" featureName="Tenant Applications">
              <RentalApplication />
            </PlanGuard>
          </RouteGuard>
        } />

        {/* Messages */}
        <Route path="/tenant/messages" element={<RouteGuard><TenantMessages /></RouteGuard>} />
        <Route path="/messages" element={
          <AuthenticatedRoute requireVerification={false}>
            <PlanGuard requiredPlan="pro" featureName="In-Platform Messaging">
              <VerificationGate requireVerification={true}>
                <Messages />
              </VerificationGate>
            </PlanGuard>
          </AuthenticatedRoute>
        } />

        {/* Notifications & settings */}
        <Route path="/notifications" element={<AuthenticatedRoute><Notifications /></AuthenticatedRoute>} />
        <Route path="/settings" element={
          <RouteGuard>
            <EnhancedDashboardLayout title="Account Settings">
              <SettingsPage />
            </EnhancedDashboardLayout>
          </RouteGuard>
        } />

        {/* KYC & identity */}
        <Route path="/verify-id" element={<RouteGuard><VerifyId /></RouteGuard>} />
        <Route path="/kyc/capture" element={<KycCapture />} />
        <Route path="/kyc/test" element={<KycCapture />} />
        <Route path="/mobile-capture" element={<MobileCapture />} />

        {/* Inventory */}
        <Route path="/inventory/start" element={<InventoryStart />} />

        {/* Maintenance ticket detail */}
        <Route path="/maintenance/:ticketId" element={
          <RouteGuard>
            <PlanGuard requiredPlan="premium" featureName="Maintenance Management">
              <MaintenanceTicketDetails />
            </PlanGuard>
          </RouteGuard>
        } />

        {/* Payments */}
        <Route path="/payment-success" element={<RouteGuard><PaymentSuccess /></RouteGuard>} />
        <Route path="/payment-failed" element={<RouteGuard><PaymentFailed /></RouteGuard>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <AuthBootstrap>
            <BrowserRouter>
              <ScrollToTop />
              <ErrorBoundary>
                <MobileNetworkStatus />
                <AISupportChat />
                <TenantRoleGuard>
                  <AppRoutes />
                </TenantRoleGuard>
                <MobileBottomBar />
              </ErrorBoundary>
            </BrowserRouter>
          </AuthBootstrap>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
```

- [ ] **Step 3: Commit App.tsx and main.tsx**

```bash
git add apps/tenant/src/App.tsx apps/tenant/src/main.tsx
git commit -m "feat(tenant): write tenant App.tsx with role guard and tenant-only routes"
```

---

### Task 5: Verify build succeeds

**Files:**
- No new files — this task verifies the work from tasks 1–4.

The goal is a clean `vite build` in `apps/tenant`. Since apps/tenant imports from `../../packages/*/src` via Vite aliases, and the packages are already built and working (from Plan 1), the build should succeed without additional changes.

- [ ] **Step 1: Install dependencies (ensure workspace packages are linked)**

Run from the repo root so npm workspaces links `@mzanzihomes/*` packages:

```powershell
# From repo root:
npm install
```

- [ ] **Step 2: Run build in apps/tenant**

```powershell
# From repo root:
Set-Location "apps/tenant"
npx vite build
```

Expected output: `✓ built in Xs` with no TypeScript errors.

- [ ] **Step 3: If build fails — fix TypeScript errors**

If there are TypeScript/import errors, they are likely one of:

a) A page in `apps/tenant/src/pages/` imports a removed page (e.g., imports from `@/pages/EnhancedLandlordDashboard`). Fix by removing the import.

b) A component imports from `@/pages/DocuSignCallback` or similar removed page. Fix by removing the import.

c) A service or hook in the copied `src/` tree still uses the old root-relative imports for packages that have been moved but not shimmed. Fix by updating the import to use the `@mzanzihomes/*` path.

For each error: read the file, find the broken import, fix it, re-run the build.

- [ ] **Step 4: Verify dist/ was produced**

```powershell
Test-Path "apps/tenant/dist/index.html"
```

Expected: `True`

- [ ] **Step 5: Commit any build fixes and the final state**

```bash
git add apps/tenant/
git commit -m "feat(tenant): verify and fix apps/tenant build"
```
