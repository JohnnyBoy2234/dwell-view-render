import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Home, 
  List, 
  Users, 
  FileText, 
  CreditCard, 
  Wrench,
  Package,
  ArrowLeft,
  ExternalLink,
  Mail,
  Link,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar
} from 'lucide-react';
import { Property } from '@/types/dashboard';
import { LeaseSigningDialog } from '@/components/lease/LeaseSigningDialog';
import { LeaseCreationWizard } from '@/components/lease/LeaseCreationWizard';
import { LeaseManagement } from '@/components/lease/LeaseManagement';
import { ApplicationsTab } from '@/components/property/ApplicationsTab';
import { PaymentsTab } from '@/components/property/PaymentsTab';
import { InventoryTab } from '@/components/property/InventoryTab';
import { ViewingSlotsManager } from '@/components/viewing/ViewingSlotsManager';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  priority: string;
  created_at: string;
  tenant_id: string;
  notes?: string;
}

export default function PropertyManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLandlord } = useAuth();
  const { toast } = useToast();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'overview');
  const [emailForInvite, setEmailForInvite] = useState('');
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [showLeaseDialog, setShowLeaseDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<{ id: string; name: string } | null>(null);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  useEffect(() => {
    if (!user || !isLandlord) {
      navigate('/enhancedlandlorddashboard');
      return;
    }
    
    fetchProperty();
    fetchMaintenanceRequests();
  }, [user, isLandlord, id]);

  const fetchProperty = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .eq('landlord_id', user?.id)
        .single();

      if (error) throw error;
      setProperty(data);
    } catch (error) {
      console.error('Error fetching property:', error);
      toast({
        title: "Error",
        description: "Failed to load property details",
        variant: "destructive",
      });
      navigate('/enhancedlandlorddashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceRequests = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('property_id', id)
        .eq('landlord_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaintenanceRequests(data || []);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
    }
  };

  const handleSendInvite = async () => {
    if (!emailForInvite || !property) return;
    
    // In a real implementation, this would send an email invitation
    toast({
      title: "Invitation Sent",
      description: `Application link sent to ${emailForInvite}`,
    });
    setEmailForInvite('');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available':
        return 'default';
      case 'rented':
        return 'secondary';
      case 'maintenance':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getMaintenanceStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleStartLease = (tenantId: string, tenantName: string) => {
    setSelectedTenant({ id: tenantId, name: tenantName });
    setShowLeaseDialog(true);
  };

  const handleLeaseDialogClose = () => {
    setShowLeaseDialog(false);
    setSelectedTenant(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading property...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Property not found</h1>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-ocean-blue/[0.04] via-ocean-blue/[0.02] to-success-green/[0.05]">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none absolute -z-10 inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-brand-blue to-brand-green blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-gradient-to-tr from-success-green to-ocean-blue blur-3xl opacity-10"></div>
        <div className="ui-noise"></div>
      </div>
      {/* Content wrapper */}
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/enhancedlandlorddashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        {/* Property Header */}
        <div className="flex items-start gap-4 p-6 rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft transition-all duration-300 transform-gpu hover:-translate-y-0.5 hover:shadow-pop">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-ocean-blue to-success-green text-white shadow-soft ring-1 ring-white/20">
            <Home className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{property.title}</h1>
            <p className="text-muted-foreground">{property.location}</p>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant={getStatusBadgeVariant(property.status)}>
                {property.status.toUpperCase()}
              </Badge>
              <span className="text-lg font-semibold">R{property.price.toLocaleString()}/month</span>
            </div>
          </div>
        </div>

      {/* Tabs Navigation - Mobile-First Responsive */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Mobile: Stacked dashboard cards (no slider) */}
        <div className="md:hidden space-y-4">
          {/* Lease Management */}
          <LeaseManagement propertyId={property.id} />

          {/* Messages */}
          <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-xl bg-ocean-blue/10 text-ocean-blue">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Messages</CardTitle>
                <CardDescription>Recent</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="rounded-2xl bg-muted p-3 text-sm text-foreground/80">Thanks for letting me know, I’ll arrange for someone to come by and fix it.</div>
              <div className="rounded-2xl bg-gradient-to-r from-ocean-blue to-success-green text-white p-3 text-sm ml-auto w-fit">Thanks for letting me know, I’ll arrange for someone to come by and fix it.</div>
              <div className="mt-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/messages')}>Open Messages</Button>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance */}
          <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-xl bg-ocean-blue/10 text-ocean-blue">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Maintenance</CardTitle>
                <CardDescription>Active Request</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={40} className="h-2" />
              <div className="flex items-center justify-between text-sm">
                <div className="font-medium">Leaking sink</div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/messages')}>Chat</Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('maintenance')}>View Requests</Button>
                <Button size="sm" className="bg-ocean-blue hover:bg-ocean-blue-dark text-white" onClick={() => setActiveTab('maintenance')}>New Request</Button>
              </div>
            </CardContent>
          </Card>
          {/* Applications */}
          <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-xl bg-ocean-blue/10 text-ocean-blue">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Applications</CardTitle>
                <CardDescription>Manage applicants</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('applications')}>View Applications</Button>
                <Button size="sm" className="bg-ocean-blue hover:bg-ocean-blue-dark text-white" onClick={() => setActiveTab('applications')}>Invite Tenant</Button>
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-xl bg-ocean-blue/10 text-ocean-blue">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Payments</CardTitle>
                <CardDescription>Collection & history</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('payments')}>Details</Button>
                <Button size="sm" className="bg-ocean-blue hover:bg-ocean-blue-dark text-white" onClick={() => setActiveTab('payments')}>Set Up</Button>
              </div>
            </CardContent>
          </Card>

          {/* Listing */}
          <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-xl bg-ocean-blue/10 text-ocean-blue">
                <List className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Listing</CardTitle>
                <CardDescription>Advertise your property</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/property/${property.id}`)}>View Listing</Button>
                <Button size="sm" className="bg-ocean-blue hover:bg-ocean-blue-dark text-white" onClick={() => navigate('/list-property', { state: { editProperty: property } })}>Edit Listing</Button>
              </div>
            </CardContent>
          </Card>

          {/* Viewings */}
          <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-xl bg-ocean-blue/10 text-ocean-blue">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Viewings</CardTitle>
                <CardDescription>Manage slots</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('viewings')}>View Slots</Button>
                <Button size="sm" className="bg-ocean-blue hover:bg-ocean-blue-dark text-white" onClick={() => setActiveTab('viewings')}>New Slot</Button>
              </div>
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-xl bg-ocean-blue/10 text-ocean-blue">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Inventory</CardTitle>
                <CardDescription>Track items</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('inventory')}>Open Inventory</Button>
                <Button size="sm" className="bg-ocean-blue hover:bg-ocean-blue-dark text-white" onClick={() => setActiveTab('inventory')}>Add Item</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop: Grid layout */}
        <div className="hidden md:block">
          <TabsList className="grid w-full grid-cols-8 h-12 rounded-2xl bg-gradient-to-r from-ocean-blue/10 via-background/60 to-success-green/10 dark:from-ocean-blue/10 dark:via-slate-900/50 dark:to-success-green/10 backdrop-blur-md border border-white/20 dark:border-white/10 ring-1 ring-black/5 shadow-soft">
            <TabsTrigger value="overview" className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue/40 focus-visible:ring-offset-2 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Home className="h-4 w-4" />
              <span className="hidden lg:inline">Overview</span>
              <span className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-ocean-blue to-success-green opacity-0 scale-x-50 transition-all duration-300 data-[state=active]:opacity-100 data-[state=active]:scale-x-100" />
            </TabsTrigger>
            <TabsTrigger value="listing" className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue/40 focus-visible:ring-offset-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-ocean-blue data-[state=active]:to-success-green data-[state=active]:text-white data-[state=active]:shadow-sm">
              <List className="h-4 w-4" />
              <span className="hidden lg:inline">Listing</span>
              <span className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-ocean-blue to-success-green opacity-0 scale-x-50 transition-all duration-300 data-[state=active]:opacity-100 data-[state=active]:scale-x-100" />
            </TabsTrigger>
            <TabsTrigger value="viewings" className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue/40 focus-visible:ring-offset-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-ocean-blue data-[state=active]:to-success-green data-[state=active]:text-white data-[state=active]:shadow-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden lg:inline">Viewing</span>
              <span className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-ocean-blue to-success-green opacity-0 scale-x-50 transition-all duration-300 data-[state=active]:opacity-100 data-[state=active]:scale-x-100" />
            </TabsTrigger>
            <TabsTrigger value="applications" className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue/40 focus-visible:ring-offset-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-ocean-blue data-[state=active]:to-success-green data-[state=active]:text-white data-[state=active]:shadow-sm">
              <Users className="h-4 w-4" />
              <span className="hidden lg:inline">Applications</span>
              <span className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-ocean-blue to-success-green opacity-0 scale-x-50 transition-all duration-300 data-[state=active]:opacity-100 data-[state=active]:scale-x-100" />
            </TabsTrigger>
            <TabsTrigger value="leases" className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue/40 focus-visible:ring-offset-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-ocean-blue data-[state=active]:to-success-green data-[state=active]:text-white data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden lg:inline">Leases</span>
              <span className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-ocean-blue to-success-green opacity-0 scale-x-50 transition-all duration-300 data-[state=active]:opacity-100 data-[state=active]:scale-x-100" />
            </TabsTrigger>
            <TabsTrigger value="payments" className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue/40 focus-visible:ring-offset-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-ocean-blue data-[state=active]:to-success-green data-[state=active]:text-white data-[state=active]:shadow-sm">
              <CreditCard className="h-4 w-4" />
              <span className="hidden lg:inline">Payments</span>
              <span className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-ocean-blue to-success-green opacity-0 scale-x-50 transition-all duration-300 data-[state=active]:opacity-100 data-[state=active]:scale-x-100" />
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue/40 focus-visible:ring-offset-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-ocean-blue data-[state=active]:to-success-green data-[state=active]:text-white data-[state=active]:shadow-sm">
              <Wrench className="h-4 w-4" />
              <span className="hidden lg:inline">Maintenance</span>
              <span className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-ocean-blue to-success-green opacity-0 scale-x-50 transition-all duration-300 data-[state=active]:opacity-100 data-[state=active]:scale-x-100" />
            </TabsTrigger>
            <TabsTrigger value="inventory" className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue/40 focus-visible:ring-offset-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-ocean-blue data-[state=active]:to-success-green data-[state=active]:text-white data-[state=active]:shadow-sm">
              <Package className="h-4 w-4" />
              <span className="hidden lg:inline">Inventory</span>
              <span className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-ocean-blue to-success-green opacity-0 scale-x-50 transition-all duration-300 data-[state=active]:opacity-100 data-[state=active]:scale-x-100" />
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab (hidden on mobile) */}
        <TabsContent value="overview" className="hidden md:block space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Summary Cards */}
              <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft transition-all duration-300 transform-gpu hover:-translate-y-0.5 hover:shadow-pop hover:bg-white/70 dark:hover:bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">Upcoming payments will appear here</p>
                  <Button variant="outline" size="sm" className="flex items-center gap-2 border-transparent bg-gradient-to-r from-ocean-blue/10 to-success-green/10 hover:from-ocean-blue/20 hover:to-success-green/20">
                    Details <ExternalLink className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft transition-all duration-300 transform-gpu hover:-translate-y-0.5 hover:shadow-pop hover:bg-white/70 dark:hover:bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Leases
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">Active leases will appear here</p>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    Details <ExternalLink className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft transition-all duration-300 transform-gpu hover:-translate-y-0.5 hover:shadow-pop hover:bg-white/70 dark:hover:bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5" />
                    Listing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">Summary of current listing status</p>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    Details <ExternalLink className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Next Steps Card */}
            <div>
              <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft transition-all duration-300 transform-gpu hover:-translate-y-0.5 hover:shadow-pop hover:bg-white/70 dark:hover:bg-slate-900/60">
                <CardHeader>
                  <CardTitle>Next steps</CardTitle>
                  <CardDescription>Get your property ready for tenants</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-between"
                    onClick={() => setShowLeaseDialog(true)}
                  >
                    Upload a lease
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between"
                    onClick={() => setActiveTab('payments')}
                  >
                    Set up payments
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Listing Tab (hidden on mobile) */}
        <TabsContent value="listing" className="hidden md:block space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft">
            <CardHeader>
              <CardTitle>Listing Status</CardTitle>
              <CardDescription>Manage your rental advertisement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Current Status</h3>
                  <Badge variant={property.status === 'available' ? 'default' : 'secondary'}>
                    {property.status === 'available' ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Listing setup</span>
                  <span className="text-sm text-muted-foreground">100%</span>
                </div>
                <Progress value={100} className="h-2" />
                <p className="text-sm text-muted-foreground mt-1">Setup complete</p>
              </div>
              <div className="flex gap-3">
                <Button 
                  className="flex-1"
                  onClick={() => navigate(`/property/${property.id}`)}
                >
                  {property.status === 'available' ? 'View listing' : 'Activate listing'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/list-property', { state: { editProperty: property } })}
                >
                  Edit listing
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications Tab (hidden on mobile) */}
        <TabsContent value="applications" className="hidden md:block space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <ApplicationsTab 
            propertyId={property.id} 
            onStartLease={handleStartLease}
          />
        </TabsContent>

        {/* Viewings Tab (hidden on mobile) */}
        <TabsContent value="viewings" className="hidden md:block space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <ViewingSlotsManager propertyId={property.id} />
        </TabsContent>

        {/* Leases Tab (hidden on mobile) */}
        <TabsContent value="leases" className="hidden md:block space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <LeaseManagement propertyId={property.id} />
        </TabsContent>

        {/* Payments Tab (hidden on mobile) */}
        <TabsContent value="payments" className="hidden md:block space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <PaymentsTab propertyId={property.id} />
        </TabsContent>

        {/* Maintenance Tab (hidden on mobile) */}
        <TabsContent value="maintenance" className="hidden md:block space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft">
            <CardHeader>
              <CardTitle>Maintenance Requests</CardTitle>
              <CardDescription>Track and manage maintenance for this property</CardDescription>
            </CardHeader>
            <CardContent>
              {maintenanceRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No maintenance requests</h3>
                  <p className="text-muted-foreground">
                    Maintenance requests from tenants will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {maintenanceRequests.map((request) => (
                    <Card key={request.id} className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md ring-1 ring-black/5 shadow-soft transition-all duration-300 transform-gpu hover:-translate-y-0.5 hover:shadow-pop">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getMaintenanceStatusIcon(request.status)}
                              <h4 className="font-semibold">{request.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {request.category}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm mb-2">
                              {request.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{new Date(request.created_at).toLocaleDateString()}</span>
                              <Badge 
                                variant={
                                  request.priority === 'high' ? 'destructive' :
                                  request.priority === 'medium' ? 'default' : 'secondary'
                                }
                                className="text-xs"
                              >
                                {request.priority} priority
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline">
                              {request.status.replace('_', ' ')}
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => navigate(`/maintenance/${request.id}`)}
                              className="bg-ocean-blue hover:bg-ocean-blue-dark text-white"
                            >
                              Respond
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab (hidden on mobile) */}
        <TabsContent value="inventory" className="hidden md:block space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <InventoryTab propertyId={property.id} />
        </TabsContent>
      </Tabs>

      {/* Lease Creation Wizard */}
      {showLeaseDialog && property && (
        <LeaseCreationWizard
          isOpen={showLeaseDialog}
          onClose={handleLeaseDialogClose}
          propertyId={property.id}
          selectedTenant={selectedTenant}
          onLeaseCreated={() => {
            setShowLeaseDialog(false);
            setSelectedTenant(null);
            toast({
              title: "Success",
              description: "Lease created successfully and ready for signing",
            });
          }}
        />
      )}
      </div>
    </div>
  );
}