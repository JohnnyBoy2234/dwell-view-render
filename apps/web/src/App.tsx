import * as React from "react";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from "@mzanzihomes/ui/components/toaster";
import { Toaster as Sonner } from "@mzanzihomes/ui/components/sonner";
import { TooltipProvider } from "@mzanzihomes/ui/components/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
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

const AdminRoutes = React.lazy(() => import("@/pages/admin/AdminRoutes"));

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) return <Spinner />;
  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-8">
        <div className="text-center space-y-4 max-w-sm">
          <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground text-sm">
            This portal is restricted to MzanziHomes administrators.
          </p>
          <button
            onClick={() => signOut()}
            className="w-full rounded-ios-button bg-destructive py-3 px-6 text-sm font-semibold text-destructive-foreground"
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

      <Route path="/admin/*" element={
        <AdminRouteGuard>
          <React.Suspense fallback={<Spinner />}>
            <AdminRoutes />
          </React.Suspense>
        </AdminRouteGuard>
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
