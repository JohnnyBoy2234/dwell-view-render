import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLandlordMetrics } from '@/hooks/useLandlordMetrics';
import { useLandlordApplications, ApplicationWithTenant } from '@/hooks/useLandlordApplications';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';
import { MessagesTab } from '@/components/dashboard/MessagesTab';
import { MetricsGrid } from '@/components/dashboard/landlord/MetricsGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Home, Eye, Plus, Users, MessageSquare, FileText, Building, BarChart3, DollarSign, Calendar, User, Check, X, AlertTriangle, Wrench, Play, Save, Trash2 } from 'lucide-react';
import { LandlordLeasesList } from '@/components/lease/LandlordLeasesList';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BUILD_TAG } from '@/version';
import { MaintenanceRequest } from '@/types/maintenance';

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


interface AdditionalCost {
  id?: string;
  description: string;
  amount: number;
  tenant_id?: string;
  property_id?: string;
}

interface LandlordDetails {
  id?: string;
  name: string;
  address: string;
  contact: string;
  vatNumber?: string;
  bank: string;
  accountHolder: string;
  accountNumber: string;
  branchCode: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  landlordDetails: LandlordDetails;
  tenantDetails: {
    name: string;
    address: string;
    contact: string;
  };
  propertyDetails: {
    title: string;
    address: string;
  };
  items: {
    description: string;
    amount: number;
  }[];
  totalAmount: number;
}

