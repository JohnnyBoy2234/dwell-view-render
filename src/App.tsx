import * as React from "react";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RouteGuard } from "@/components/RouteGuard";
import { PropertiesRouteGuard } from "@/components/RoleGuard";
import Navbar from "./components/Navbar";
import { MobileBottomBar } from "./components/MobileBottomBar";
import { MobileServices } from "@/services/mobileServices";
import { MobileNetworkStatus } from "@/components/mobile/MobileNetworkStatus";
import { AISupportChat } from "@/components/support/AISupportChat";
import Index from "./pages/Index";
import Properties from "./pages/Properties";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Pricing from "./pages/Pricing";
import Auth from "./pages/Auth";
import ListProperty from "./pages/ListProperty";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyManagement from "./pages/PropertyManagement";
import Messages from "./pages/Messages";
import { EnhancedDashboardLayout } from "@/components/dashboard/EnhancedDashboardLayout";
import { UsersManagement } from "./pages/admin/UsersManagement";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./pages/PaymentSuccess";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminManagement from "./pages/admin/AdminManagement";
import AdminProperties from "./pages/admin/AdminProperties";
import PropertyReports from "./pages/admin/PropertyReports";
import DocumentReview from "./pages/admin/DocumentReview";
import ApplyInvite from "./pages/ApplyInvite";
import ApplicationDetail from "./pages/ApplicationDetail";
import RentalApplication from "./pages/RentalApplication";
import ResetPassword from "./pages/ResetPassword";
import TenantMessages from "./pages/TenantMessages";
import Notifications from "./pages/Notifications";
import EnhancedTenantDashboard from "@/pages/EnhancedTenantDashboard";
import EnhancedLandlordDashboard from "@/pages/EnhancedLandlordDashboard";
import LandlordInspection from "@/pages/LandlordInspection";
import UsersManagement from "@/pages/admin/UsersManagement";
import Applications from "./pages/Applications";
import DocuSignCallback from "./pages/DocuSignCallback";
import DocuSignRedirect from "./pages/DocuSignRedirect";
import TenantDashboardRoutes from "@/components/dashboard/TenantDashboardRoutes";
import LandlordDashboardRoutes from "@/components/dashboard/LandlordDashboardRoutes";
import MaintenanceTicketDetails from "@/pages/MaintenanceTicketDetails";
import VerifyId from "@/pages/VerifyId";
import KycManagement from "@/pages/admin/KycManagement";
import MobileCapture from "@/pages/MobileCapture";
import KycCapture from "@/pages/KycCapture";
import InventoryStart from "@/pages/InventoryStart";
import { AuthenticatedRoute } from "@/components/AuthenticatedRoute";
import { VerificationGate } from "@/components/VerificationGate";
import { LeaseBuilder } from "@/pages/LeaseBuilder";
import { LeaseSignature } from "@/pages/LeaseSignature";
import { LeaseDashboard } from "@/pages/LeaseDashboard";
import CreateInspection from "@/pages/CreateInspection";
import SettingsPage from "@/pages/SettingsPage";
// Accounting imports
import AccountingDashboard from "@/pages/accounting/AccountingDashboard";
import AddTransactionPage from "@/pages/accounting/AddTransactionPage";
import TransactionsPage from "@/pages/accounting/TransactionsPage";
import ExpenseSummaryPage from "@/pages/accounting/ExpenseSummaryPage";
import TaxInvoicePage from "@/pages/accounting/TaxInvoicePage";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import SafeRenting from "./pages/SafeRenting";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

