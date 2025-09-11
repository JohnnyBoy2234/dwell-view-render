import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';
import { RentDueCard } from '@/components/dashboard/tenant/RentDueCard';
import { ViewingCard } from '@/components/dashboard/tenant/ViewingCard';
import { MaintenanceCard } from '@/components/dashboard/tenant/MaintenanceCard';
import { PropertyPanel } from '@/components/dashboard/tenant/PropertyPanel';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useAuth } from '@/hooks/useAuth';
import { useLeaseNotifications } from '@/hooks/useLeaseNotifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Building, FileText, Settings, User, Calendar, Eye, Receipt, Clipboard, MessageSquare } from 'lucide-react';
import { SignedLeasesList } from '@/components/lease/SignedLeasesList';
import GlassCard from '@/components/ui/GlassCard';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BUILD_TAG } from '@/version';
import { TenantApplicationsSection } from '@/components/tenant/TenantApplicationsSection';
import TenantMaintenance from '@/pages/tenant/TenantMaintenance';
import TenantPropertyViewings from '@/pages/tenant/TenantPropertyViewings';
import TenantInventory from '@/pages/tenant/TenantInventory';
import TenantProofOfPayment from '@/pages/tenant/TenantProofOfPayment';

export default function EnhancedTenantDashboard() {
  const { user, isLandlord } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useUnreadMessages();
  
  // Initialize lease notifications
  useLeaseNotifications();
  
  const [currentTab, setCurrentTab] = useState('/enhancedtenantdashboard');
  const {
    loading,
    rentDue,
    tenantProperty,
    recentMaintenance,
    upcomingViewings,
    refetch
  } = useTenantDashboard();

  useEffect(() => {
    // Visible in production console to verify current deployed build
    // eslint-disable-next-line no-console
    console.log('[EnhancedTenantDashboard] Build:', BUILD_TAG);
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isLandlord) {
      navigate('/enhancedlandlorddashboard');
      return;
    }
    
    // Sync currentTab with the current URL path
    const path = location.pathname;
    if (path !== '/enhancedtenantdashboard' && path.startsWith('/enhancedtenantdashboard')) {
      setCurrentTab(path);
    }
  }, [user, isLandlord, navigate, location.pathname]);

  const handleMakePayment = () => {
    if (rentDue) {
      // Navigate to payment page or open payment modal
      navigate(`/payment/${rentDue.tenancyId}`);
    }
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    // Update the URL when changing tabs
    if (tab !== '/enhancedtenantdashboard') {
      navigate(tab);
    } else {
      navigate('/enhancedtenantdashboard');
    }
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case '/enhancedtenantdashboard/viewings':
        return <TenantPropertyViewings />;
      case '/enhancedtenantdashboard/inventory':
        return <TenantInventory />;
      case '/enhancedtenantdashboard/maintenance':
        return <TenantMaintenance />;
      case '/enhancedtenantdashboard/proof-of-payment':
        return <TenantProofOfPayment />;
      case '/enhancedtenantdashboard/contracts':
        return (
          <div className="space-y-6">
            <SignedLeasesList role="tenant" />
          </div>
        );
      case '/enhancedtenantdashboard/applications':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-6 w-6 text-ocean-blue" />
              <h2 className="text-xl font-bold">Applications</h2>
            </div>
            <TenantApplicationsSection />
          </div>
        );
      case '/enhancedtenantdashboard/profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="h-6 w-6 text-ocean-blue" />
              <h2 className="text-xl font-bold">Profile Settings</h2>
            </div>
            <Card>
              <CardContent className="p-8 text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Your Profile</h3>
                <p className="text-muted-foreground mb-4">
                  Manage your account settings and personal information
                </p>
                <Button onClick={() => navigate('/profile')}>
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return renderDashboardContent();
    }
  };

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="space-y-6 relative">
          {/* bg blobs */}
          <div aria-hidden className="pointer-events-none absolute -z-10 inset-0 overflow-hidden">
            <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-gradient-to-br from-brand.blue to-brand.green blur-3xl opacity-20"></div>
            <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-gradient-to-tr from-brand.green to-brand.blue blur-3xl opacity-10"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl bg-white/50 backdrop-blur-sm animate-pulse h-40 shadow-soft"></div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Unread Messages"
            value={unreadCount ?? 0}
            icon={<div className="h-5 w-5 bg-blue-100 rounded flex items-center justify-center">
              <div className="h-3 w-3 bg-blue-600 rounded-full"></div>
            </div>}
          />
          <StatCard
            label="Upcoming Viewings"
            value={(upcomingViewings?.length ?? 0).toString()}
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            label="Maintenance"
            value={(recentMaintenance?.length ?? 0).toString()}
            icon={<Settings className="h-5 w-5" />}
          />
          <StatCard
            label="Rent"
            value={rentDue ? 'Due' : 'Clear'}
            icon={<FileText className="h-5 w-5" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Action Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RentDueCard 
                rentDue={rentDue} 
                onMakePayment={handleMakePayment} 
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ViewingCard upcomingViewings={upcomingViewings} />
              <MaintenanceCard recentMaintenance={recentMaintenance} />
            </div>
          </div>

          {/* Right Panel - Property Information */}
          <div className="lg:col-span-1">
            <PropertyPanel 
              tenantProperty={tenantProperty}
              onMakePayment={handleMakePayment}
            />
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="mt-12">
          <SectionHeader title="Quick Actions" className="mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-4 cursor-pointer" onClick={() => handleTabChange('/enhancedtenantdashboard/viewings')}>
              <div className="text-brand.gray900">
                <div className="h-10 w-10 rounded-xl bg-ocean-blue/10 text-ocean-blue grid place-content-center mb-2">
                  <Eye className="h-5 w-5" />
                </div>
                <h4 className="font-semibold">Viewings</h4>
                <p className="text-sm text-brand.gray500">Manage property viewings</p>
              </div>
            </GlassCard>
            <GlassCard className="p-4 cursor-pointer" onClick={() => handleTabChange('/enhancedtenantdashboard/inventory')}>
              <div className="text-brand.gray900">
                <div className="h-10 w-10 rounded-xl bg-success-green/10 text-success-green grid place-content-center mb-2">
                  <Clipboard className="h-5 w-5" />
                </div>
                <h4 className="font-semibold">Inventory</h4>
                <p className="text-sm text-brand.gray500">Property condition records</p>
              </div>
            </GlassCard>
            <GlassCard className="p-4 cursor-pointer" onClick={() => navigate('/messages')}>
              <div className="text-brand.gray900">
                <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 grid place-content-center mb-2">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h4 className="font-semibold">Messages</h4>
                <p className="text-sm text-brand.gray500">Chat with landlords</p>
              </div>
            </GlassCard>
            <GlassCard className="p-4 cursor-pointer" onClick={() => handleTabChange('/enhancedtenantdashboard/proof-of-payment')}>
              <div className="text-brand.gray900">
                <div className="h-10 w-10 rounded-xl bg-earth-warm/10 text-earth-warm grid place-content-center mb-2">
                  <Receipt className="h-5 w-5" />
                </div>
                <h4 className="font-semibold">Proof of Payment</h4>
                <p className="text-sm text-brand.gray500">Upload payment documents</p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  };

  return (
    <EnhancedDashboardLayout 
      title="Tenant Dashboard" 
      currentTab={currentTab}
      onTabChange={handleTabChange}
    >
      {renderTabContent()}
    </EnhancedDashboardLayout>
  );
}