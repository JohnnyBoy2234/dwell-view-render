import * as React from "react";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import { AuthenticatedRoute } from "@/components/AuthenticatedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MiniNavbar } from "@/components/ui/mini-navbar";
import { EnhancedDashboardLayout } from "@/components/dashboard/EnhancedDashboardLayout";
import Index from "@/pages/Index";
import Properties from "@/pages/Properties";
import PropertyDetail from "@/pages/PropertyDetail";
import SaleListings from "@/pages/SaleListings";
import About from "@/pages/About";
import AboutLandlord from "@/pages/AboutLandlord";
import AboutTenant from "@/pages/AboutTenant";
import AboutSeller from "@/pages/AboutSeller";
import Contact from "@/pages/Contact";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import Pricing from "@/pages/Pricing";
import SafeRenting from "@/pages/SafeRenting";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Notifications from "@/pages/Notifications";
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />

      <Route path="/properties" element={<><MiniNavbar /><div className="pt-[72px]"><Properties /></div></>} />
      <Route path="/sale-listings" element={<><MiniNavbar /><div className="pt-[72px]"><SaleListings /></div></>} />
      <Route path="/property/:id" element={<PropertyDetail />} />
      <Route path="/apply/:id" element={<PropertyDetail />} />

      <Route path="/about" element={<><MiniNavbar /><div className="pt-[72px]"><About /></div></>} />
      <Route path="/about/landlord" element={<><MiniNavbar /><div className="pt-[72px]"><AboutLandlord /></div></>} />
      <Route path="/about/tenant" element={<><MiniNavbar /><div className="pt-[72px]"><AboutTenant /></div></>} />
      <Route path="/about/seller" element={<><MiniNavbar /><div className="pt-[72px]"><AboutSeller /></div></>} />
      <Route path="/contact" element={<><MiniNavbar /><div className="pt-[72px]"><Contact /></div></>} />
      <Route path="/blog" element={<><MiniNavbar /><div className="pt-[72px]"><Blog /></div></>} />
      <Route path="/blog/:postId" element={<><MiniNavbar /><div className="pt-[72px]"><BlogPost /></div></>} />
      <Route path="/pricing" element={<><MiniNavbar /><div className="pt-[72px]"><Pricing /></div></>} />
      <Route path="/safe-renting" element={<><MiniNavbar /><div className="pt-[72px]"><SafeRenting /></div></>} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/notifications" element={<AuthenticatedRoute><Notifications /></AuthenticatedRoute>} />
      <Route path="/settings" element={
        <AuthenticatedRoute>
          <EnhancedDashboardLayout title="Account Settings">
            <SettingsPage />
          </EnhancedDashboardLayout>
        </AuthenticatedRoute>
      } />

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
                <AppRoutes />
              </ErrorBoundary>
            </BrowserRouter>
          </AuthBootstrap>
        </AuthProvider>
      </TooltipProvider>
      <Analytics />
      <SpeedInsights />
    </QueryClientProvider>
  );
};

export default App;
