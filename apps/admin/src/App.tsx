import * as React from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminManagement from "@/pages/admin/AdminManagement";
import AdminProperties from "@/pages/admin/AdminProperties";
import PropertyReports from "@/pages/admin/PropertyReports";
import DocumentReview from "@/pages/admin/DocumentReview";
import UsersManagement from "@/pages/admin/UsersManagement";
import KycManagement from "@/pages/admin/KycManagement";
import { SupportMessagesAdmin } from "@/components/admin/SupportMessagesAdmin";
import { useEffect } from "react";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

function AdminRoleGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isPublicRoute = pathname === "/auth" || pathname === "/reset-password";

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      navigate("/auth", { replace: true });
    }
  }, [loading, user, isPublicRoute, navigate]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

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
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="/admin/management" element={<AdminLayout><AdminManagement /></AdminLayout>} />
      <Route path="/admin/users" element={<AdminLayout><UsersManagement /></AdminLayout>} />
      <Route path="/admin/admin-users" element={<AdminLayout><AdminManagement /></AdminLayout>} />
      <Route path="/admin/properties" element={<AdminLayout><AdminProperties /></AdminLayout>} />
      <Route path="/admin/documents" element={<AdminLayout><DocumentReview /></AdminLayout>} />
      <Route path="/admin/kyc" element={<AdminLayout><KycManagement /></AdminLayout>} />
      <Route path="/admin/reports" element={<AdminLayout><PropertyReports /></AdminLayout>} />
      <Route path="/admin/support" element={<AdminLayout><SupportMessagesAdmin /></AdminLayout>} />

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
                <AdminRoleGuard>
                  <AppRoutes />
                </AdminRoleGuard>
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
