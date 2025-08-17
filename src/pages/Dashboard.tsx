import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Home, Eye, PenTool } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Property, Tenancy } from '@/types/dashboard';
import { useLandlordNotifications } from '@/hooks/useLandlordNotifications';
import { SignedLeasesList } from '@/components/lease/SignedLeasesList';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  created_at: string;
  property_id: string;
  properties: {
    title: string;
  };
}

interface Application {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  status: string;
  created_at: string;
}

interface PropertyWithCounts extends Property {
  inquiriesCount: number;
  applicationsCount: number;
  activeTenancy?: Tenancy;
}

type PropertyFilter = 'all' | 'for-rent' | 'off-market';

export default function Dashboard() {
  const { user, isLandlord, signOut } = useAuth();
  const [propertiesWithCounts, setPropertiesWithCounts] = useState<PropertyWithCounts[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PropertyFilter>('all');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { notifications, pendingSignatures, markAsRead } = useLandlordNotifications();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!isLandlord) {
      navigate('/tenant-dashboard');
      return;
    }

    fetchData();
  }, [user, isLandlord, navigate]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;

      // Fetch inquiries
      const { data: inquiriesData, error: inquiriesError } = await supabase
        .from('inquiries')
        .select(`
          *,
          properties (
            title
          )
        `)
        .in('property_id', (propertiesData || []).map(p => p.id))
        .order('created_at', { ascending: false });

      if (inquiriesError) throw inquiriesError;
      setInquiries(inquiriesData || []);

      // Fetch applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select('*')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;
      setApplications(applicationsData || []);

      // Fetch tenancies
      const { data: tenanciesData, error: tenanciesError } = await supabase
        .from('tenancies')
        .select(`
          *,
          properties!inner (
            title
          ),
          tenant_profile:profiles!fk_tenancies_tenant (
            display_name,
            user_id
          )
        `)
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (tenanciesError) throw tenanciesError;
      
      // Transform the data to match our interface
      const transformedTenancies = (tenanciesData || []).map((tenancy: any) => ({
        ...tenancy,
        property_title: tenancy.properties?.title || 'Unknown Property',
        tenant_name: tenancy.tenant_profile?.display_name || 'Unknown Tenant',
        tenant_email: '' // We'll need to get this separately if needed
      }));
      
      setTenancies(transformedTenancies);

      // Combine properties with counts and active tenancies
      const propertiesWithCountsData = (propertiesData || []).map(property => {
        const propertyInquiries = (inquiriesData || []).filter(inquiry => inquiry.property_id === property.id);
        const propertyApplications = (applicationsData || []).filter(app => app.property_id === property.id);
        const activeTenancy = transformedTenancies.find(tenancy => 
          tenancy.property_id === property.id && tenancy.status === 'active'
        );

        return {
          ...property,
          inquiriesCount: propertyInquiries.length,
          applicationsCount: propertyApplications.length,
          activeTenancy
        };
      });

      setPropertiesWithCounts(propertiesWithCountsData);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredProperties = propertiesWithCounts.filter(property => {
    switch (filter) {
      case 'for-rent':
        return property.status === 'available';
      case 'off-market':
        return property.status === 'rented' || property.status === 'occupied';
      default:
        return true;
    }
  });

  const getPropertyStatus = (property: PropertyWithCounts) => {
    if (property.status === 'available') return 'For rent';
    if (property.status === 'rented' || property.status === 'occupied') return 'Off-market';
    return property.status;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'For rent':
        return 'default';
      case 'Off-market':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const actions = (
    <Button onClick={() => navigate('/dashboard/add-property')} className="flex items-center gap-2">
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">Add Property</span>
    </Button>
  );

  return (
    <DashboardLayout title="Properties" actions={actions}>
      <div className="space-y-6">{/* Content moved from main div */}

          {/* Notifications for Pending Signatures */}
          {pendingSignatures.length > 0 && (
            <Card className="mb-6 border-2 border-earth-warm/30 bg-gradient-to-br from-earth-light/60 to-white shadow-warm">
              <CardHeader>
                <CardTitle className="text-earth-warm-dark flex items-center gap-2">
                  <PenTool className="h-5 w-5" />
                  Action Required - Lease Signatures Pending
                </CardTitle>
                <CardDescription className="text-earth-warm-dark/80">
                  The following leases have been signed by tenants and are ready for your signature.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingSignatures.map((signature) => (
                    <div key={signature.id} className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-earth-warm/30 shadow-soft">
                      <div>
                        <p className="font-medium">{signature.property_title}</p>
                        <p className="text-sm text-muted-foreground">
                          Tenant: {signature.tenant_name} • Monthly Rent: R{signature.monthly_rent.toLocaleString()}
                        </p>
                        <p className="text-xs text-earth-warm-dark">
                          Signed by tenant on {new Date(signature.tenant_signed_at!).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          navigate(`/landlord-lease-signing/${signature.id}`);
                          markAsRead(signature.id);
                        }}
                        className="bg-gradient-to-r from-earth-warm to-earth-warm-dark hover:from-earth-warm-dark hover:to-earth-warm shadow-soft"
                      >
                        Sign & Finalize
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Property Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className="rounded-full text-xs sm:text-sm"
            size="sm"
          >
            All ({propertiesWithCounts.length})
          </Button>
          <Button
            variant={filter === 'for-rent' ? 'default' : 'outline'}
            onClick={() => setFilter('for-rent')}
            className="rounded-full text-xs sm:text-sm"
            size="sm"
          >
            For rent ({propertiesWithCounts.filter(p => p.status === 'available').length})
          </Button>
          <Button
            variant={filter === 'off-market' ? 'default' : 'outline'}
            onClick={() => setFilter('off-market')}
            className="rounded-full text-xs sm:text-sm"
            size="sm"
          >
            Off-market ({propertiesWithCounts.filter(p => p.status === 'rented' || p.status === 'occupied').length})
          </Button>
        </div>

        {/* Properties Table - Mobile responsive */}
        {propertiesWithCounts.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Properties Yet</CardTitle>
              <CardDescription>Get started by adding your first property</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <Button onClick={() => navigate('/dashboard/add-property')} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Property
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table View */}
            <Card className="shadow-medium border-ocean-blue/20 hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>August rent</TableHead>
                    <TableHead>Potential tenants</TableHead>
                    <TableHead>Lease</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.map((property) => (
                    <TableRow
                      key={property.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/manage-property/${property.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/manage-property/${property.id}`);
                        }
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-blue-500 rounded-lg flex items-center justify-center">
                            <Home className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="font-medium">{property.title}</div>
                            <Badge variant={getStatusBadgeVariant(getPropertyStatus(property))} className="mt-1">
                              {getPropertyStatus(property)}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {property.status === 'available' ? (
                          <span className="font-medium">R{property.price.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{property.inquiriesCount} inquiries</div>
                          <div className="text-muted-foreground">{property.applicationsCount} applications</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {property.activeTenancy?.lease_status ? (
                          <Badge variant="outline">
                            {property.activeTenancy.lease_status === 'signed' ? 'Active' : 
                             property.activeTenancy.lease_status === 'pending' ? 'Pending' : 'Draft'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/manage-property/${property.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Mobile Card View */}
            <div className="space-y-4 lg:hidden">
              {filteredProperties.map((property) => (
                <Card 
                  key={property.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/manage-property/${property.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Home className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{property.title}</div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <Badge variant={getStatusBadgeVariant(getPropertyStatus(property))} className="text-xs">
                              {getPropertyStatus(property)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/manage-property/${property.id}`);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Rent:</span>
                        <div className="font-medium">
                          {property.status === 'available' ? (
                            `R${property.price.toLocaleString()}`
                          ) : (
                            '-'
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Interest:</span>
                        <div className="font-medium">
                          {property.inquiriesCount} inquiries
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {property.applicationsCount} applications
                        </div>
                      </div>
                    </div>
                    
                    {property.activeTenancy?.lease_status && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-muted-foreground text-sm">Lease: </span>
                        <Badge variant="outline" className="text-xs">
                          {property.activeTenancy.lease_status === 'signed' ? 'Active' : 
                           property.activeTenancy.lease_status === 'pending' ? 'Pending' : 'Draft'}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
        {/* Signed Leases */}
        <div className="mt-8">
          <SignedLeasesList role="landlord" />
        </div>
      </div>
    </DashboardLayout>
  );
}