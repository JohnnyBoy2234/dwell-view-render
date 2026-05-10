# apps/landlord — Landlord Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `apps/landlord` — a standalone Vite + Capacitor app for landlord users (Play Store "MzanziHomes Landlord"), with only landlord-facing routes and a role guard that redirects tenants to download the MzanziHomes tenant app.

**Architecture:** Mirror the apps/tenant pattern: copy root `src/` into `apps/landlord/src/`, remove tenant-only pages, write a fresh `App.tsx` with a landlord-only router and `LandlordRoleGuard`. Shared code resolves from `packages/*` via Vite path aliases identical to apps/tenant (both sit at the same `apps/*` depth so paths are the same).

**Tech Stack:** Vite 7, React 18, TypeScript 5.5, TailwindCSS 3, Capacitor 7, npm workspaces, Turborepo

---

### Task 1: Create apps/landlord config files

**Files:**
- Create: `apps/landlord/package.json`
- Create: `apps/landlord/vite.config.ts`
- Create: `apps/landlord/tsconfig.json`
- Create: `apps/landlord/tsconfig.app.json`
- Create: `apps/landlord/tsconfig.node.json`
- Create: `apps/landlord/index.html`
- Create: `apps/landlord/capacitor.config.ts`
- Create: `apps/landlord/tailwind.config.ts`
- Create: `apps/landlord/postcss.config.js`

- [ ] **Step 1: Create apps/landlord/package.json**

```json
{
  "name": "@mzanzihomes/landlord",
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
    "@mzanzihomes/common": "*",
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
    "@hookform/resolvers": "^3.9.0",
    "@react-pdf/renderer": "^4.3.1",
    "@supabase/supabase-js": "^2.55.0",
    "@tanstack/react-query": "^5.56.2",
    "@types/canvas-confetti": "^1.9.0",
    "canvas-confetti": "^1.9.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.2.0",
    "embla-carousel-react": "^8.3.0",
    "fabric": "^6.7.1",
    "framer-motion": "^12.23.12",
    "jspdf": "^4.0.0",
    "lucide-react": "^0.540.0",
    "next-themes": "^0.4.6",
    "pdf-lib": "^1.17.1",
    "qrcode.react": "^4.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-dropzone": "^14.3.8",
    "react-error-boundary": "^6.0.0",
    "react-hook-form": "^7.62.0",
    "react-resizable-panels": "^2.1.3",
    "react-router-dom": "^7.8.2",
    "recharts": "^2.12.7",
    "sonner": "^1.5.0",
    "swiper": "^11.2.10",
    "tailwind-merge": "^2.5.2",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.23.8"
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

Note: landlord app includes pdf/fabric deps (`@react-pdf/renderer`, `fabric`, `jspdf`, `pdf-lib`) for lease building and document generation.

- [ ] **Step 2: Create apps/landlord/vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname),
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
    port: 8082,
  },
});
```

- [ ] **Step 3: Create apps/landlord/tsconfig.json**

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

- [ ] **Step 4: Create apps/landlord/tsconfig.app.json**

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

- [ ] **Step 5: Create apps/landlord/tsconfig.node.json**

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

- [ ] **Step 6: Create apps/landlord/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>MzanziHomes Landlord</title>
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

- [ ] **Step 7: Create apps/landlord/capacitor.config.ts**

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mzanzihomes.landlord',
  appName: 'MzanziHomes Landlord',
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

- [ ] **Step 8: Create apps/landlord/tailwind.config.ts**

Copy verbatim from repo root:

```powershell
Copy-Item -Path "tailwind.config.ts" -Destination "apps/landlord/tailwind.config.ts"
```

