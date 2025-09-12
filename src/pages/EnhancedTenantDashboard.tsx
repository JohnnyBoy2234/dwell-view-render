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
        title: 'Profile',
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

          {/* Feature Blocks - iPhone app grid style */}
          <div className="space-y-3">
            {featureBlocks.map((block) => {
              const IconComponent = block.icon;
              return (
                <button
                  key={block.title}
                  onClick={() => navigate(block.path)}
                  className="w-full bg-white/90 backdrop-blur-md rounded-ios-card p-4 shadow-ios-md border border-white/40 
                           hover:shadow-ios-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 
                           group text-left"
                >
                  <div className="flex items-center space-x-4">
                    {/* iOS-style app icon */}
                    <div className={`w-12 h-12 ${block.iconBg} rounded-ios-button shadow-ios-sm 
                                   flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">{block.title}</h3>
                          <p className="text-sm text-gray-500 mt-0.5">{block.subtitle}</p>
                        </div>
                        
                        {/* iOS-style chevron */}
                        <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Count badge if applicable */}
                      {block.count !== undefined && block.count > 0 && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {block.count}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
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