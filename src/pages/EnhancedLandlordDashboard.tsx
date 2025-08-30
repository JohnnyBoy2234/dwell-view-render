import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLandlordMetrics } from '@/hooks/useLandlordMetrics';
import { useLandlordApplications } from '@/hooks/useLandlordApplications';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';
import { MessagesTab } from '@/components/dashboard/MessagesTab';
import { MetricsGrid } from '@/components/dashboard/landlord/MetricsGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Eye, Plus, Users, MessageSquare, FileText, Building, BarChart3, DollarSign, Calendar, User, Check, X } from 'lucide-react';
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
  const { applications, loading: applicationsLoading, fetchAllApplications, updateApplicationStatus } = useLandlordApplications();
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
    
    // Fetch applications when on applications tab
    if (path === '/enhancedlandlorddashboard/applications') {
      fetchAllApplications();
    }
  }, [user, isLandlord, navigate, location.pathname, fetchAllApplications]);

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
        return renderMaintenanceTab();
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
        <h2 className="text-xl font-bold">Rental Applications</h2>
        <Badge variant="secondary" className="ml-2">
          {applications.length} applications
        </Badge>
      </div>
      
      {applicationsLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-muted animate-pulse h-24 rounded-lg"></div>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
            <p className="text-muted-foreground mb-4">
              You haven't received any rental applications yet. Applications will appear here once tenants apply for your properties.
            </p>
            <Button onClick={() => navigate('/enhancedlandlorddashboard/properties')}>
              <Building className="h-4 w-4 mr-2" />
              View Properties
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-ocean-blue to-ocean-blue-dark rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold">
                          {application.tenant_profile?.display_name || 'Unknown Tenant'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {application.properties?.title || 'Unknown Property'} • {application.properties?.location || 'Unknown Location'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Applied {new Date(application.created_at).toLocaleDateString()}
                      </span>
                      <Badge 
                        variant={application.status === 'pending' ? 'secondary' : application.status === 'accepted' ? 'default' : 'destructive'}
                      >
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                      </Badge>
                    </div>
                    
                    {application.screening_details && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Income:</span>
                          <p className="font-medium">R{application.screening_details.net_monthly_income?.toLocaleString() || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Employment:</span>
                          <p className="font-medium">{application.screening_details.employment_status || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Job Title:</span>
                          <p className="font-medium">{application.screening_details.job_title || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Company:</span>
                          <p className="font-medium">{application.screening_details.company_name || 'N/A'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/application/${application.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    {application.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateApplicationStatus(application.id, 'accepted')}
                          className="bg-success-green hover:bg-success-green-dark"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateApplicationStatus(application.id, 'declined')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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

  const renderMaintenanceTab = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Building className="h-6 w-6 text-ocean-blue" />
        <h2 className="text-xl font-bold">Maintenance Requests</h2>
      </div>
      <Card>
        <CardContent className="p-8 text-center">
          <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Maintenance Management</h3>
          <p className="text-muted-foreground">Track and manage maintenance requests from tenants</p>
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