export default function EnhancedLandlordDashboard() {
  const { user, isLandlord, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { loading: metricsLoading, metrics } = useLandlordMetrics();
  const { applications, loading: applicationsLoading, fetchAllApplications, updateApplicationStatus } = useLandlordApplications();
  const [currentTab, setCurrentTab] = useState(() => {
    // Initialize currentTab from the current URL path
    const path = location.pathname;
    if (path !== '/enhancedlandlorddashboard' && path.startsWith('/enhancedlandlorddashboard')) {
      return path;
    }
    return '/enhancedlandlorddashboard';
  });
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  
  const [properties, setProperties] = useState<PropertyWithTenant[]>([]);
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Invoice costs state
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([]);
  const [invoiceSchedule, setInvoiceSchedule] = useState<string>('7');
  const [addCostModalOpen, setAddCostModalOpen] = useState(false);
  const [newCost, setNewCost] = useState<AdditionalCost>({ description: '', amount: 0 });
  
  // Landlord details state
  const [landlordDetails, setLandlordDetails] = useState<LandlordDetails>({
    name: '',
    address: '',
    contact: '',
    vatNumber: '',
    bank: '',
    accountHolder: '',
    accountNumber: '',
    branchCode: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);

  useEffect(() => {
    // Visible in production console to verify current deployed build
    // eslint-disable-next-line no-console
    console.log('[EnhancedLandlordDashboard] Build:', BUILD_TAG);
    if (authLoading) {
      return;
    }
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!isLandlord) {
      navigate('/enhancedtenantdashboard');
      return;
    }
    
    // Sync currentTab with the current URL path
    const path = location.pathname;
    if (path !== '/enhancedlandlorddashboard' && path.startsWith('/enhancedlandlorddashboard')) {
      setCurrentTab(path);
    }

    fetchAllApplications();
    fetchProperties();
    fetchTenants();
    fetchMaintenanceRequests();
    fetchLandlordSettings();
    fetchAdditionalCosts();
    fetchInvoiceScheduleSettings();
  }, [authLoading, user, isLandlord, navigate, location.pathname, fetchAllApplications]);

  // Add a separate useEffect to handle URL changes and sync currentTab
  useEffect(() => {
    const path = location.pathname;
    console.log('[Dashboard] Current path:', path, 'Current tab:', currentTab);
    
    if (path !== '/enhancedlandlorddashboard' && path.startsWith('/enhancedlandlorddashboard')) {
      if (currentTab !== path) {
        console.log('[Dashboard] Setting current tab to:', path);
        setCurrentTab(path);
      }
    }
  }, [location.pathname]);

  // Add a useEffect to handle tab-specific data fetching when currentTab changes
  useEffect(() => {
    if (currentTab === '/enhancedlandlorddashboard/applications') {
      try {
        fetchAllApplications();
      } catch (error) {
        console.log('Error calling fetchAllApplications:', error);
        // Applications will show sample data from the hook
      }
    }
    if (currentTab === '/enhancedlandlorddashboard/maintenance') {
      try {
        fetchMaintenanceRequests();
      } catch (error) {
        console.log('Error calling fetchMaintenanceRequests:', error);
        // Maintenance will show sample data from the function
      }
    }
    if (currentTab === '/enhancedlandlorddashboard/reports') {
      try {
        fetchLandlordSettings();
        fetchAdditionalCosts();
        fetchInvoiceScheduleSettings();
      } catch (error) {
        console.log('Error loading reports data:', error);
      }
    }
  }, [currentTab, fetchAllApplications]);

  // Fetch data on component mount
  useEffect(() => {
    if (user) {
      fetchProperties();
      fetchTenants();
    }
  }, [user]);

  const fetchProperties = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch real properties from Supabase
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (propertiesError) {
        console.error('Error fetching properties:', propertiesError);
        setProperties([]);
      } else {
        const transformedProperties = (propertiesData || []).map(prop => ({
          id: prop.id,
          title: prop.title,
          location: prop.location,
          images: prop.images || [],
          price: prop.price,
          status: prop.status
        }));
        setProperties(transformedProperties);
      }
    } catch (error) {
      console.error('Error in fetchProperties:', error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    if (!user) return;

    try {
      // Fetch real tenants from tenancies and profiles
      const { data: tenanciesData, error: tenanciesError } = await supabase
        .from('tenancies')
        .select(`
          id,
          tenant_id,
          monthly_rent,
          end_date,
          status,
          properties(title),
          tenant_profiles:profiles!tenant_id(display_name)
        `)
        .eq('landlord_id', user.id)
        .eq('status', 'active');

      if (tenanciesError) {
        console.error('Error fetching tenants:', tenanciesError);
        setTenants([]);
      } else {
        const transformedTenants = (tenanciesData || []).map((tenancy: any) => ({
          id: tenancy.tenant_id,
          name: tenancy.tenant_profiles?.display_name || 'Unknown Tenant',
          property_title: tenancy.properties?.title || 'Unknown Property',
          monthly_rent: tenancy.monthly_rent,
          payment_status: 'pending' as 'paid' | 'pending' | 'overdue',
          lease_end_date: tenancy.end_date
        }));
        setTenants(transformedTenants);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceRequests = async () => {
    if (!user) return;
    
    setLoadingMaintenance(true);
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching maintenance requests:', error);
        setMaintenanceRequests([]);
        return;
      }
      
      // Transform the data to match MaintenanceRequest interface
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title || item.description || 'Maintenance Request',
        description: item.description || item.title || 'No description provided',
        property_id: item.property_id,
        tenant_id: item.tenant_id,
        priority: item.priority || 'medium',
        category: item.category || 'general',
        status: item.status || 'submitted',
        estimated_cost: item.estimated_cost || null,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
        landlord_id: item.landlord_id || user.id,
      }));
      
      setMaintenanceRequests(transformedData as MaintenanceRequest[]);
    } catch (error: any) {
      console.error('Error fetching maintenance requests:', error);
      setMaintenanceRequests([]);
    } finally {
      setLoadingMaintenance(false);
    }
  };

  const updateMaintenanceStatus = async (requestId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({ status })
        .eq('id', requestId)
        .eq('landlord_id', user?.id);

      if (error) {
        console.log('Error updating maintenance request:', error);
        throw error;
      }

      // Refresh maintenance requests
      await fetchMaintenanceRequests();
      
      toast({
        title: "Success",
        description: `Maintenance request ${status === 'in_progress' ? 'started' : 'completed'} successfully`,
      });

      return true;
    } catch (error: any) {
      console.error('Error updating maintenance request:', error);
      toast({
        title: "Error",
        description: "Failed to update maintenance request status",
        variant: "destructive",
      });
      return false;
    }
  };

  // Invoice costs handler functions
  const handleAddCost = async () => {
    if (!newCost.description.trim() || newCost.amount <= 0) {
      toast({
        title: "Invalid Cost",
        description: "Please enter a valid description and amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const cost: AdditionalCost = {
        id: Date.now().toString(),
        description: newCost.description.trim(),
        amount: newCost.amount,
      };

      const updatedCosts = [...additionalCosts, cost];
      setAdditionalCosts(updatedCosts);
      
      // Save to localStorage until database migration is applied
      localStorage.setItem('additionalCosts', JSON.stringify(updatedCosts));
      
      setNewCost({ description: '', amount: 0 });
      setAddCostModalOpen(false);
      
      toast({
        title: "Cost Added",
        description: "Additional cost has been added and saved successfully",
      });
    } catch (error) {
      console.error('Error saving additional cost:', error);
      toast({
        title: "Error",
        description: "Failed to save additional cost",
        variant: "destructive",
      });
    }
  };

  const handleRemoveCost = async (index: number) => {
    try {
      const updatedCosts = additionalCosts.filter((_, i) => i !== index);
      setAdditionalCosts(updatedCosts);
      
      // Save to localStorage until database migration is applied
      localStorage.setItem('additionalCosts', JSON.stringify(updatedCosts));
      
      toast({
        title: "Cost Removed",
        description: "Additional cost has been removed",
      });
    } catch (error) {
      console.error('Error removing additional cost:', error);
      toast({
        title: "Error",
        description: "Failed to remove additional cost",
        variant: "destructive",
      });
    }
  };

  const handleSaveInvoiceSettings = async () => {
    try {
      // For now, just save to localStorage until database migration is applied
      localStorage.setItem('invoiceSchedule', invoiceSchedule);
      
      toast({
        title: "Settings Saved",
        description: `Invoice will be sent ${invoiceSchedule === '7' ? '1 week' : invoiceSchedule === '3' ? '3 days' : '1 day'} before due date`,
      });
    } catch (error) {
      console.error('Error saving invoice schedule settings:', error);
      toast({
        title: "Settings Saved",
        description: `Invoice will be sent ${invoiceSchedule === '7' ? '1 week' : invoiceSchedule === '3' ? '3 days' : '1 day'} before due date`,
      });
    }
  };

  // Supabase fetch functions
  const fetchLandlordSettings = async () => {
    if (!user) return;
    
    try {
      // Use localStorage as fallback until database migration is applied
      const saved = localStorage.getItem('landlordDetails');
      if (saved) {
        setLandlordDetails(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error fetching landlord settings:', error);
    }
  };

  const fetchAdditionalCosts = async () => {
    if (!user) return;
    
    try {
      // Use localStorage as fallback until database migration is applied
      const saved = localStorage.getItem('additionalCosts');
      if (saved) {
        setAdditionalCosts(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error fetching additional costs:', error);
    }
  };

  const fetchInvoiceScheduleSettings = async () => {
    if (!user) return;
    
    try {
      // Use localStorage as fallback until database migration is applied
      const saved = localStorage.getItem('invoiceSchedule');
      if (saved) {
        setInvoiceSchedule(saved);
      }
    } catch (error) {
      console.error('Error fetching invoice schedule settings:', error);
    }
  };

  const handleSaveLandlordSettings = async () => {
    if (!user) return;
    
    try {
      // Save to localStorage until database migration is applied
      localStorage.setItem('landlordDetails', JSON.stringify(landlordDetails));

      toast({
        title: "Settings Saved",
        description: "Landlord details have been saved successfully",
      });
    } catch (error) {
      console.error('Error saving landlord settings:', error);
      toast({
        title: "Error",
        description: "Failed to save landlord settings",
        variant: "destructive",
      });
    }
  };

  const handleGenerateInvoice = async () => {
    setGeneratingInvoice(true);
    try {
      // Validate landlord details
      if (!landlordDetails.name.trim()) {
        toast({
          title: "Missing Information",
          description: "Please save landlord details before generating invoice",
          variant: "destructive",
        });
        return;
      }

      // For demo purposes, use first tenant and property
      if (tenants.length === 0 || properties.length === 0) {
        toast({
          title: "No Data Available",
          description: "No tenants or properties found to generate invoice",
          variant: "destructive",
        });
        return;
      }

      const tenant = tenants[0];
      const property = properties[0];

      // Generate invoice
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const invoice: Invoice = {
        id: `INV-${Date.now()}`,
        invoiceNumber,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        landlordDetails,
        tenantDetails: {
          name: tenant.name,
          address: property.location,
          contact: tenant.id, // In real app, would have tenant contact info
        },
        propertyDetails: {
          title: property.title,
          address: property.location,
        },
        items: [
          {
            description: "Monthly Rent",
            amount: tenant.monthly_rent,
          },
          ...additionalCosts.map(cost => ({
            description: cost.description,
            amount: cost.amount,
          })),
        ],
        totalAmount: tenant.monthly_rent + additionalCosts.reduce((sum, cost) => sum + cost.amount, 0),
      };

      // Save invoice to localStorage until database migration is applied
      try {
        const savedInvoices = JSON.parse(localStorage.getItem('savedInvoices') || '[]');
        savedInvoices.push(invoice);
        localStorage.setItem('savedInvoices', JSON.stringify(savedInvoices));
      } catch (error) {
        console.error('Error saving invoice to localStorage:', error);
        // Continue with preview even if save fails
      }

      setGeneratedInvoice(invoice);
      setInvoicePreviewOpen(true);

      toast({
        title: "Invoice Generated",
        description: `Invoice ${invoice.invoiceNumber} has been generated and saved successfully`,
      });
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to generate invoice",
        variant: "destructive",
      });
    } finally {
      setGeneratingInvoice(false);
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

  const handleDownloadApplicationDocument = async (documentId: string, suggestedName?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('landlord-get-document-url', {
        body: { document_id: documentId }
      });
      if (error || !data?.url) throw error || new Error('No download URL');

      const filename = suggestedName || 'document';
      const joiner = data.url.includes('?') ? '&' : '?';
      const downloadUrl = `${data.url}${joiner}download=${encodeURIComponent(filename)}`;

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.setAttribute('download', filename);
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      toast({ title: 'Download failed', description: e.message || 'Unable to download document', variant: 'destructive' });
    }
  };

  const renderTabContent = () => {
    console.log('[Dashboard] Rendering tab content for:', currentTab);
    
    switch (currentTab) {
      case '/enhancedlandlorddashboard/messages':
        console.log('[Dashboard] Rendering messages tab');
        return renderMessagesTab();
      case '/enhancedlandlorddashboard/properties':
        console.log('[Dashboard] Rendering properties tab');
        return renderPropertiesTab();
      case '/enhancedlandlorddashboard/applications':
        console.log('[Dashboard] Rendering applications tab');
        return renderApplicationsTab();
      case '/enhancedlandlorddashboard/leases':
        return renderLeasesTab();
      case '/enhancedlandlorddashboard/tenants':
        console.log('[Dashboard] Rendering tenants tab');
        return renderTenantsTab();
      case '/enhancedlandlorddashboard/payments':
        console.log('[Dashboard] Rendering payments tab');
        return renderPaymentsTab();
      case '/enhancedlandlorddashboard/reports':
        console.log('[Dashboard] Rendering reports tab');
        return renderReportsTab();
      case '/enhancedlandlorddashboard/maintenance':
        console.log('[Dashboard] Rendering maintenance tab');
        return renderMaintenanceTab();
      default:
        console.log('[Dashboard] Rendering default dashboard content');
        return renderDashboardContent();
    }
  };
  const renderLeasesTab = () => (
    <div className="space-y-6">
      <LandlordLeasesList />
    </div>
  );

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

  const renderMessagesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="h-6 w-6 text-ocean-blue" />
        <h2 className="text-xl font-bold">Messages</h2>
        <Badge variant="secondary" className="ml-2">
          Communication Center
        </Badge>
      </div>
      
      <Card>
        <CardContent className="p-8 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Messages</h3>
          <p className="text-muted-foreground mb-4">
            Communicate with your tenants and manage conversations
          </p>
          <Button onClick={() => navigate('/messages')}>
            <MessageSquare className="h-4 w-2" />
            Open Messages
          </Button>
        </CardContent>
      </Card>
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
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
                        <DialogHeader>
                          <DialogTitle className="text-left">Application Details - {application.tenant_profile?.display_name || 'Tenant'}</DialogTitle>
                          <DialogDescription className="text-left">
                            Screening information and submitted documents
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                          {/* Personal Information */}
                          <div>
                            <h4 className="font-medium mb-3">Personal Information</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                <p>{application.screening_details?.full_name || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                                <p>{application.screening_details?.phone || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">ID Number</label>
                                <p>{application.screening_details?.id_number || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Applied</label>
                                <p>{new Date(application.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>

                          {/* Employment & Income */}
                          {application.screening_details && (
                            <div>
                              <h4 className="font-medium mb-3">Employment & Income</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Employment Status</label>
                                  <p className="capitalize">{application.screening_details.employment_status || 'N/A'}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Job Title</label>
                                  <p>{application.screening_details.job_title || 'N/A'}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                                  <p>{application.screening_details.company_name || 'N/A'}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Net Monthly Income</label>
                                  <p>R{application.screening_details.net_monthly_income ? application.screening_details.net_monthly_income.toLocaleString() : 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Housing History */}
                          {application.screening_details && (
                            <div>
                              <h4 className="font-medium mb-3">Housing History</h4>
                              <div className="grid gap-4">
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Current Address</label>
                                  <p>{application.screening_details.current_address || 'N/A'}</p>
                                </div>
                                {application.screening_details.previous_landlord_name && (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Previous Landlord</label>
                                      <p>{application.screening_details.previous_landlord_name}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Landlord Contact</label>
                                      <p>{application.screening_details.previous_landlord_contact || 'N/A'}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Documents */}
                          {application.documents && application.documents.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-3">Documents</h4>
                              <div className="grid gap-2">
                                {application.documents.map((doc) => (
                                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm truncate max-w-[200px]">{doc.file_path.split('/').pop()}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {doc.document_type === 'id' ? 'ID Document' : 'Income Document'}
                                      </Badge>
                                    </div>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleDownloadApplicationDocument(doc.id, doc.file_path.split('/').pop())}
                                    >
                                      Download
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
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
        <Badge variant="secondary" className="ml-2">
          {tenants.length} tenants
        </Badge>
      </div>
      
      {tenants.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Tenants</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any active tenants yet. Tenants will appear here once they sign leases and move into your properties.
            </p>
            <Button onClick={() => navigate('/enhancedlandlorddashboard/applications')}>
              <FileText className="h-4 w-4 mr-2" />
              View Applications
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tenants.map((tenant) => (
            <Card key={tenant.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-success-green to-success-green-dark rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{tenant.name}</h4>
                        <p className="text-sm text-muted-foreground">{tenant.property_title}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Monthly Rent:</span>
                        <p className="font-medium text-success-green">
                          R{tenant.monthly_rent.toLocaleString()}/month
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Payment Status:</span>
                        <Badge 
                          variant={tenant.payment_status === 'paid' ? 'default' : tenant.payment_status === 'pending' ? 'secondary' : 'destructive'}
                          className="ml-2"
                        >
                          {tenant.payment_status.charAt(0).toUpperCase() + tenant.payment_status.slice(1)}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lease End Date:</span>
                        <p className="font-medium">
                          {new Date(tenant.lease_end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Days Remaining:</span>
                        <p className="font-medium">
                          {Math.ceil((new Date(tenant.lease_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentTab('/enhancedlandlorddashboard/messages')}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/tenant-profile/${tenant.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderPaymentsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="h-6 w-6 text-ocean-blue" />
        <h2 className="text-xl font-bold">Payment Management</h2>
        <Badge variant="secondary" className="ml-2">
          {tenants.length} active leases
        </Badge>
      </div>
      
      {tenants.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Leases</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any active leases yet. Once tenants sign leases, you'll be able to track rent payments here.
            </p>
            <Button onClick={() => navigate('/enhancedlandlorddashboard/applications')}>
              <FileText className="h-4 w-4 mr-2" />
              View Applications
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Payment Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success-green/10 rounded-full flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-success-green" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Monthly Rent</p>
                    <p className="text-2xl font-bold text-success-green">
                      R{tenants.reduce((sum, tenant) => sum + tenant.monthly_rent, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ocean-blue/10 rounded-full flex items-center justify-center">
                    <Check className="h-5 w-5 text-ocean-blue" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid This Month</p>
                    <p className="text-2xl font-bold text-ocean-blue">
                      R{tenants
                        .filter(tenant => tenant.payment_status === 'paid')
                        .reduce((sum, tenant) => sum + tenant.monthly_rent, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                    <p className="text-2xl font-bold text-orange-500">
                      R{tenants
                        .filter(tenant => tenant.payment_status !== 'paid')
                        .reduce((sum, tenant) => sum + tenant.monthly_rent, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Payment Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-success-green to-success-green-dark rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">{tenant.property_title}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium">R{tenant.monthly_rent.toLocaleString()}</p>
                      <Badge 
                        variant={tenant.payment_status === 'paid' ? 'default' : tenant.payment_status === 'pending' ? 'secondary' : 'destructive'}
                        className="ml-2"
                      >
                        {tenant.payment_status.charAt(0).toUpperCase() + tenant.payment_status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentTab('/enhancedlandlorddashboard/messages')}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Remind
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/tenant-profile/${tenant.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const renderReportsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-6 w-6 text-ocean-blue" />
        <h2 className="text-xl font-bold">Reports & Analytics</h2>
        <Badge variant="secondary" className="ml-2">
          Financial Overview
        </Badge>
      </div>
      
      {tenants.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Financial Data</h3>
            <p className="text-muted-foreground mb-4">
              Financial reports will be available once you have active tenants and rental income.
            </p>
            <Button onClick={() => navigate('/enhancedlandlorddashboard/applications')}>
              <FileText className="h-4 w-4 mr-2" />
              View Applications
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success-green/10 rounded-full flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-success-green" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Annual Revenue</p>
                    <p className="text-xl font-bold text-success-green">
                      R{(tenants.reduce((sum, tenant) => sum + tenant.monthly_rent, 0) * 12).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ocean-blue/10 rounded-full flex items-center justify-center">
                    <Building className="h-5 w-5 text-ocean-blue" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                    <p className="text-xl font-bold text-ocean-blue">
                      {properties.length > 0 ? Math.round((tenants.length / properties.length) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Tenants</p>
                    <p className="text-xl font-bold text-purple-500">
                      {tenants.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Lease Duration</p>
                    <p className="text-xl font-bold text-orange-500">
                      {tenants.length > 0 
                        ? Math.round(tenants.reduce((sum, tenant) => {
                            const days = Math.ceil((new Date(tenant.lease_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            return sum + Math.max(0, days);
                          }, 0) / tenants.length)
                        : 0} days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Monthly Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <p>Revenue charts will be available with more data</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Property Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Property Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {properties.map((property) => {
                  const propertyTenants = tenants.filter(tenant => 
                    tenant.property_title === property.title
                  );
                  const monthlyRevenue = propertyTenants.reduce((sum, tenant) => sum + tenant.monthly_rent, 0);
                  
                  return (
                    <div key={property.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-ocean-blue to-ocean-blue-dark rounded-full flex items-center justify-center">
                          <Building className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{property.title}</p>
                          <p className="text-sm text-muted-foreground">{property.location}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-medium text-success-green">R{monthlyRevenue.toLocaleString()}/month</p>
                        <p className="text-sm text-muted-foreground">
                          {propertyTenants.length} tenant{propertyTenants.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/manage-property/${property.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Invoice Costs & Scheduling Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-6 w-6 text-ocean-blue" />
            <h3 className="text-xl font-bold">Additional Invoice Costs & Scheduling</h3>
            <Badge variant="secondary" className="ml-2">
              Invoice Management
            </Badge>
          </div>

          <div className="space-y-6">
            {/* Additional Costs Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Additional Costs</h4>
                <Dialog open={addCostModalOpen} onOpenChange={setAddCostModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-ocean-blue hover:bg-ocean-blue/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Cost
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Additional Cost</DialogTitle>
                      <DialogDescription>
                        Add a custom cost item to include in tenant invoices
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <input
                          type="text"
                          value={newCost.description}
                          onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
                          placeholder="e.g., Maintenance Fee, Security Fee"
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-ocean-blue focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Amount (ZAR)</label>
                        <input
                          type="number"
                          value={newCost.amount}
                          onChange={(e) => setNewCost({ ...newCost, amount: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-ocean-blue focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button onClick={handleAddCost} className="flex-1">
                          Add Cost
                        </Button>
                        <Button variant="outline" onClick={() => setAddCostModalOpen(false)} className="flex-1">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {additionalCosts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No additional costs added yet</p>
                  <p className="text-sm">Add custom cost items to include in tenant invoices</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Description</th>
                        <th className="text-right p-3 font-medium">Amount (ZAR)</th>
                        <th className="text-center p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {additionalCosts.map((cost, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-3">{cost.description}</td>
                          <td className="p-3 text-right font-medium">R{cost.amount.toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCost(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Invoice Scheduling Section */}
            <div className="border-t pt-6">
              <h4 className="text-lg font-semibold mb-4">Invoice Scheduling</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Send invoice before due date
                  </label>
                  <select
                    value={invoiceSchedule}
                    onChange={(e) => setInvoiceSchedule(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-ocean-blue focus:border-transparent"
                  >
                    <option value="7">1 week before</option>
                    <option value="3">3 days before</option>
                    <option value="1">1 day before</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleSaveInvoiceSettings}
                    className="w-full bg-success-green hover:bg-success-green/90"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </div>
              
              {invoiceSchedule && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Invoices will be sent {invoiceSchedule === '7' ? '1 week' : invoiceSchedule === '3' ? '3 days' : '1 day'} before the due date
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Total Summary */}
            {additionalCosts.length > 0 && (
              <div className="border-t pt-6">
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Additional Costs:</span>
                    <span className="text-xl font-bold text-ocean-blue">
                      R{additionalCosts.reduce((sum, cost) => sum + cost.amount, 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    This amount will be added to the base rent for each tenant invoice
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Landlord Invoice Settings Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="h-6 w-6 text-ocean-blue" />
            <h3 className="text-xl font-bold">Landlord Invoice Settings</h3>
            <Badge variant="secondary" className="ml-2">
              Business Details
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                value={landlordDetails.name}
                onChange={(e) => setLandlordDetails({ ...landlordDetails, name: e.target.value })}
                placeholder="Your full name or business name"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-ocean-blue focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Contact *</label>
              <input
                type="text"
                value={landlordDetails.contact}
                onChange={(e) => setLandlordDetails({ ...landlordDetails, contact: e.target.value })}
                placeholder="Phone number or email"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-ocean-blue focus:border-transparent"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Address *</label>
              <textarea
                value={landlordDetails.address}
                onChange={(e) => setLandlordDetails({ ...landlordDetails, address: e.target.value })}
                placeholder="Your business address"
                rows={3}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-ocean-blue focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">VAT Number</label>
              <input
                type="text"
                value={landlordDetails.vatNumber}
                onChange={(e) => setLandlordDetails({ ...landlordDetails, vatNumber: e.target.value })}
                placeholder="Optional VAT registration number"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-ocean-blue focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Bank Name</label>
              <input
                type="text"
                value={landlordDetails.bank}
                onChange={(e) => setLandlordDetails({ ...landlordDetails, bank: e.target.value })}
                placeholder="e.g., Standard Bank, FNB"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-ocean-blue focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Account Holder</label>
              <input
                type="text"
                value={landlordDetails.accountHolder}
                onChange={(e) => setLandlordDetails({ ...landlordDetails, accountHolder: e.target.value })}
                placeholder="Account holder name"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-ocean-blue focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Account Number</label>
              <input
                type="text"
                value={landlordDetails.accountNumber}
                onChange={(e) => setLandlordDetails({ ...landlordDetails, accountNumber: e.target.value })}
                placeholder="Bank account number"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-ocean-blue focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Branch Code</label>
              <input
                type="text"
                value={landlordDetails.branchCode}
                onChange={(e) => setLandlordDetails({ ...landlordDetails, branchCode: e.target.value })}
                placeholder="6-digit branch code"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-ocean-blue focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button 
              onClick={handleSaveLandlordSettings}
              disabled={savingSettings}
              className="bg-success-green hover:bg-success-green/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Actions Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-6 w-6 text-ocean-blue" />
            <h3 className="text-xl font-bold">Invoice Actions</h3>
            <Badge variant="secondary" className="ml-2">
              Generate & Preview
            </Badge>
          </div>

          {tenants.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Active Tenants</h3>
              <p className="text-muted-foreground mb-4">
                You need active tenants to generate invoices. Add properties and tenants first.
              </p>
              <Button 
                onClick={() => navigate('/enhancedlandlorddashboard/properties')}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Properties
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <h4 className="font-semibold">Generate Invoice</h4>
                  <p className="text-sm text-muted-foreground">
                    Create an invoice with landlord details, tenant information, and additional costs
                  </p>
                </div>
                <Button 
                  onClick={handleGenerateInvoice}
                  disabled={generatingInvoice || !landlordDetails.name.trim()}
                  className="bg-ocean-blue hover:bg-ocean-blue/90"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {generatingInvoice ? 'Generating...' : 'Generate Invoice'}
                </Button>
              </div>

              {!landlordDetails.name.trim() && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Please save your landlord details before generating invoices
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Preview Modal */}
      <Dialog open={invoicePreviewOpen} onOpenChange={setInvoicePreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
            <DialogDescription>
              Review the generated invoice before sending or exporting
            </DialogDescription>
          </DialogHeader>
          
          {generatedInvoice && (
            <div className="space-y-6 p-6 bg-white dark:bg-gray-900 rounded-lg border">
              {/* Invoice Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-ocean-blue">INVOICE</h2>
                  <p className="text-sm text-muted-foreground">#{generatedInvoice.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Date: {new Date(generatedInvoice.date).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">Due: {new Date(generatedInvoice.dueDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Landlord & Tenant Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">From:</h3>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{generatedInvoice.landlordDetails.name}</p>
                    <p>{generatedInvoice.landlordDetails.address}</p>
                    <p>{generatedInvoice.landlordDetails.contact}</p>
                    {generatedInvoice.landlordDetails.vatNumber && (
                      <p>VAT: {generatedInvoice.landlordDetails.vatNumber}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">To:</h3>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{generatedInvoice.tenantDetails.name}</p>
                    <p>{generatedInvoice.tenantDetails.address}</p>
                    <p>{generatedInvoice.tenantDetails.contact}</p>
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div>
                <h3 className="font-semibold mb-2">Property:</h3>
                <div className="text-sm">
                  <p className="font-medium">{generatedInvoice.propertyDetails.title}</p>
                  <p>{generatedInvoice.propertyDetails.address}</p>
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <h3 className="font-semibold mb-4">Invoice Items:</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Description</th>
                        <th className="text-right p-3 font-medium">Amount (ZAR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedInvoice.items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-3">{item.description}</td>
                          <td className="p-3 text-right font-medium">R{item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t-2">
                      <tr>
                        <td className="p-3 font-bold">Total Amount</td>
                        <td className="p-3 text-right font-bold text-lg text-ocean-blue">
                          R{generatedInvoice.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Banking Details */}
              {generatedInvoice.landlordDetails.bank && (
                <div>
                  <h3 className="font-semibold mb-2">Payment Details:</h3>
                  <div className="text-sm bg-muted/30 p-4 rounded-lg">
                    <p><span className="font-medium">Bank:</span> {generatedInvoice.landlordDetails.bank}</p>
                    <p><span className="font-medium">Account Holder:</span> {generatedInvoice.landlordDetails.accountHolder}</p>
                    <p><span className="font-medium">Account Number:</span> {generatedInvoice.landlordDetails.accountNumber}</p>
                    <p><span className="font-medium">Branch Code:</span> {generatedInvoice.landlordDetails.branchCode}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setInvoicePreviewOpen(false)} className="flex-1">
                  Close Preview
                </Button>
                <Button className="flex-1 bg-success-green hover:bg-success-green/90">
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

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



  const renderMaintenanceTab = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Wrench className="h-6 w-6 text-ocean-blue" />
        <h2 className="text-xl font-bold">Maintenance Management</h2>
        <Badge variant="secondary" className="ml-2">
          {maintenanceRequests.length} requests
        </Badge>
      </div>
      
      {loadingMaintenance ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-muted animate-pulse h-24 rounded-lg"></div>
          ))}
        </div>
      ) : maintenanceRequests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Maintenance Requests</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any maintenance requests yet. Requests will appear here once tenants submit them.
            </p>
            <Button onClick={() => navigate('/enhancedlandlorddashboard/properties')}>
              <Building className="h-4 w-4 mr-2" />
              View Properties
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {maintenanceRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        request.priority === 'emergency' ? 'bg-red-500' :
                        request.priority === 'high' ? 'bg-orange-500' :
                        request.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}>
                        <Wrench className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{request.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {properties.find(p => p.id === request.property_id)?.title || 'Unknown Property'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">Priority:</span>
                        <Badge 
                          variant={
                            request.priority === 'emergency' ? 'destructive' :
                            request.priority === 'high' ? 'default' :
                            request.priority === 'medium' ? 'secondary' : 'outline'
                          }
                          className="ml-2"
                        >
                          {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Category:</span>
                        <p className="font-medium capitalize">{request.category.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <Badge 
                          variant={
                            request.status === 'completed' ? 'default' :
                            request.status === 'in_progress' ? 'secondary' :
                            request.status === 'submitted' ? 'outline' : 'destructive'
                          }
                          className="ml-2"
                        >
                          {request.status.replace('_', ' ').charAt(0).toUpperCase() + request.status.replace('_', ' ').slice(1)}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Submitted:</span>
                        <p className="font-medium">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {request.description}
                    </p>
                    
                    {request.estimated_cost && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">Estimated Cost:</span>
                        <p className="font-medium text-success-green">
                          R{request.estimated_cost.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/maintenance/${request.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    {request.status === 'submitted' && (
                      <Button
                        size="sm"
                        onClick={() => updateMaintenanceStatus(request.id, 'in_progress')}
                        className="bg-ocean-blue hover:bg-ocean-blue-dark"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start Work
                      </Button>
                    )}
                    {request.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => updateMaintenanceStatus(request.id, 'completed')}
                        className="bg-success-green hover:bg-success-green-dark"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        View
                      </Button>
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
                <Button size="sm" variant="ghost" onClick={() => setCurrentTab('/enhancedlandlorddashboard/messages')}>
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
    console.log('[Dashboard] Tab change requested:', tab);
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