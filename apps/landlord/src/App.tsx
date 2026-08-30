import * as React from "react";
import { useEffect } from "react";
import { Toaster } from "@mzanzihomes/ui/components/toaster";
import { Toaster as Sonner } from "@mzanzihomes/ui/components/sonner";
import { TooltipProvider } from "@mzanzihomes/ui/components/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { RouteGuard } from "@mzanzihomes/ui/components/RouteGuard";
import { isNativeApp } from "@mzanzihomes/ui/utils/nativeBrowser";
import { AuthenticatedRoute } from "@mzanzihomes/ui/components/AuthenticatedRoute";
import { AuthBootstrap } from "@mzanzihomes/ui/components/AuthBootstrap";
import { ErrorBoundary } from "@mzanzihomes/ui/components/ErrorBoundary";
import { MobileBottomBar } from "@mzanzihomes/ui/components/MobileBottomBar";
import { MobileNetworkStatus } from "@mzanzihomes/ui/components/mobile/MobileNetworkStatus";
import { AISupportChat } from "@mzanzihomes/features/support";
import { BillingDueBanner } from "@mzanzihomes/features/billing";
import { PaymentRedirectHandler } from "@mzanzihomes/features/payments";
import { SidebarProvider } from "@mzanzihomes/ui/components/sidebar";
import { EnhancedDashboardLayout } from "@mzanzihomes/ui/components/dashboard/EnhancedDashboardLayout";
import { EnhancedSidebar } from "@mzanzihomes/ui/components/dashboard/EnhancedSidebar";
import { PlanGuard } from "@mzanzihomes/ui/components/PlanGuard";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import ResetPassword from "@mzanzihomes/ui/components/pages/ResetPassword";
import NotFound from "@mzanzihomes/ui/components/pages/NotFound";
import Properties from "@/pages/Properties";
import { PropertyDetail } from "@mzanzihomes/features/pages";
import EnhancedLandlordDashboard from "@/pages/EnhancedLandlordDashboard";
import LandlordMaintenance from "@/pages/LandlordMaintenance";
import { LeaseBuilder } from "@/pages/LeaseBuilder";
import { LeaseWizardPreview } from "@/pages/LeaseWizardPreview";
import { LeaseDashboard } from "@/pages/LeaseDashboard";
import { LeaseSignature } from '@mzanzihomes/features/pages';
import ListProperty from "@/pages/ListProperty";
import ListSale from "@/pages/ListSale";
import AddProperty from "@/pages/AddProperty";
import AddPropertyUnlisted from "@/pages/AddPropertyUnlisted";
import ListingTypePage from "@/pages/ListingTypePage";
import SaleListings from "@mzanzihomes/ui/components/pages/SaleListings";
import Applications from "@/pages/Applications";
import { ApplicationDetail } from '@mzanzihomes/features/pages';
import { RentalApplication } from '@mzanzihomes/features/pages';
import { Messages } from '@mzanzihomes/features/pages';
import Notifications from "@mzanzihomes/ui/components/pages/Notifications";
import { PrivacyPolicyScreen, TermsOfServiceScreen } from "@mzanzihomes/ui/components/pages/legal/LegalScreens";
import SettingsPage from "@mzanzihomes/ui/components/pages/SettingsPage";
import KycCapture from "@mzanzihomes/ui/components/pages/KycCapture";
import { VerifyId } from '@mzanzihomes/features/pages';
import { MobileCapture } from '@mzanzihomes/features/pages';
import { InventoryStart } from '@mzanzihomes/features/pages';
import { MaintenanceTicketDetails } from '@mzanzihomes/features/pages';
import PaymentSuccess from "@mzanzihomes/ui/components/pages/PaymentSuccess";
import PaymentFailed from "@mzanzihomes/ui/components/pages/PaymentFailed";
import PlanSuccess from "@/pages/PlanSuccess";
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
    // #root is the scroll container (see index.css), not the window.
    const root = document.getElementById('root');
    if (root) root.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

// Old dashboard base path, kept working for links already sent in emails/push notifications.
function LegacyLandlordDashboardRedirect() {
  const { pathname, search } = useLocation();
  const rest = pathname.slice('/enhancedlandlorddashboard'.length);
  return <Navigate to={`/landlord/dashboard${rest}${search}`} replace />;
}

