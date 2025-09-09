import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RouteGuard } from "@/components/RouteGuard";
import { PropertiesRouteGuard } from "@/components/RoleGuard";
import Navbar from "./components/Navbar";
import { MobileBottomBar } from "./components/MobileBottomBar";
import Index from "./pages/Index";
import Properties from "./pages/Properties";
import About from "./pages/About";
import Auth from "./pages/Auth";
import LeaseSigningPage from "./pages/LeaseSigningPage";
import LandlordLeaseSigningPage from "./pages/LandlordLeaseSigningPage";
import ListProperty from "./pages/ListProperty";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyManagement from "./pages/PropertyManagement";
import Messages from "./pages/Messages";
import { EnhancedDashboardLayout } from "@/components/dashboard/EnhancedDashboardLayout";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./pages/PaymentSuccess";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminManagement from "./pages/admin/AdminManagement";
import DocumentReview from "./pages/admin/DocumentReview";
import ApplyInvite from "./pages/ApplyInvite";
import ApplicationDetail from "./pages/ApplicationDetail";
import RentalApplication from "./pages/RentalApplication";
import ResetPassword from "./pages/ResetPassword";
import TenantMessages from "./pages/TenantMessages";
import EnhancedTenantDashboard from "@/pages/EnhancedTenantDashboard";
import EnhancedLandlordDashboard from "@/pages/EnhancedLandlordDashboard";
import DocuSignCallback from "./pages/DocuSignCallback";
import DocuSignRedirect from "./pages/DocuSignRedirect";
import TenantDashboardRoutes from "@/components/dashboard/TenantDashboardRoutes";
import LandlordDashboardRoutes from "@/components/dashboard/LandlordDashboardRoutes";
import MaintenanceTicketDetails from "@/pages/MaintenanceTicketDetails";
import VerifyId from "@/pages/VerifyId";
import KycManagement from "@/pages/admin/KycManagement";
import MobileCapture from "@/pages/MobileCapture";
import KycCapture from "@/pages/KycCapture";
import { AuthenticatedRoute } from "@/components/AuthenticatedRoute";
import { Analytics } from "@vercel/analytics/next"

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Admin Routes - No Navbar */}
            <Route path="/admin" element={<RouteGuard><AdminDashboard /></RouteGuard>} />
            <Route path="/admin/dashboard" element={<RouteGuard><AdminDashboard /></RouteGuard>} />
            <Route path="/admin/management" element={<RouteGuard><AdminManagement /></RouteGuard>} />
            <Route path="/admin/documents" element={<RouteGuard><DocumentReview /></RouteGuard>} />
            <Route path="/admin/kyc" element={<KycManagement />} />

            {/* Routes with Navbar */}
            <Route path="/" element={<><Navbar /><Index /></>} />
            <Route path="/properties" element={<><Navbar /><AuthenticatedRoute><Properties /></AuthenticatedRoute></>} />
            <Route path="/about" element={<><Navbar /><About /></>} />

            {/* Routes without Navbar */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<DocuSignCallback />} />
            <Route path="/docusign-callback" element={<DocuSignCallback />} />
            <Route path="/docusign-redirect" element={<DocuSignRedirect />} />
            
            {/* Enhanced Dashboard Routes */}
            <Route path="/enhancedtenantdashboard/*" element={<EnhancedTenantDashboard />} />
            <Route path="/enhancedlandlorddashboard/*" element={<EnhancedLandlordDashboard />} />
            {/* Standalone maintenance ticket route for cross-dashboard access */}
            <Route path="/maintenance/:ticketId" element={<RouteGuard><MaintenanceTicketDetails /></RouteGuard>} />
            <Route path="/lease-signing/:tenancyId" element={<RouteGuard><LeaseSigningPage /></RouteGuard>} />
            <Route path="/landlord-lease-signing/:tenancyId" element={<RouteGuard><LandlordLeaseSigningPage /></RouteGuard>} />
            <Route path="/enhancedlandlorddashboard/add-property" element={<RouteGuard><ListProperty /></RouteGuard>} />
            <Route path="/add-property" element={<AuthenticatedRoute><ListProperty /></AuthenticatedRoute>} />
            <Route path="/list-property" element={<AuthenticatedRoute><ListProperty /></AuthenticatedRoute>} />
            <Route path="/property/:id" element={<PropertyDetail />} />
            <Route path="/manage-property/:id" element={<RouteGuard><PropertyManagement /></RouteGuard>} />
            <Route path="/messages" element={<AuthenticatedRoute><EnhancedDashboardLayout title="Messages"><Messages /></EnhancedDashboardLayout></AuthenticatedRoute>} />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MobileBottomBar />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
