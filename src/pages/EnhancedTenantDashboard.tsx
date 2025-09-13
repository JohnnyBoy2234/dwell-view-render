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

// Custom R icon for South African Rand
const RIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>
);
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
import { SwiftRentSupport } from '@/components/support/SwiftRentSupport';

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
    // Update the URL when changing tabs - navigate to absolute paths
    navigate(tab);
  };

  const renderTabContent = () => {
    // Always show the dashboard overview - navigation handled by routing
    return renderDashboardContent();
  };

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-ios-gray-light via-white to-ios-gray-light">
          <div className="p-4 space-y-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm animate-pulse h-24 rounded-ios-card shadow-ios-sm border border-white/40"></div>
            ))}
          </div>
        </div>
      );
    }

    const featureBlocks = [
      {
        title: 'Property Viewings',
        icon: Eye,
        color: 'hsl(var(--ios-blue))',
        bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
        iconBg: 'bg-blue-500',
        count: upcomingViewings?.length || 0,
        subtitle: upcomingViewings?.length ? `${upcomingViewings.length} upcoming` : 'No viewings',
        path: '/tenant/viewings'
      },
      {
        title: 'Inventory',
        icon: Clipboard,
        color: 'hsl(var(--ios-green))',
        bgColor: 'bg-gradient-to-br from-green-50 to-green-100/50',
        iconBg: 'bg-green-500',
        subtitle: 'Property condition',
        path: '/tenant/inventory'
      },
      {
        title: 'Maintenance',
        icon: Settings,
        color: 'hsl(var(--ios-orange))',
        bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100/50',
        iconBg: 'bg-orange-500',
        count: recentMaintenance?.length || 0,
        subtitle: recentMaintenance?.length ? `${recentMaintenance.length} requests` : 'No issues',
        path: '/tenant/maintenance'
      },
      {
        title: 'Proof of Payment',
        icon: RIcon,
        color: 'hsl(var(--ios-purple))',
        bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
        iconBg: 'bg-purple-500',
        subtitle: 'Upload documents',
        path: '/tenant/proof-of-payment'
      },
      {
        title: 'Contract',
        icon: FileText,
        color: 'hsl(var(--ios-indigo))',
        bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50',
        iconBg: 'bg-indigo-500',
        subtitle: 'Lease documents',
        path: '/tenant/contracts'
      },
      {
        title: 'Applications',
        icon: Building,
        color: 'hsl(var(--ios-teal))',
        bgColor: 'bg-gradient-to-br from-teal-50 to-teal-100/50',
        iconBg: 'bg-teal-500',
        subtitle: 'Application status',
        path: '/tenant/applications'
      },
      {
        title: 'Settings',
        icon: User,
        color: 'hsl(var(--ios-pink))',
        bgColor: 'bg-gradient-to-br from-pink-50 to-pink-100/50',
        iconBg: 'bg-pink-500',
        subtitle: 'Account settings',
        path: '/tenant/profile'
      }
    ];

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
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-red-900">Rent Due</h3>
                  <p className="text-sm text-red-600">Payment required</p>
                </div>
                <button
                  onClick={handleMakePayment}
                  className="px-4 py-2 bg-red-500 text-white rounded-ios-button text-sm font-medium 
                           hover:bg-red-600 active:scale-95 transition-all duration-200"
                >
                  Pay Now
                </button>
              </div>
            </div>
          )}

          {/* SwiftRent Support Section */}
          <div className="mt-6">
            <SwiftRentSupport />
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