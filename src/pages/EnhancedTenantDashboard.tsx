import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TenantDashboardHeader } from '@/components/dashboard/tenant/TenantDashboardHeader';
import { RentDueCard } from '@/components/dashboard/tenant/RentDueCard';
import { MessagesCard } from '@/components/dashboard/tenant/MessagesCard';
import { ViewingCard } from '@/components/dashboard/tenant/ViewingCard';
import { MaintenanceCard } from '@/components/dashboard/tenant/MaintenanceCard';
import { PropertyPanel } from '@/components/dashboard/tenant/PropertyPanel';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

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
    <div className="min-h-screen bg-gradient-to-br from-background to-earth-light/30">
      <TenantDashboardHeader />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Quick Actions Section */}
        <div className="mt-12 p-6 bg-gradient-to-r from-ocean-blue/10 to-success-green/10 rounded-xl border border-ocean-blue/20">
          <h3 className="text-lg font-semibold text-ocean-blue mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/properties')}
              className="p-4 bg-white rounded-lg shadow-soft hover:shadow-medium transition-all duration-300 hover-scale text-left group"
            >
              <div className="text-ocean-blue group-hover:text-ocean-blue-dark transition-colors">
                <h4 className="font-semibold">Browse Properties</h4>
                <p className="text-sm text-muted-foreground">Find your next home</p>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/tenant-messages')}
              className="p-4 bg-white rounded-lg shadow-soft hover:shadow-medium transition-all duration-300 hover-scale text-left group"
            >
              <div className="text-success-green group-hover:text-success-green-dark transition-colors">
                <h4 className="font-semibold">Messages</h4>
                <p className="text-sm text-muted-foreground">Chat with landlords</p>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/maintenance/new')}
              className="p-4 bg-white rounded-lg shadow-soft hover:shadow-medium transition-all duration-300 hover-scale text-left group"
            >
              <div className="text-earth-warm group-hover:text-earth-warm-dark transition-colors">
                <h4 className="font-semibold">Report Issue</h4>
                <p className="text-sm text-muted-foreground">Submit maintenance request</p>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}