- [ ] **Step 9: Create apps/landlord/postcss.config.js**

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
git add apps/landlord/
git commit -m "feat(landlord): scaffold apps/landlord config files"
```

---

### Task 2: Copy src/ contents to apps/landlord/src/

**Files:**
- Create: `apps/landlord/src/` (entire directory from root `src/`)

Same pattern as apps/tenant: copy the full root `src/` which includes all shims pointing to `@mzanzihomes/*` packages.

- [ ] **Step 1: Copy the full src/ directory**

```powershell
New-Item -ItemType Directory -Force -Path "apps/landlord"
Copy-Item -Path "src" -Destination "apps/landlord/src" -Recurse -Force
```

- [ ] **Step 2: Verify the copy succeeded**

```powershell
(Get-ChildItem -Recurse "apps/landlord/src").Count
```

Expected: several hundred files.

- [ ] **Step 3: Commit**

```bash
git add apps/landlord/src/
git commit -m "feat(landlord): copy root src into apps/landlord/src"
```

---

### Task 3: Remove non-landlord pages from apps/landlord/src/pages/

**Files:**
- Delete: `apps/landlord/src/pages/tenant/` (entire directory — all 9 tenant sub-pages)
- Delete: listed individual pages (see steps below)

- [ ] **Step 1: Remove tenant sub-pages directory**

```powershell
Remove-Item -Recurse -Force "apps/landlord/src/pages/tenant"
```

- [ ] **Step 2: Remove tenant-only page files**

```powershell
@(
  "EnhancedTenantDashboard.tsx",
  "TenantMessages.tsx",
  "ApplyInvite.tsx"
) | ForEach-Object { Remove-Item -Force "apps/landlord/src/pages/$_" -ErrorAction SilentlyContinue }
```

- [ ] **Step 3: Remove DocuSign pages**

```powershell
@(
  "DocuSignCallback.tsx",
  "DocuSignRedirect.tsx"
) | ForEach-Object { Remove-Item -Force "apps/landlord/src/pages/$_" -ErrorAction SilentlyContinue }
```

- [ ] **Step 4: Remove public marketing pages**

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
) | ForEach-Object { Remove-Item -Force "apps/landlord/src/pages/$_" -ErrorAction SilentlyContinue }
```

- [ ] **Step 5: Verify remaining pages**

```powershell
Get-ChildItem -Recurse "apps/landlord/src/pages" -Filter "*.tsx" | Select-Object -ExpandProperty Name | Sort-Object
```

Expected surviving pages:
```
AccountingDashboard.tsx        (accounting/)
AddTransactionPage.tsx         (accounting/)
ExpenseSummaryPage.tsx         (accounting/)
TaxInvoicePage.tsx             (accounting/)
TransactionsPage.tsx           (accounting/)
LandlordSupport.tsx            (landlord/)
AddProperty.tsx
AddPropertyUnlisted.tsx
ApplicationDetail.tsx
Applications.tsx
Auth.tsx
CreateInspection.tsx
EnhancedLandlordDashboard.tsx
InventoryStart.tsx
KycCapture.tsx
LandlordInspection.tsx
LandlordMaintenance.tsx
LeaseBuilder.tsx
LeaseDashboard.tsx
LeaseSignature.tsx
ListProperty.tsx
ListingTypePage.tsx
ListSale.tsx
MaintenanceTicketDetails.tsx
Messages.tsx
MobileCapture.tsx
NotFound.tsx
Notifications.tsx
PaymentFailed.tsx
PaymentSuccess.tsx
Properties.tsx
PropertyDetail.tsx
PropertyManagement.tsx
RentalApplication.tsx
ResetPassword.tsx
SaleListings.tsx
SettingsPage.tsx
VerifyId.tsx
```

- [ ] **Step 6: Commit**

```bash
git add -A apps/landlord/src/pages/
git commit -m "feat(landlord): remove tenant/marketing pages from landlord app"
```

---

### Task 4: Write apps/landlord/src/App.tsx and apps/landlord/src/main.tsx

**Files:**
- Create: `apps/landlord/src/App.tsx`
- Create: `apps/landlord/src/main.tsx`

The `LandlordRoleGuard` redirects a logged-in user who is NOT a landlord (and not admin) to "Download MzanziHomes" (the tenant app). Admins retain access so they can support landlords.

- [ ] **Step 1: Write apps/landlord/src/main.tsx**

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

- [ ] **Step 2: Write apps/landlord/src/App.tsx**

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
import { AuthenticatedRoute } from "@/components/AuthenticatedRoute";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { MobileNetworkStatus } from "@/components/mobile/MobileNetworkStatus";
import { AISupportChat } from "@/components/support/AISupportChat";
import { PaymentRedirectHandler } from "@/components/payments/PaymentRedirectHandler";
import { SidebarProvider } from "@/components/ui/sidebar";
import { EnhancedDashboardLayout } from "@/components/dashboard/EnhancedDashboardLayout";
import { EnhancedSidebar } from "@/components/dashboard/EnhancedSidebar";
import LandlordDashboardRoutes from "@/components/dashboard/LandlordDashboardRoutes";
import { PlanGuard } from "@/components/PlanGuard";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import Properties from "@/pages/Properties";
import PropertyDetail from "@/pages/PropertyDetail";
import PropertyManagement from "@/pages/PropertyManagement";
import EnhancedLandlordDashboard from "@/pages/EnhancedLandlordDashboard";
import LandlordInspection from "@/pages/LandlordInspection";
import LandlordMaintenance from "@/pages/LandlordMaintenance";
import { LeaseBuilder } from "@/pages/LeaseBuilder";
import { LeaseDashboard } from "@/pages/LeaseDashboard";
import { LeaseSignature } from "@/pages/LeaseSignature";
import ListProperty from "@/pages/ListProperty";
import ListSale from "@/pages/ListSale";
import AddProperty from "@/pages/AddProperty";
import AddPropertyUnlisted from "@/pages/AddPropertyUnlisted";
import ListingTypePage from "@/pages/ListingTypePage";
import SaleListings from "@/pages/SaleListings";
import Applications from "@/pages/Applications";
import ApplicationDetail from "@/pages/ApplicationDetail";
import RentalApplication from "@/pages/RentalApplication";
import Messages from "@/pages/Messages";
import Notifications from "@/pages/Notifications";
import SettingsPage from "@/pages/SettingsPage";
import KycCapture from "@/pages/KycCapture";
import VerifyId from "@/pages/VerifyId";
import MobileCapture from "@/pages/MobileCapture";
import InventoryStart from "@/pages/InventoryStart";
import CreateInspection from "@/pages/CreateInspection";
import MaintenanceTicketDetails from "@/pages/MaintenanceTicketDetails";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFailed from "@/pages/PaymentFailed";
import AccountingDashboard from "@/pages/accounting/AccountingDashboard";
import AddTransactionPage from "@/pages/accounting/AddTransactionPage";
import TransactionsPage from "@/pages/accounting/TransactionsPage";
import ExpenseSummaryPage from "@/pages/accounting/ExpenseSummaryPage";
import TaxInvoicePage from "@/pages/accounting/TaxInvoicePage";
import { LandlordSupport } from "@/pages/landlord/LandlordSupport";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

function DashboardShell({
  children,
  title,
  currentTab,
}: {
  children: React.ReactNode;
  title: string;
  currentTab: string;
}) {
  const navigate = useNavigate();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gradient-to-br from-ios-gray-light via-white to-ios-gray-light">
        <div className="hidden lg:flex lg:w-64 lg:flex-none">
          <EnhancedSidebar currentTab={currentTab} onTabChange={(tab) => navigate(tab)} />
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          <EnhancedDashboardLayout title={title} currentTab={currentTab} onTabChange={(tab) => navigate(tab)}>
            {children}
          </EnhancedDashboardLayout>
        </div>
      </div>
    </SidebarProvider>
  );
}

function LandlordRoleGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isLandlord, isAdmin, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user && !isLandlord && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-5xl mb-4">🏠</div>
          <h2 className="text-xl font-bold text-foreground">Wrong App</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This app is for landlords. Please download{" "}
            <strong>MzanziHomes</strong> to browse and rent properties.
          </p>
          <button
            onClick={() => window.open("https://play.google.com/store/apps/details?id=com.mzanzihomes.tenant", "_blank")}
            className="mt-4 w-full rounded-ios-button bg-primary py-3 px-6 text-sm font-semibold text-primary-foreground"
          >
            Get MzanziHomes
          </button>
          <button
            onClick={() => signOut()}
            className="w-full rounded-ios-button border border-border py-3 px-6 text-sm font-medium text-muted-foreground"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  useEffect(() => {
    // Mobile services init (push notifications, status bar, etc.)
    import("@/services/mobileServices").then(({ MobileServices }) => {
      MobileServices.initialize();
    });
  }, []);

  return (
    <>
      <PaymentRedirectHandler />
      <Routes>
        {/* Auth */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Property browsing & management */}
        <Route path="/" element={<EnhancedLandlordDashboard />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/manage-property/:id" element={<RouteGuard><PropertyManagement /></RouteGuard>} />
        <Route path="/sale-listings" element={<SaleListings />} />

        {/* Property listing flows */}
        <Route path="/listing-type" element={<ListingTypePage />} />
        <Route path="/add-property" element={<AuthenticatedRoute><ListProperty /></AuthenticatedRoute>} />
        <Route path="/add-property-unlisted" element={<AddPropertyUnlisted />} />
        <Route path="/list-property" element={<AuthenticatedRoute><ListProperty /></AuthenticatedRoute>} />
        <Route path="/list-rental" element={<AuthenticatedRoute><ListProperty /></AuthenticatedRoute>} />
        <Route path="/list-sale" element={<AuthenticatedRoute><ListSale /></AuthenticatedRoute>} />

        {/* Landlord dashboard */}
        <Route path="/enhancedlandlorddashboard/*" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="pro" featureName="Landlord Dashboard">
              <EnhancedLandlordDashboard />
            </PlanGuard>
          </AuthenticatedRoute>
        } />
        <Route path="/enhancedlandlorddashboard/inspection" element={
          <PlanGuard requiredPlan="pro" featureName="Property Inspections">
            <DashboardShell title="Property Inspection" currentTab="/enhancedlandlorddashboard/inspection">
              <LandlordInspection />
            </DashboardShell>
          </PlanGuard>
        } />
        <Route path="/enhancedlandlorddashboard/inspection/start" element={
          <PlanGuard requiredPlan="pro" featureName="Property Inspections">
            <DashboardShell title="Start Inspection" currentTab="/enhancedlandlorddashboard/inspection">
              <InventoryStart />
            </DashboardShell>
          </PlanGuard>
        } />
        <Route path="/enhancedlandlorddashboard/support" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="pro" featureName="Support">
              <DashboardShell title="Support" currentTab="/enhancedlandlorddashboard/support">
                <LandlordSupport />
              </DashboardShell>
            </PlanGuard>
          </AuthenticatedRoute>
        } />
        <Route path="/enhancedlandlorddashboard/add-property" element={<RouteGuard><ListProperty /></RouteGuard>} />
        <Route path="/landlord-dashboard/*" element={<LandlordDashboardRoutes />} />

        {/* Inspections */}
        <Route path="/inspections/new" element={
          <AuthenticatedRoute>
            <EnhancedDashboardLayout title="New Inspection">
              <CreateInspection />
            </EnhancedDashboardLayout>
          </AuthenticatedRoute>
        } />
        <Route path="/inventory/start" element={<InventoryStart />} />

        {/* Lease system */}
        <Route path="/leases" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="pro" featureName="Lease Management">
              <LeaseDashboard />
            </PlanGuard>
          </AuthenticatedRoute>
        } />
        <Route path="/lease/builder" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="pro" featureName="Lease Management">
              <LeaseBuilder />
            </PlanGuard>
          </AuthenticatedRoute>
        } />
        <Route path="/lease/builder/:contractId" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="pro" featureName="Lease Management">
              <LeaseBuilder />
            </PlanGuard>
          </AuthenticatedRoute>
        } />
        <Route path="/lease/builder/property/:propertyId" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="pro" featureName="Lease Management">
              <LeaseBuilder />
            </PlanGuard>
          </AuthenticatedRoute>
        } />
        <Route path="/lease/sign/:contractId" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="pro" featureName="Lease Management">
              <LeaseSignature />
            </PlanGuard>
          </AuthenticatedRoute>
        } />

        {/* Accounting */}
        <Route path="/dashboard/accounting" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="premium" featureName="SwiftBooks & Analytics">
              <AccountingDashboard />
            </PlanGuard>
          </AuthenticatedRoute>
        } />
        <Route path="/dashboard/accounting/new" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="premium" featureName="SwiftBooks & Analytics">
              <AddTransactionPage />
            </PlanGuard>
          </AuthenticatedRoute>
        } />
        <Route path="/dashboard/accounting/transactions" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="premium" featureName="SwiftBooks & Analytics">
              <TransactionsPage />
            </PlanGuard>
          </AuthenticatedRoute>
        } />
        <Route path="/dashboard/accounting/reports/expense-summary" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="premium" featureName="SwiftBooks & Analytics">
              <ExpenseSummaryPage />
            </PlanGuard>
          </AuthenticatedRoute>
        } />
        <Route path="/dashboard/invoices/tax" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="premium" featureName="SwiftBooks & Analytics">
              <TaxInvoicePage />
            </PlanGuard>
          </AuthenticatedRoute>
        } />

        {/* Maintenance */}
        <Route path="/maintenance/:ticketId" element={
          <RouteGuard>
            <PlanGuard requiredPlan="premium" featureName="Maintenance Management">
              <MaintenanceTicketDetails />
            </PlanGuard>
          </RouteGuard>
        } />

        {/* Applications */}
        <Route path="/applications" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="pro" featureName="Tenant Applications">
              <Applications />
            </PlanGuard>
          </AuthenticatedRoute>
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

        {/* Messages & notifications */}
        <Route path="/messages" element={
          <AuthenticatedRoute requireVerification={false}>
            <PlanGuard requiredPlan="pro" featureName="In-Platform Messaging">
              <Messages />
            </PlanGuard>
          </AuthenticatedRoute>
        } />
        <Route path="/notifications" element={<AuthenticatedRoute><Notifications /></AuthenticatedRoute>} />

        {/* Settings & identity */}
        <Route path="/settings" element={
          <RouteGuard>
            <EnhancedDashboardLayout title="Account Settings">
              <SettingsPage />
            </EnhancedDashboardLayout>
          </RouteGuard>
        } />
        <Route path="/verify-id" element={<RouteGuard><VerifyId /></RouteGuard>} />
        <Route path="/kyc/capture" element={<KycCapture />} />
        <Route path="/kyc/test" element={<KycCapture />} />
        <Route path="/mobile-capture" element={<MobileCapture />} />

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
                <LandlordRoleGuard>
                  <AppRoutes />
                </LandlordRoleGuard>
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

- [ ] **Step 3: Commit**

```bash
git add apps/landlord/src/App.tsx apps/landlord/src/main.tsx
git commit -m "feat(landlord): write landlord App.tsx with role guard and landlord-only routes"
```

---

### Task 5: Verify build succeeds

**Files:**
- No new files — verification task only.

- [ ] **Step 1: Run vite build from apps/landlord**

```powershell
Set-Location "apps/landlord"
npx vite build 2>&1
```

Expected: `✓ built in Xs` with `dist/index.html` produced.

- [ ] **Step 2: Fix any errors**

Same error categories as apps/tenant. The most likely issue: `LandlordDashboardRoutes` component importing a page that was deleted. Fix by removing those imports from the component file in `apps/landlord/src/`.

For each error:
- Read the file causing the error
- Remove or fix the broken import
- Re-run the build

- [ ] **Step 3: Verify dist/index.html exists**

```powershell
Test-Path "apps/landlord/dist/index.html"
```

Expected: `True`

- [ ] **Step 4: Commit fixes**

```bash
git add apps/landlord/
git commit -m "feat(landlord): fix apps/landlord build errors"
```

Skip if no fixes were needed.
