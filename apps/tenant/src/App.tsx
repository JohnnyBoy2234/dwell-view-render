import * as React from "react";
import { useEffect } from "react";
import { Toaster } from "@mzanzihomes/ui/components/toaster";
import { Toaster as Sonner } from "@mzanzihomes/ui/components/sonner";
import { TooltipProvider } from "@mzanzihomes/ui/components/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { RouteGuard } from "@/components/RouteGuard";
import { MiniNavbar } from "@/components/ui/mini-navbar";
import Index from "@/pages/Index";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { MobileServices } from "@/services/mobileServices";
import { MobileNetworkStatus } from "@/components/mobile/MobileNetworkStatus";
import { AISupportChat } from "@/components/support/AISupportChat";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import { AuthenticatedRoute } from "@/components/AuthenticatedRoute";
import { VerificationGate } from "@/components/VerificationGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PaymentRedirectHandler } from "@/components/payments/PaymentRedirectHandler";
import { SidebarProvider } from "@mzanzihomes/ui/components/sidebar";
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
import CreateInspection from "@/pages/CreateInspection";
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
  const { user, loading, isLandlord, isAdmin, signOut } = useAuth();

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
    MobileServices.initialize();
  }, []);

  return (
    <>
      <PaymentRedirectHandler />
      <Routes>
        {/* Public browsing */}
        <Route path="/" element={<Index />} />
        <Route path="/properties" element={<><MiniNavbar hideLandlordActions /><div className="pt-28 sm:pt-24"><Properties /></div></>} />
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

        {/* Inventory & inspections */}
        <Route path="/inventory/start" element={<InventoryStart />} />
        <Route path="/inspections/new" element={
          <AuthenticatedRoute>
            <EnhancedDashboardLayout title="New Inspection">
              <CreateInspection />
            </EnhancedDashboardLayout>
          </AuthenticatedRoute>
        } />

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
