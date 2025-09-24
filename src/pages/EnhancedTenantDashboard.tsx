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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Bell, Home, Activity, FileText, Eye, Settings, Building, User, Receipt, Clipboard } from "lucide-react";
import { QuickLeaseActions } from "@/components/lease/QuickLeaseActions";
import { LeaseDashboard as LeaseDashboardComponent } from '@/components/lease/LeaseDashboard';

// Custom R icon for South African Rand
const RIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>
);
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
    if (currentTab === '/enhancedtenantdashboard/leases') {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-6 w-6 text-ocean-blue" />
            <h2 className="text-xl font-bold">Lease System</h2>
            <Badge variant="secondary" className="ml-2">
              Contract Management
            </Badge>
          </div>
          <LeaseDashboardComponent />
        </div>
      );
    }
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
        title: 'Lease Contracts',
        icon: FileText,
        color: 'hsl(var(--ios-indigo))',
        bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50',
        iconBg: 'bg-indigo-500',
        subtitle: 'Lease documents',
        path: '/enhancedtenantdashboard/leases'
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
      <div className="min-h-screen bg-gradient-to-br from-ios-gray-light via-white to-ios-gray-light">
        {/* iPhone-style status bar simulation */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50">
          <div className="px-4 py-2 flex justify-between items-center">
            <div className="text-sm font-semibold text-gray-900">Dashboard</div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="text-xs text-gray-600">Online</div>
            </div>
          </div>
        </div>

        <div className="p-4 pb-24 md:pb-4 space-y-4">

          {/* Feature Blocks - Management tools style grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {featureBlocks.map((block) => {
              const IconComponent = block.icon;
              return (
                <div key={block.title}>
                  <Card
                    className="cursor-pointer rounded-2xl bg-white shadow-md border border-gray-200/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                    onClick={() => navigate(block.path)}
                  >
                    <CardContent className="p-5">
                      <div className="flex flex-col items-center text-center">
                        <div className="relative">
                          <div className={`w-12 h-12 ${block.iconBg} rounded-full shadow-md flex items-center justify-center`}>
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                          {block.count !== undefined && block.count > 0 && (
                            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-medium bg-red-500 text-white shadow-sm">
                              {block.count}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-gray-900">{block.title}</h3>
                        <p className="text-xs text-gray-500">{block.subtitle}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Rent Status - Special card */}
          {rentDue && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-ios-card p-4 shadow-ios-md border border-red-200/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-500 rounded-ios-button flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
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