function DashboardShell({
  children,
  title,
  subtitle,
  currentTab,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
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
          <EnhancedDashboardLayout title={title} subtitle={subtitle} currentTab={currentTab} onTabChange={(tab) => navigate(tab)}>
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
          {!isNativeApp() && (
            <button
              onClick={() => window.open("https://play.google.com/store/apps/details?id=com.mzanzihomes.tenant", "_blank")}
              className="mt-4 w-full rounded-ios-button bg-primary py-3 px-6 text-sm font-semibold text-primary-foreground"
            >
              Get MzanziHomes
            </button>
          )}
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
    import("@mzanzihomes/ui/services/mobileServices").then(({ MobileServices }) => {
      MobileServices.initialize({ bundleId: "com.mzanzihomes.landlord" });
    });
  }, []);

  return (
    <>
      <PaymentRedirectHandler />
      <Routes>
        {/* Auth */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Landlord root — no marketing page, straight into the dashboard */}
        <Route path="/" element={<Index />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/sale-listings" element={<SaleListings />} />

        {/* Property listing flows */}
        <Route path="/listing-type" element={<ListingTypePage />} />
        <Route path="/add-property" element={<AuthenticatedRoute><ListProperty /></AuthenticatedRoute>} />
        <Route path="/add-property-unlisted" element={<AddPropertyUnlisted />} />
        <Route path="/list-property" element={<AuthenticatedRoute><ListProperty /></AuthenticatedRoute>} />
        <Route path="/list-rental" element={<AuthenticatedRoute><ListProperty /></AuthenticatedRoute>} />
        <Route path="/list-sale" element={<AuthenticatedRoute><ListSale /></AuthenticatedRoute>} />

        {/* Landlord dashboard */}
        <Route path="/landlord/dashboard/*" element={
          <AuthenticatedRoute>
            <EnhancedLandlordDashboard />
          </AuthenticatedRoute>
        } />
        {/* Inspection List renders in-shell inside EnhancedLandlordDashboard's
            renderTabContent (like every other tool), so no special route here. */}
        <Route path="/landlord/dashboard/support" element={
          <AuthenticatedRoute>
            <DashboardShell title="Support" subtitle="Get help with your account and properties" currentTab="/landlord/dashboard/support">
              <LandlordSupport />
            </DashboardShell>
          </AuthenticatedRoute>
        } />
        <Route path="/landlord/dashboard/add-property" element={<RouteGuard><ListProperty /></RouteGuard>} />
        {/* Old base path, kept working for links already sent in emails/push notifications */}
        <Route path="/enhancedlandlorddashboard/*" element={<LegacyLandlordDashboardRedirect />} />

        {/* Inventory */}
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
        {/* New essentials-first Lease Wizard — parallel preview route */}
        <Route path="/lease/wizard" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="pro" featureName="Lease Management">
              <LeaseWizardPreview />
            </PlanGuard>
          </AuthenticatedRoute>
        } />
        <Route path="/lease/wizard/:contractId" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="pro" featureName="Lease Management">
              <LeaseWizardPreview />
            </PlanGuard>
          </AuthenticatedRoute>
        } />
        <Route path="/lease/wizard/property/:propertyId" element={
          <AuthenticatedRoute>
            <PlanGuard requiredPlan="pro" featureName="Lease Management">
              <LeaseWizardPreview />
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
              <EnhancedDashboardLayout title="Maintenance Ticket" subtitle="Request details and updates">
                <MaintenanceTicketDetails />
              </EnhancedDashboardLayout>
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

        {/* Legal */}
        <Route path="/privacy-policy" element={<PrivacyPolicyScreen />} />
        <Route path="/terms" element={<TermsOfServiceScreen />} />

        {/* Settings & identity */}
        <Route path="/settings" element={
          <RouteGuard>
            <EnhancedDashboardLayout title="Account Settings" subtitle="Security, notifications and account">
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
        <Route path="/plan-success" element={<PlanSuccess />} />

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
                <BillingDueBanner />
                <AISupportChat />
                <LandlordRoleGuard>
                  <AppRoutes />
                </LandlordRoleGuard>
              </ErrorBoundary>
            </BrowserRouter>
          </AuthBootstrap>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
