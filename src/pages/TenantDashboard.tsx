import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  FileText, 
  Home, 
  MessageSquare, 
  Eye, 
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Download
} from 'lucide-react';
import { useTenantNotifications } from '@/hooks/useTenantNotifications';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { TenantApplicationsSection } from '@/components/tenant/TenantApplicationsSection';
import { supabase } from '@/integrations/supabase/client';
import { SignedLeasesList } from '@/components/lease/SignedLeasesList';
import { TenantLayout } from '@/components/dashboard/TenantLayout';

export default function TenantDashboard() {
  const { user, isLandlord, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    notifications, 
    pendingLeases, 
    loading, 
    unreadCount, 
    markAsRead 
  } = useTenantNotifications();

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

  const handleViewLease = (tenancyId: string) => {
    navigate(`/tenant/lease-signing/${tenancyId}`);
  };

  const handleDownloadLease = async (leaseRef: string, propertyTitle: string) => {
    try {
      let downloadUrl: string;
      
      if (leaseRef.startsWith('http')) {
        downloadUrl = leaseRef;
      } else {
        const { data, error } = await supabase.storage
          .from('leases')
          .createSignedUrl(leaseRef, 3600);
        
        if (error) throw error;
        downloadUrl = data.signedUrl;
      }
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${propertyTitle}_lease.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: "Your lease document is being downloaded.",
      });
    } catch (error) {
      console.error('Error downloading lease:', error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not download the lease document. Please try again.",
      });
    }
  };

  const handleNotificationClick = async (notification: any) => {
    await markAsRead(notification.id);
    
    if (notification.type === 'lease_ready') {
      const propertyMatch = notification.data?.tenancy_id;
      if (propertyMatch) {
        navigate(`/tenant/lease-signing/${propertyMatch}`);
      }
    } else if (notification.type === 'viewing_confirmed') {
      navigate('/tenant/messages');
    }
  };

  const getLeaseStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_signature':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Signature Required</Badge>;
      case 'signed':
        return <Badge className="bg-green-500 hover:bg-green-600">Signed</Badge>;
      case 'active':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Active</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <TenantLayout title="Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout title="Dashboard">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/30 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Home className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                Welcome back!
              </h1>
              <p className="text-blue-700 dark:text-blue-300">
                Manage your rental applications and stay connected
              </p>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        {notifications.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Bell className="h-5 w-5 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold">Action Required</h2>
              <Badge className="bg-orange-500 hover:bg-orange-600">{notifications.length}</Badge>
            </div>
            <div className="grid gap-4">
              {notifications.map((notification) => (
                <Alert 
                  key={notification.id} 
                  className="cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all duration-200 border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/10 dark:to-red-950/10"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <AlertDescription className="flex items-start justify-between">
                    <span className="font-medium text-orange-900 dark:text-orange-100">{notification.message}</span>
                    <Badge variant="outline" className="ml-2 border-orange-300 text-orange-700">
                      {format(new Date((notification as any).createdAt || (notification as any).created_at), 'MMM d')}
                    </Badge>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Pending Lease Actions */}
        {pendingLeases.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold">Lease Actions</h2>
              <Badge className="bg-blue-500 hover:bg-blue-600">{pendingLeases.length}</Badge>
            </div>
            <div className="grid gap-4">
              {pendingLeases.map((tenancy) => (
                <Card key={tenancy.id} className="hover:shadow-lg transition-all duration-200 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/10 dark:to-indigo-950/10">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg text-blue-900 dark:text-blue-100">{(tenancy as any).properties?.title || 'Property'}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1 text-blue-700 dark:text-blue-300">
                          <Home className="h-4 w-4" />
                          {(tenancy as any).properties?.location || 'Location not available'}
                        </CardDescription>
                      </div>
                      {getLeaseStatusBadge(tenancy.lease_status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <div className="flex items-center gap-2 p-3 bg-white/50 dark:bg-blue-950/30 rounded-lg">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-semibold">Monthly Rent: R{tenancy.monthly_rent?.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleViewLease(tenancy.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {tenancy.lease_status === 'pending_signature' ? 'Sign Lease' : 'View Details'}
                        </Button>
                        
                        {tenancy.lease_document_url && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadLease(tenancy.lease_document_url!, (tenancy as any).properties?.title || 'lease')}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Signed Leases */}
        <SignedLeasesList role="tenant" />

        {/* Applications Section */}
        <TenantApplicationsSection />

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Home className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="p-6 h-auto flex-col gap-3 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all duration-200 border-green-200 dark:border-green-800 group"
              onClick={() => navigate('/tenant/properties')}
            >
              <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
                <Home className="h-6 w-6 text-green-600" />
              </div>
              <span className="font-semibold text-green-900 dark:text-green-100">Browse Properties</span>
            </Button>
            <Button 
              variant="outline" 
              className="p-6 h-auto flex-col gap-3 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all duration-200 border-blue-200 dark:border-blue-800 group"
              onClick={() => navigate('/tenant/messages')}
            >
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <span className="font-semibold text-blue-900 dark:text-blue-100">Messages</span>
            </Button>
            <Button 
              variant="outline" 
              className="p-6 h-auto flex-col gap-3 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all duration-200 border-purple-200 dark:border-purple-800 group"
              onClick={() => navigate('/tenant/profile')}
            >
              <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
                <Bell className="h-6 w-6 text-purple-600" />
              </div>
              <span className="font-semibold text-purple-900 dark:text-purple-100">Profile</span>
            </Button>
          </div>
        </div>
      </div>
    </TenantLayout>
  );
}