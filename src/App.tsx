import * as React from "react";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RouteGuard } from "@/components/RouteGuard";
import { PropertiesRouteGuard } from "@/components/RoleGuard";
import { MiniNavbar } from "./components/ui/mini-navbar";
import { MobileBottomBar } from "./components/MobileBottomBar";
import { MobileServices } from "@/services/mobileServices";
import { MobileNetworkStatus } from "@/components/mobile/MobileNetworkStatus";
import { AISupportChat } from "@/components/support/AISupportChat";
import Index from "./pages/Index";
import Properties from "./pages/Properties";
import About from "./pages/About";
import AboutLandlord from "./pages/AboutLandlord";
import AboutTenant from "./pages/AboutTenant";
import AboutSeller from "./pages/AboutSeller";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Pricing from "./pages/Pricing";
import Auth from "./pages/Auth";
import ListProperty from "./pages/ListProperty";
import ListSale from "./pages/ListSale";
import SaleListings from "./pages/SaleListings";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyManagement from "./pages/PropertyManagement";
import Messages from "./pages/Messages";
import { EnhancedDashboardLayout } from "@/components/dashboard/EnhancedDashboardLayout";
import { EnhancedSidebar } from "@/components/dashboard/EnhancedSidebar";
import { AdminLayout } from "@/components/admin/AdminLayout";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminManagement from "./pages/admin/AdminManagement";
import AdminProperties from "./pages/admin/AdminProperties";
import PropertyReports from "./pages/admin/PropertyReports";
import DocumentReview from "./pages/admin/DocumentReview";
import UsersManagement from "./pages/admin/UsersManagement";
import ApplyInvite from "./pages/ApplyInvite";
import ApplicationDetail from "./pages/ApplicationDetail";
import RentalApplication from "./pages/RentalApplication";
import ResetPassword from "./pages/ResetPassword";
import TenantMessages from "./pages/TenantMessages";
import Notifications from "./pages/Notifications";
import EnhancedTenantDashboard from "@/pages/EnhancedTenantDashboard";
import EnhancedLandlordDashboard from "@/pages/EnhancedLandlordDashboard";
import LandlordInspection from "@/pages/LandlordInspection";
import Applications from "./pages/Applications";
import DocuSignCallback from "./pages/DocuSignCallback";
import DocuSignRedirect from "./pages/DocuSignRedirect";
import TenantDashboardRoutes from "@/components/dashboard/TenantDashboardRoutes";
import LandlordDashboardRoutes from "@/components/dashboard/LandlordDashboardRoutes";
import MaintenanceTicketDetails from "@/pages/MaintenanceTicketDetails";
import VerifyId from "@/pages/VerifyId";
import KycManagement from "@/pages/admin/KycManagement";
import { SupportMessagesAdmin } from "@/components/admin/SupportMessagesAdmin";
import MobileCapture from "@/pages/MobileCapture";
import KycCapture from "@/pages/KycCapture";
import InventoryStart from "@/pages/InventoryStart";
import { AuthenticatedRoute } from "@/components/AuthenticatedRoute";
import { VerificationGate } from "@/components/VerificationGate";
import { LeaseBuilder } from "@/pages/LeaseBuilder";
import { PlanGuard } from "@/components/PlanGuard";
import { LeaseSignature } from "@/pages/LeaseSignature";
import { LeaseDashboard } from "@/pages/LeaseDashboard";
import CreateInspection from "@/pages/CreateInspection";
import SettingsPage from "@/pages/SettingsPage";
import { LandlordSupport } from "@/pages/landlord/LandlordSupport";
// Accounting imports
import AccountingDashboard from "@/pages/accounting/AccountingDashboard";
import AddTransactionPage from "@/pages/accounting/AddTransactionPage";
import TransactionsPage from "@/pages/accounting/TransactionsPage";
import ExpenseSummaryPage from "@/pages/accounting/ExpenseSummaryPage";
import TaxInvoicePage from "@/pages/accounting/TaxInvoicePage";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import SafeRenting from "./pages/SafeRenting";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PaymentRedirectHandler } from "@/components/payments/PaymentRedirectHandler";
import { SidebarProvider } from "@/components/ui/sidebar";

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

  const handleTabChange = (tab: string) => {
    navigate(tab);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gradient-to-br from-ios-gray-light via-white to-ios-gray-light">
        <div className="hidden lg:flex lg:w-64 lg:flex-none">
          <EnhancedSidebar currentTab={currentTab} onTabChange={handleTabChange} />
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          <EnhancedDashboardLayout 
            title={title} 
            currentTab={currentTab} 
            onTabChange={handleTabChange}
          >
            {children}
          </EnhancedDashboardLayout>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppRoutes() {
  useEffect(() => {
    // Initialize mobile services when app starts
    MobileServices.initialize();
  }, []);

  return (
    <>
      <PaymentRedirectHandler />
      <Routes>
              {/* Admin Routes */}   
              <Route path="/admin" element={
                <RouteGuard>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </RouteGuard>
              } />
              <Route path="/admin/dashboard" element={
                <RouteGuard>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </RouteGuard>
              } />
              <Route path="/admin/management" element={
                <RouteGuard>
                  <AdminLayout>
                    <AdminManagement />
                  </AdminLayout>
                </RouteGuard>
              } />
              <Route path="/admin/users" element={
                <RouteGuard>
                  <AdminLayout>
                    <UsersManagement />
                  </AdminLayout>
                </RouteGuard>
              } />
              <Route path="/admin/admin-users" element={
                <RouteGuard>
                  <AdminLayout>
                    <AdminManagement />
                  </AdminLayout>
                </RouteGuard>
              } />
              <Route path="/admin/properties" element={
                <RouteGuard>
                  <AdminLayout>
                    <AdminProperties />
                  </AdminLayout>
                </RouteGuard>
              } />
              <Route path="/admin/documents" element={
                <RouteGuard>
                  <AdminLayout>
                    <DocumentReview />
                  </AdminLayout>
                </RouteGuard>
              } />
              <Route path="/admin/kyc" element={
                <RouteGuard>
                  <AdminLayout>
                    <KycManagement />
                  </AdminLayout>
                </RouteGuard>
              } />
              <Route path="/admin/reports" element={
                <RouteGuard>
                  <AdminLayout>
                    <PropertyReports />
                  </AdminLayout>
                </RouteGuard>
              } />
              <Route path="/admin/support" element={
                <RouteGuard>
                  <AdminLayout>
                    <SupportMessagesAdmin />
                  </AdminLayout>
                </RouteGuard>
              } />

              {/* Routes with Navbar */}
              <Route path="/" element={<Index />} />
              <Route path="/properties" element={<><MiniNavbar /><div className="pt-28 sm:pt-24"><Properties /></div></>} />
              <Route path="/sale-listings" element={<><MiniNavbar /><div className="pt-28 sm:pt-24"><SaleListings /></div></>} />
              <Route path="/about" element={<><MiniNavbar /><div className="pt-28 sm:pt-24"><About /></div></>} />
              <Route path="/about/landlord" element={<><MiniNavbar /><div className="pt-28 sm:pt-24"><AboutLandlord /></div></>} />
              <Route path="/about/tenant" element={<><MiniNavbar /><div className="pt-28 sm:pt-24"><AboutTenant /></div></>} />
              <Route path="/about/seller" element={<><MiniNavbar /><div className="pt-28 sm:pt-24"><AboutSeller /></div></>} />
              <Route path="/contact" element={<><MiniNavbar /><div className="pt-28 sm:pt-24"><Contact /></div></>} />
              <Route path="/blog" element={<><MiniNavbar /><div className="pt-28 sm:pt-24"><Blog /></div></>} />
              <Route path="/blog/:postId" element={<><MiniNavbar /><div className="pt-28 sm:pt-24"><BlogPost /></div></>} />
              <Route path="/safe-renting" element={<><MiniNavbar /><div className="pt-28 sm:pt-24"><SafeRenting /></div></>} />
              <Route path="/pricing" element={<><MiniNavbar /><div className="pt-28 sm:pt-24"><Pricing /></div></>} />

              {/* Routes without Navbar */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<DocuSignCallback />} />
              <Route path="/docusign-callback" element={<DocuSignCallback />} />
              <Route path="/docusign-redirect" element={<DocuSignRedirect />} />
              <Route path="/inventory/start" element={<InventoryStart />} />
              
              {/* Enhanced Dashboard Routes */}
              <Route path="/enhancedtenantdashboard" element={<EnhancedTenantDashboard />} />
              <Route path="/enhancedtenantdashboard/leases" element={<EnhancedTenantDashboard />} />
              <Route path="/tenant-dashboard/*" element={<TenantDashboardRoutes />} />
              <Route path="/tenant/*" element={<TenantDashboardRoutes />} />
              <Route path="/enhancedlandlorddashboard/*" element={
                <AuthenticatedRoute>
                  <PlanGuard requiredPlan="pro" featureName="Landlord Dashboard">
                    <EnhancedLandlordDashboard />
                  </PlanGuard>
                </AuthenticatedRoute>
              } />
              {/* Direct landlord inspection routes to bypass dashboard tab handling */}
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
              <Route path="/inspections/new" element={<AuthenticatedRoute><EnhancedDashboardLayout title="New Inspection"><CreateInspection /></EnhancedDashboardLayout></AuthenticatedRoute>} />
              {/* Standalone maintenance ticket route for cross-dashboard access */}
              <Route path="/maintenance/:ticketId" element={<RouteGuard><PlanGuard requiredPlan="premium" featureName="Maintenance Management"><MaintenanceTicketDetails /></PlanGuard></RouteGuard>} />
              <Route path="/enhancedlandlorddashboard/add-property" element={<RouteGuard><ListProperty /></RouteGuard>} />
              <Route path="/add-property" element={<AuthenticatedRoute><ListProperty /></AuthenticatedRoute>} />
              <Route path="/list-property" element={<AuthenticatedRoute><ListProperty /></AuthenticatedRoute>} />
              <Route path="/list-rental" element={<AuthenticatedRoute><ListProperty /></AuthenticatedRoute>} />
              <Route path="/list-sale" element={<AuthenticatedRoute><ListSale /></AuthenticatedRoute>} />
              <Route path="/property/:id" element={<PropertyDetail />} />
              <Route path="/manage-property/:id" element={<RouteGuard><PropertyManagement /></RouteGuard>} />
              
              {/* Lease System Routes */}
              <Route path="/leases" element={<AuthenticatedRoute><PlanGuard requiredPlan="pro" featureName="Lease Management"><LeaseDashboard /></PlanGuard></AuthenticatedRoute>} />
              <Route path="/lease/builder" element={<AuthenticatedRoute><PlanGuard requiredPlan="pro" featureName="Lease Management"><LeaseBuilder /></PlanGuard></AuthenticatedRoute>} />
              <Route path="/lease/builder/:contractId" element={<AuthenticatedRoute><PlanGuard requiredPlan="pro" featureName="Lease Management"><LeaseBuilder /></PlanGuard></AuthenticatedRoute>} />
              <Route path="/lease/builder/property/:propertyId" element={<AuthenticatedRoute><PlanGuard requiredPlan="pro" featureName="Lease Management"><LeaseBuilder /></PlanGuard></AuthenticatedRoute>} />
              <Route path="/lease/sign/:contractId" element={<AuthenticatedRoute><PlanGuard requiredPlan="pro" featureName="Lease Management"><LeaseSignature /></PlanGuard></AuthenticatedRoute>} />
              
              {/* Accounting Routes */}
              <Route path="/dashboard/accounting" element={<AuthenticatedRoute><PlanGuard requiredPlan="premium" featureName="SwiftBooks & Analytics"><AccountingDashboard /></PlanGuard></AuthenticatedRoute>} />
              <Route path="/dashboard/accounting/new" element={<AuthenticatedRoute><PlanGuard requiredPlan="premium" featureName="SwiftBooks & Analytics"><AddTransactionPage /></PlanGuard></AuthenticatedRoute>} />
              <Route path="/dashboard/accounting/transactions" element={<AuthenticatedRoute><PlanGuard requiredPlan="premium" featureName="SwiftBooks & Analytics"><TransactionsPage /></PlanGuard></AuthenticatedRoute>} />
              <Route path="/dashboard/accounting/reports/expense-summary" element={<AuthenticatedRoute><PlanGuard requiredPlan="premium" featureName="SwiftBooks & Analytics"><ExpenseSummaryPage /></PlanGuard></AuthenticatedRoute>} />
              <Route path="/dashboard/invoices/tax" element={<AuthenticatedRoute><PlanGuard requiredPlan="premium" featureName="SwiftBooks & Analytics"><TaxInvoicePage /></PlanGuard></AuthenticatedRoute>} />
              
              <Route path="/messages" element={<AuthenticatedRoute requireVerification={false}><PlanGuard requiredPlan="pro" featureName="In-Platform Messaging"><VerificationGate requireVerification={true}><Messages /></VerificationGate></PlanGuard></AuthenticatedRoute>} />
              <Route path="/notifications" element={<AuthenticatedRoute><Notifications /></AuthenticatedRoute>} />
              <Route path="/applications" element={<AuthenticatedRoute><PlanGuard requiredPlan="pro" featureName="Tenant Applications"><Applications /></PlanGuard></AuthenticatedRoute>} />
              <Route path="/apply/invite/:token" element={<RouteGuard><PlanGuard requiredPlan="pro" featureName="Tenant Applications"><ApplyInvite /></PlanGuard></RouteGuard>} />
              <Route path="/application/:id" element={<RouteGuard><PlanGuard requiredPlan="pro" featureName="Tenant Applications"><ApplicationDetail /></PlanGuard></RouteGuard>} />
              <Route path="/rental-application/:propertyId" element={<RouteGuard><PlanGuard requiredPlan="pro" featureName="Tenant Applications"><RentalApplication /></PlanGuard></RouteGuard>} />
              <Route path="/tenant/messages" element={<RouteGuard><TenantMessages /></RouteGuard>} />
              <Route path="/verify-id" element={<RouteGuard><VerifyId /></RouteGuard>} />
              <Route path="/mobile-capture" element={<MobileCapture />} />
              <Route path="/kyc/capture" element={<KycCapture />} />
              {/* Test route for development */}
              <Route path="/kyc/test" element={<KycCapture />} />
              <Route path="/apply/:id" element={<PropertyDetail />} />
              <Route path="/payment-success" element={<RouteGuard><PaymentSuccess /></RouteGuard>} />
              <Route path="/payment-failed" element={<RouteGuard><PaymentFailed /></RouteGuard>} />
              <Route path="/settings" element={<RouteGuard><EnhancedDashboardLayout title="Account Settings"><SettingsPage /></EnhancedDashboardLayout></RouteGuard>} />
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
              <AppRoutes />
              <MobileBottomBar />
              </ErrorBoundary>
            </BrowserRouter>
          </AuthBootstrap>
        </AuthProvider>
      </TooltipProvider>
      <Analytics />
    </QueryClientProvider>
  );
};

export default App;
