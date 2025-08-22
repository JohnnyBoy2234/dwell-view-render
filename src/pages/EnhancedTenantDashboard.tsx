import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';
import { MessagesTab } from '@/components/dashboard/MessagesTab';
import { RentDueCard } from '@/components/dashboard/tenant/RentDueCard';
import { MessagesCard } from '@/components/dashboard/tenant/MessagesCard';
import { ViewingCard } from '@/components/dashboard/tenant/ViewingCard';
import { MaintenanceCard } from '@/components/dashboard/tenant/MaintenanceCard';
import { PropertyPanel } from '@/components/dashboard/tenant/PropertyPanel';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, MessageSquare, Building, FileText, Settings, User } from 'lucide-react';

export default function EnhancedTenantDashboard() {
  const { user, isLandlord } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();
  const [currentTab, setCurrentTab] = useState('/tenant-dashboard');
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

  const renderTabContent = () => {
    switch (currentTab) {
      case '/tenant-messages':
        return <MessagesTab />;
      case '/properties':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Building className="h-6 w-6 text-ocean-blue" />
              <h2 className="text-xl font-bold">Browse Properties</h2>
            </div>
            <Card>
              <CardContent className="p-8 text-center">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Property Search</h3>
                <p className="text-muted-foreground mb-4">Browse available rental properties</p>
                <Button onClick={() => navigate('/properties')}>View All Properties</Button>
              </CardContent>
            </Card>
          </div>
        );
      case '/tenant-applications':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-6 w-6 text-ocean-blue" />
              <h2 className="text-xl font-bold">My Applications</h2>
            </div>
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Application History</h3>
                <p className="text-muted-foreground">Track your rental applications</p>
              </CardContent>
            </Card>
          </div>
        );
      case '/maintenance':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="h-6 w-6 text-ocean-blue" />
              <h2 className="text-xl font-bold">Maintenance Requests</h2>
            </div>
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Maintenance</h3>
                <p className="text-muted-foreground">Submit and track maintenance requests</p>
              </CardContent>
            </Card>
          </div>
        );
      case '/tenant-profile':
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
                <p className="text-muted-foreground">Manage your account settings</p>
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-muted animate-pulse h-64 rounded-lg"></div>
            ))}
          </div>
        </div>
      );
    }

    return (
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
              onClick={() => setCurrentTab('/tenant-messages')}
              className="p-4 bg-white rounded-lg shadow-soft hover:shadow-medium transition-all duration-300 hover-scale text-left group"
            >
              <div className="text-success-green group-hover:text-success-green-dark transition-colors">
                <h4 className="font-semibold">Messages</h4>
                <p className="text-sm text-muted-foreground">Chat with landlords</p>
              </div>
            </button>
            
            <button 
              onClick={() => setCurrentTab('/maintenance')}
              className="p-4 bg-white rounded-lg shadow-soft hover:shadow-medium transition-all duration-300 hover-scale text-left group"
            >
              <div className="text-earth-warm group-hover:text-earth-warm-dark transition-colors">
                <h4 className="font-semibold">Report Issue</h4>
                <p className="text-sm text-muted-foreground">Submit maintenance request</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <EnhancedDashboardLayout 
      title="Tenant Dashboard" 
      currentTab={currentTab}
      onTabChange={setCurrentTab}
    >
      {renderTabContent()}
    </EnhancedDashboardLayout>
  );
}