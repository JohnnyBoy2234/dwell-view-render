import * as React from "react";
import { useEffect } from "react";
import { Toaster } from "@mzanzihomes/ui/components/toaster";
import { Toaster as Sonner } from "@mzanzihomes/ui/components/sonner";
import { TooltipProvider } from "@mzanzihomes/ui/components/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { RouteGuard } from "@mzanzihomes/ui/components/RouteGuard";
import { MiniNavbar } from "@/components/ui/mini-navbar";
import Index from "@/pages/Index";
import { MobileBottomBar } from "@mzanzihomes/ui/components/MobileBottomBar";
import { MobileServices } from "@mzanzihomes/ui/services/mobileServices";
import { MobileNetworkStatus } from "@mzanzihomes/ui/components/mobile/MobileNetworkStatus";
import { AISupportChat } from "@mzanzihomes/features/support";
import { AuthBootstrap } from "@mzanzihomes/ui/components/AuthBootstrap";
import { AuthenticatedRoute } from "@mzanzihomes/ui/components/AuthenticatedRoute";
import { VerificationGate } from "@mzanzihomes/ui/components/VerificationGate";
import { ErrorBoundary } from "@mzanzihomes/ui/components/ErrorBoundary";
import { PaymentRedirectHandler } from "@mzanzihomes/features/payments";
import { RentDueBanner } from "@mzanzihomes/features/billing";
import { SidebarProvider } from "@mzanzihomes/ui/components/sidebar";
import { EnhancedDashboardLayout } from "@mzanzihomes/ui/components/dashboard/EnhancedDashboardLayout";
import TenantDashboardRoutes from "@/components/dashboard/TenantDashboardRoutes";
import Properties from "@/pages/Properties";
import { PropertyDetail } from "@mzanzihomes/features/pages";
import Auth from "@/pages/Auth";
import JoinProperty from "@/pages/JoinProperty";
import ApplyInvite from "@/pages/ApplyInvite";
import ResetPassword from "@mzanzihomes/ui/components/pages/ResetPassword";
import EnhancedTenantDashboard from "@/pages/EnhancedTenantDashboard";
import TenantMessages from "@/pages/TenantMessages";
import DocumentViewer from "@/pages/DocumentViewer";
import Notifications from "@mzanzihomes/ui/components/pages/Notifications";
import { PrivacyPolicyScreen, TermsOfServiceScreen } from "@mzanzihomes/ui/components/pages/legal/LegalScreens";
import { ApplicationDetail } from '@mzanzihomes/features/pages';
import { RentalApplication } from '@mzanzihomes/features/pages';
import { LeaseSignature } from '@mzanzihomes/features/pages';
import KycCapture from "@mzanzihomes/ui/components/pages/KycCapture";
import { VerifyId } from '@mzanzihomes/features/pages';
import PaymentSuccess from "@mzanzihomes/ui/components/pages/PaymentSuccess";
import PaymentFailed from "@mzanzihomes/ui/components/pages/PaymentFailed";
import { Messages } from '@mzanzihomes/features/pages';
import { MobileCapture } from '@mzanzihomes/features/pages';
import { MaintenanceTicketDetails } from '@mzanzihomes/features/pages';
import SettingsPage from "@mzanzihomes/ui/components/pages/SettingsPage";
import NotFound from "@mzanzihomes/ui/components/pages/NotFound";

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
        <Route path="/properties" element={<><MiniNavbar hideLandlordActions minimal /><div className="pt-28 sm:pt-24"><Properties /></div></>} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/apply/invite/:token" element={<ApplyInvite />} />
        <Route path="/apply/:id" element={<PropertyDetail />} />
        <Route path="/join/:token" element={<JoinProperty />} />

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
            <LeaseSignature />
          </AuthenticatedRoute>
        } />

        {/* Applications */}
        <Route path="/application/:id" element={
          <RouteGuard>
            <ApplicationDetail />
          </RouteGuard>
        } />
        <Route path="/rental-application/:propertyId" element={
          <RouteGuard>
            <RentalApplication />
          </RouteGuard>
        } />

        {/* Messages */}
        <Route path="/tenant/messages" element={<RouteGuard><TenantMessages /></RouteGuard>} />
        <Route path="/messages" element={
          <AuthenticatedRoute requireVerification={false}>
            <VerificationGate requireVerification={true}>
              <Messages />
            </VerificationGate>
          </AuthenticatedRoute>
        } />

        {/* Notifications & settings */}
        <Route path="/notifications" element={<AuthenticatedRoute><Notifications /></AuthenticatedRoute>} />
        <Route path="/document" element={<AuthenticatedRoute><DocumentViewer /></AuthenticatedRoute>} />
        <Route path="/settings" element={
          <RouteGuard>
            <EnhancedDashboardLayout title="Account Settings" subtitle="Security, notifications and account">
              <SettingsPage />
            </EnhancedDashboardLayout>
          </RouteGuard>
        } />

        {/* Legal */}
        <Route path="/privacy-policy" element={<PrivacyPolicyScreen />} />
        <Route path="/terms" element={<TermsOfServiceScreen />} />

        {/* KYC & identity */}
        <Route path="/verify-id" element={<RouteGuard><VerifyId /></RouteGuard>} />
        <Route path="/kyc/capture" element={<KycCapture />} />
        <Route path="/kyc/test" element={<KycCapture />} />
        <Route path="/mobile-capture" element={<MobileCapture />} />

        {/* Maintenance ticket detail */}
        <Route path="/maintenance/:ticketId" element={
          <RouteGuard>
            <EnhancedDashboardLayout title="Maintenance Ticket" subtitle="Request details and updates">
              <MaintenanceTicketDetails />
            </EnhancedDashboardLayout>
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
                <RentDueBanner />
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
