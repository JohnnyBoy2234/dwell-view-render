import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLandlordMetrics } from '@/hooks/useLandlordMetrics';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';
import { MessagesTab } from '@/components/dashboard/MessagesTab';
import { MetricsGrid } from '@/components/dashboard/landlord/MetricsGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Eye, Plus, Users, MessageSquare, FileText, Building, BarChart3, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BUILD_TAG } from '@/version';

interface PropertyWithTenant {
  id: string;
  title: string;
  location: string;
  images: string[];
  price: number;
  status: string;
  tenant_name?: string;
  tenant_id?: string;
  lease_status?: string;
}

interface TenantListItem {
  id: string;
  name: string;
  property_title: string;
  monthly_rent: number;
  payment_status: 'paid' | 'pending' | 'overdue';
  lease_end_date: string;
}

export default function EnhancedLandlordDashboard() {
  const { user, isLandlord } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { loading: metricsLoading, metrics } = useLandlordMetrics();
  const [currentTab, setCurrentTab] = useState('/enhancedlandlorddashboard');
  
  const [properties, setProperties] = useState<PropertyWithTenant[]>([]);
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Visible in production console to verify current deployed build
    // eslint-disable-next-line no-console
    console.log('[EnhancedLandlordDashboard] Build:', BUILD_TAG);
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!isLandlord) {
      navigate('/tenant-dashboard');
      return;
    }
    
    // Sync currentTab with the current URL path
    const path = location.pathname;
    if (path !== '/enhancedlandlorddashboard' && path.startsWith('/enhancedlandlorddashboard')) {
      setCurrentTab(path);
    }
    
    fetchDashboardData();
  }, [user, isLandlord, navigate, location.pathname]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch properties with tenant information
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          title,
          location,
          images,
          price,
          status
        `)
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;
      setProperties(propertiesData || []);

      // Fetch tenants with payment status
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenancies')
        .select(`
          id,
          monthly_rent,
          end_date,
          properties!inner (
            title
          ),
          tenant_profile:profiles!fk_tenancies_tenant (
            display_name
          )
        `)
        .eq('landlord_id', user.id)
        .eq('status', 'active');

      if (tenantsError) throw tenantsError;
      
      const transformedTenants = (tenantsData || []).map((tenant: any) => ({
        id: tenant.id,
        name: tenant.tenant_profile?.display_name || 'Unknown Tenant',
        property_title: tenant.properties?.title || 'Unknown Property',
        monthly_rent: tenant.monthly_rent,
        payment_status: 'pending' as 'paid' | 'pending' | 'overdue',
        lease_end_date: tenant.end_date,
      }));
      
      setTenants(transformedTenants);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available':
        return 'default';
      case 'rented':
      case 'occupied':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPaymentStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'overdue':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case '/enhancedlandlorddashboard/messages':
        // Navigate to the actual messages page instead of showing MessagesTab
        navigate('/enhancedlandlorddashboard/messages');
        return null;
      case '/enhancedlandlorddashboard/properties':
        return renderPropertiesTab();
      case '/enhancedlandlorddashboard/applications':
        return renderApplicationsTab();
      case '/enhancedlandlorddashboard/tenants':
        return renderTenantsTab();
      case '/enhancedlandlorddashboard/payments':
        return renderPaymentsTab();
      case '/enhancedlandlorddashboard/reports':
        return renderReportsTab();
      case '/enhancedlandlorddashboard/maintenance':
        navigate('/enhancedlandlorddashboard/maintenance');
        return null;
      default:
        return renderDashboardContent();
    }
  };

  const renderPropertiesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building className="h-6 w-6 text-ocean-blue" />
          <h2 className="text-xl font-bold">Manage Properties</h2>
        </div>
        <Button onClick={() => navigate('/enhancedlandlorddashboard/add-property')} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Property
        </Button>
      </div>
      {renderPropertiesGrid()}
    </div>
  );

  const renderApplicationsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-6 w-6 text-ocean-blue" />
        <h2 className="text-xl font-bold">Applications</h2>
      </div>
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Rental Applications</h3>
          <p className="text-muted-foreground">Manage tenant applications for your properties</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderTenantsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-6 w-6 text-ocean-blue" />
        <h2 className="text-xl font-bold">Active Tenants</h2>
      </div>
      {renderTenantsGrid()}
    </div>
  );

  const renderPaymentsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="h-6 w-6 text-ocean-blue" />
        <h2 className="text-xl font-bold">Payments</h2>
      </div>
      <Card>
        <CardContent className="p-8 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Payment Management</h3>
          <p className="text-muted-foreground">Track rent payments and financial reports</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderReportsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-6 w-6 text-ocean-blue" />
        <h2 className="text-xl font-bold">Reports & Analytics</h2>
      </div>
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Financial Reports</h3>
          <p className="text-muted-foreground">View detailed analytics and financial reports</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderDashboardContent = () => {
    if (loading || metricsLoading) {
      return (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-muted animate-pulse h-24 rounded-lg"></div>
            ))}
          </div>
          <div className="bg-muted animate-pulse h-96 rounded-lg"></div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Metrics Grid */}
        <MetricsGrid metrics={metrics} loading={metricsLoading} />

        {/* Properties Section */}
        <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-ocean-blue">Your Properties</CardTitle>
              <Button onClick={() => navigate('/enhancedlandlorddashboard/add-property')} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Property
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderPropertiesGrid()}
          </CardContent>
        </Card>
        {/* Tenants Section */}
        <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft">
          <CardHeader>
            <CardTitle className="text-xl text-ocean-blue flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderTenantsGrid()}
          </CardContent>
        </Card>

      </div>
    );
  };

  const renderPropertiesGrid = () => {
    if (properties.length === 0) {
      return (
        <div className="text-center py-8">
          <Home className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Properties Yet</h3>
          <p className="text-muted-foreground mb-4">Start building your rental portfolio</p>
          <Button onClick={() => navigate('/enhancedlandlorddashboard/add-property')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Property
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((property) => (
          <Card 
            key={property.id}
            className="cursor-pointer rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft transition-all duration-300 transform-gpu motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-pop motion-safe:focus-within:-translate-y-0.5 motion-safe:focus-within:shadow-pop"
            onClick={() => navigate(`/manage-property/${property.id}`)}
          >
            <div className="aspect-video relative overflow-hidden rounded-t-lg bg-gradient-to-br from-ocean-blue/[0.1] to-success-green/[0.1]">
              {property.images.length > 0 ? (
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="h-12 w-12 text-ocean-blue/40" />
                </div>
              )}
            </div>
            
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-sm truncate flex-1">
                    {property.title}
                  </h3>
                  <Badge variant={getStatusBadgeVariant(property.status)} className="text-xs ml-2">
                    {property.status}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground truncate">
                  {property.location}
                </p>
                
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-bold text-ocean-blue">
                    R{property.price.toLocaleString()}/month
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={(e) => {
                      e.stopPropagation();
                      setCurrentTab('/enhancedlandlorddashboard/applications');
                    }}>
                      <FileText className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={(e) => {
                      e.stopPropagation();
                      setCurrentTab('/enhancedlandlorddashboard/messages');
                    }}>
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/manage-property/${property.id}`);
                    }}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderTenantsGrid = () => {
    if (tenants.length === 0) {
      return (
        <div className="text-center py-8">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Tenants</h3>
          <p className="text-muted-foreground">Your tenants will appear here once you have active leases</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {tenants.map((tenant) => (
          <div 
            key={tenant.id}
            className="flex items-center justify-between p-4 rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft transition-all duration-300 transform-gpu motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-pop"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-success-green to-success-green-glow rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold">{tenant.name}</h4>
                <p className="text-sm text-muted-foreground">{tenant.property_title}</p>
                <p className="text-xs text-success-green font-medium">
                  R{tenant.monthly_rent.toLocaleString()}/month
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={getPaymentStatusBadgeVariant(tenant.payment_status)}>
                {tenant.payment_status}
              </Badge>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setCurrentTab('/messages')}>
                  <MessageSquare className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/tenant-profile/${tenant.id}`)}>
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    // Update the URL when changing tabs
    if (tab !== '/enhancedlandlorddashboard') {
      navigate(tab);
    } else {
      navigate('/enhancedlandlorddashboard');
    }
  };

  return (
    <EnhancedDashboardLayout 
      title="Rental Manager" 
      currentTab={currentTab}
      onTabChange={handleTabChange}
    >
      {renderTabContent()}
    </EnhancedDashboardLayout>
  );
}