function AppRoutes() {
  useEffect(() => {
    // Initialize mobile services when app starts
    MobileServices.initialize();
  }, []);

  return (
    <Routes>
              {/* Admin Routes - No Navbar */}
              <Route path="/admin" element={<RouteGuard><AdminDashboard /></RouteGuard>} />
              <Route path="/admin/dashboard" element={<RouteGuard><AdminDashboard /></RouteGuard>} />
              <Route path="/admin/management" element={<RouteGuard><AdminManagement /></RouteGuard>} />
              <Route path="/admin/users" element={<RouteGuard><UsersManagement /></RouteGuard>} />
              <Route path="/admin/admin-users" element={<RouteGuard><AdminManagement /></RouteGuard>} />
              <Route path="/admin/properties" element={<RouteGuard><AdminProperties /></RouteGuard>} />
              <Route path="/admin/documents" element={<RouteGuard><DocumentReview /></RouteGuard>} />
              <Route path="/admin/kyc" element={<KycManagement />} />
              <Route path="/admin/reports" element={<RouteGuard><PropertyReports /></RouteGuard>} />

              {/* Routes with Navbar */}
              <Route path="/" element={<><Navbar /><Index /></>} />
              <Route path="/properties" element={<><Navbar /><Properties /></>} />
              <Route path="/about" element={<><Navbar /><About /></>} />
              <Route path="/contact" element={<><Navbar /><Contact /></>} />
              <Route path="/blog" element={<><Navbar /><Blog /></>} />
              <Route path="/blog/:postId" element={<><Navbar /><BlogPost /></>} />
              <Route path="/safe-renting" element={<><Navbar /><SafeRenting /></>} />
              <Route path="/pricing" element={<><Navbar /><Pricing /></>} />

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
              <Route path="/enhancedlandlorddashboard/*" element={<EnhancedLandlordDashboard />} />
              {/* Direct landlord inspection routes to bypass dashboard tab handling */}
              <Route path="/enhancedlandlorddashboard/inspection" element={<><EnhancedDashboardLayout title="Property Inspection"><LandlordInspection /></EnhancedDashboardLayout></>} />
              <Route path="/enhancedlandlorddashboard/inspection/start" element={<><EnhancedDashboardLayout title="Start Inspection"><InventoryStart /></EnhancedDashboardLayout></>} />
              <Route path="/inspections/new" element={<AuthenticatedRoute><EnhancedDashboardLayout title="New Inspection"><CreateInspection /></EnhancedDashboardLayout></AuthenticatedRoute>} />
              {/* Standalone maintenance ticket route for cross-dashboard access */}
              <Route path="/maintenance/:ticketId" element={<RouteGuard><MaintenanceTicketDetails /></RouteGuard>} />
              <Route path="/enhancedlandlorddashboard/add-property" element={<RouteGuard><ListProperty /></RouteGuard>} />
              <Route path="/add-property" element={<AuthenticatedRoute><ListProperty /></AuthenticatedRoute>} />
              <Route path="/list-property" element={<AuthenticatedRoute><ListProperty /></AuthenticatedRoute>} />
              <Route path="/property/:id" element={<PropertyDetail />} />
              <Route path="/manage-property/:id" element={<RouteGuard><PropertyManagement /></RouteGuard>} />
              
              {/* Lease System Routes */}
              <Route path="/leases" element={<AuthenticatedRoute><LeaseDashboard /></AuthenticatedRoute>} />
              <Route path="/lease/builder" element={<AuthenticatedRoute><LeaseBuilder /></AuthenticatedRoute>} />
              <Route path="/lease/builder/:contractId" element={<AuthenticatedRoute><LeaseBuilder /></AuthenticatedRoute>} />
              <Route path="/lease/builder/property/:propertyId" element={<AuthenticatedRoute><LeaseBuilder /></AuthenticatedRoute>} />
              <Route path="/lease/sign/:contractId" element={<AuthenticatedRoute><LeaseSignature /></AuthenticatedRoute>} />
              
              {/* Accounting Routes */}
              <Route path="/dashboard/accounting" element={<AuthenticatedRoute><AccountingDashboard /></AuthenticatedRoute>} />
              <Route path="/dashboard/accounting/new" element={<AuthenticatedRoute><AddTransactionPage /></AuthenticatedRoute>} />
              <Route path="/dashboard/accounting/transactions" element={<AuthenticatedRoute><TransactionsPage /></AuthenticatedRoute>} />
              <Route path="/dashboard/accounting/reports/expense-summary" element={<AuthenticatedRoute><ExpenseSummaryPage /></AuthenticatedRoute>} />
              <Route path="/dashboard/invoices/tax" element={<AuthenticatedRoute><TaxInvoicePage /></AuthenticatedRoute>} />
              
              <Route path="/messages" element={<AuthenticatedRoute requireVerification={false}><VerificationGate requireVerification={true}><Messages /></VerificationGate></AuthenticatedRoute>} />
              <Route path="/notifications" element={<AuthenticatedRoute><Notifications /></AuthenticatedRoute>} />
              <Route path="/applications" element={<AuthenticatedRoute><Applications /></AuthenticatedRoute>} />
              <Route path="/apply/invite/:token" element={<RouteGuard><ApplyInvite /></RouteGuard>} />
              <Route path="/application/:id" element={<RouteGuard><ApplicationDetail /></RouteGuard>} />
              <Route path="/rental-application/:propertyId" element={<RouteGuard><RentalApplication /></RouteGuard>} />
              <Route path="/tenant/messages" element={<RouteGuard><TenantMessages /></RouteGuard>} />
              <Route path="/verify-id" element={<RouteGuard><VerifyId /></RouteGuard>} />
              <Route path="/mobile-capture" element={<MobileCapture />} />
              <Route path="/kyc/capture" element={<KycCapture />} />
              {/* Test route for development */}
              <Route path="/kyc/test" element={<KycCapture />} />
              <Route path="/apply/:id" element={<PropertyDetail />} />
              <Route path="/payment-success" element={<RouteGuard><PaymentSuccess /></RouteGuard>} />
              <Route path="/settings" element={<RouteGuard><EnhancedDashboardLayout title="Account Settings"><SettingsPage /></EnhancedDashboardLayout></RouteGuard>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
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
