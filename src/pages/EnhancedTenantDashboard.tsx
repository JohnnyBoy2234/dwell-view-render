import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { RentDueCard } from '@/components/dashboard/tenant/RentDueCard';
import { MessagesCard } from '@/components/dashboard/tenant/MessagesCard';
import { ViewingCard } from '@/components/dashboard/tenant/ViewingCard';
import { MaintenanceCard } from '@/components/dashboard/tenant/MaintenanceCard';
import { PropertyPanel } from '@/components/dashboard/tenant/PropertyPanel';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';

export default function EnhancedTenantDashboard() {
  const { user, isLandlord } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();
  const {
    loading,
    rentDue,
    tenantProperty,
    recentMaintenance,
    upcomingViewings,
    refetch
  } = useTenantDashboard();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isLandlord) {
      navigate('/dashboard');
      return;
    }
  }, [user, isLandlord, navigate]);

  const handleMakePayment = () => {
    if (rentDue) {
      // Navigate to payment page or open payment modal
      navigate(`/payment/${rentDue.tenancyId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-earth-light/30">
        <TenantDashboardHeader />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Loading skeletons */}
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-muted animate-pulse h-64 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <EnhancedDashboardLayout title="Dashboard">
      <div className="space-y-6">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-ocean-blue mb-2">
            Welcome back!
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening with your rental
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Action Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RentDueCard 
                rentDue={rentDue} 
                onMakePayment={handleMakePayment} 
              />
              <MessagesCard unreadCount={unreadCount} />
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
      </div>
    </EnhancedDashboardLayout>
  );
}