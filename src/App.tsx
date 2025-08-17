import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RouteGuard } from "@/components/RouteGuard";
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import Properties from "./pages/Properties";
import HowItWorks from "./pages/HowItWorks";
import About from "./pages/About";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TenantDashboard from "./pages/TenantDashboard";
import LeaseSigningPage from "./pages/LeaseSigningPage";
import LandlordLeaseSigningPage from "./pages/LandlordLeaseSigningPage";
import AddProperty from "./pages/AddProperty";
import ListProperty from "./pages/ListProperty";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyManagement from "./pages/PropertyManagement";
import Messages from "./pages/Messages";
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

            {/* Routes with Navbar */}
            <Route
              element={
                <>
                  <Navbar />
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/properties" element={<RouteGuard><Properties /></RouteGuard>} />
                    <Route path="/how-it-works" element={<HowItWorks />} />
                    <Route path="/about" element={<About />} />
                  </Routes>
                </>
              }
            >
              <Route path="/" />
              <Route path="/properties" />
              <Route path="/how-it-works" />
              <Route path="/about" />
            </Route>

            {/* Routes without Navbar */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<RouteGuard><Dashboard /></RouteGuard>} />
            <Route path="/tenant-dashboard" element={<RouteGuard><TenantDashboard /></RouteGuard>} />
            <Route path="/lease-signing/:tenancyId" element={<RouteGuard><LeaseSigningPage /></RouteGuard>} />
            <Route path="/landlord-lease-signing/:tenancyId" element={<RouteGuard><LandlordLeaseSigningPage /></RouteGuard>} />
            <Route path="/dashboard/add-property" element={<RouteGuard><AddProperty /></RouteGuard>} />
            <Route path="/list-property" element={<RouteGuard><ListProperty /></RouteGuard>} />
            <Route path="/property/:id" element={<PropertyDetail />} />
            <Route path="/manage-property/:id" element={<RouteGuard><PropertyManagement /></RouteGuard>} />
            <Route path="/messages" element={<RouteGuard><Messages /></RouteGuard>} />
            <Route path="/apply/invite/:token" element={<RouteGuard><ApplyInvite /></RouteGuard>} />
            <Route path="/application/:id" element={<RouteGuard><ApplicationDetail /></RouteGuard>} />
            <Route path="/rental-application/:propertyId" element={<RouteGuard><RentalApplication /></RouteGuard>} />
            <Route path="/tenant/messages" element={<RouteGuard><TenantMessages /></RouteGuard>} />
            <Route path="/apply/:id" element={<PropertyDetail />} />
            <Route path="/payment-success" element={<RouteGuard><PaymentSuccess /></RouteGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
