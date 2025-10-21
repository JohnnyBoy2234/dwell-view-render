import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import InvoiceDownloadButton from '@/components/InvoiceDownloadButton';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';
import { MetricsGrid } from '@/components/dashboard/landlord/MetricsGrid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageCircle, Bell, Home, Activity, FileText, Users, Building, Check, X, Eye, AlertTriangle, Plus, BarChart3, Calendar, Trash2, Save, User, Wrench, Play, Camera, Image, Clipboard } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Simple R icon for South African Rand
const RIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>
);
import { QuickLeaseActions } from "@/components/lease/QuickLeaseActions";
import { LeaseDashboard as LeaseDashboardComponent } from '@/components/lease/LeaseDashboard';
import { useToast } from '@/hooks/use-toast';
import { BUILD_TAG } from '@/version';
import { MaintenanceRequest } from '@/types/maintenance';
import { useLandlordMetrics } from '@/hooks/useLandlordMetrics';
import { useLandlordApplications } from '@/hooks/useLandlordApplications';
import { AccountingOverview } from '@/components/accounting/AccountingOverview';
import { VerificationGate } from '@/components/VerificationGate';
import { PropertySelection } from '@/components/dashboard/PropertySelection';
import { PropertyHeader } from '@/components/dashboard/PropertyHeader';

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
  invoiceDate: string;
  landlordName: string;
  landlordAddress: string;
  landlordContact: string;
  vatNumber?: string;
  tenantName: string;
  rentalProperty: string;
  rentalPeriod: string;
  items: { description: string; amount: number }[];
  totalAmount: number;
  bank: string;
  accountHolder: string;
  accountNumber: string;
  branchCode: string;
  paymentDueDate: string;
  createdAt: string;
}

export default function EnhancedLandlordDashboard() {
  const { user, isLandlord, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Property selection state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(() => {
    const propertyParam = searchParams.get('property');
    return propertyParam || null;
  });

  const { applications, loading: applicationsLoading, fetchAllApplications, updateApplicationStatus } = useLandlordApplications(selectedPropertyId || undefined);
  
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
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceHistory, setInvoiceHistory] = useState<Invoice[]>([]);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(1);

  // Landlord inventory state
  const [landlordInventory, setLandlordInventory] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [selectedInventoryRecord, setSelectedInventoryRecord] = useState<any | null>(null);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  // Payment reminder quick action state
  const [reminderPropertyId, setReminderPropertyId] = useState<string>("");
  const [sendingReminder, setSendingReminder] = useState(false);

  // Global application leads (across all properties) for quick invites
  const [appLeads, setAppLeads] = useState<Array<{ conversation_id: string; tenant_id: string; property_id: string; title: string; tenant_name: string; last_message_at?: string }>>([]);
  const [appInvitesMap, setAppInvitesMap] = useState<Record<string, any>>({}); // key: `${tenant_id}:${property_id}`
  const [leadQuery, setLeadQuery] = useState('');
  const [hideInvited, setHideInvited] = useState(false);

  // Sync selectedPropertyId with URL params
  useEffect(() => {
    const propertyParam = searchParams.get('property');
    if (propertyParam !== selectedPropertyId) {
      setSelectedPropertyId(propertyParam);
    }
  }, [searchParams]);

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

    fetchProperties();
    fetchTenants(selectedPropertyId || undefined);
    fetchMaintenanceRequests(selectedPropertyId || undefined);
    fetchLandlordSettings();
    fetchAdditionalCosts();
    fetchInvoiceScheduleSettings();
    fetchGlobalApplicationLeads();
  }, [authLoading, user, isLandlord, navigate, location.pathname, selectedPropertyId]);

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
        fetchInvoiceHistory();
      } catch (error) {
        console.log('Error loading reports data:', error);
      }
    }
    if (currentTab === '/enhancedlandlorddashboard/inventory') {
      void fetchLandlordInventory();
    }
  }, [currentTab]);

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

  const fetchTenants = async (propertyId?: string) => {
    if (!user) return;

    try {
      // Fetch real tenants from tenancies and profiles
      let query = supabase
        .from('tenancies')
        .select(`
          id,
          tenant_id,
          property_id,
          monthly_rent,
          end_date,
          status,
          properties(title),
          tenant_profiles:profiles!tenant_id(display_name)
        `)
        .eq('landlord_id', user.id)
        .eq('status', 'active');

      // Filter by property if specified
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data: tenanciesData, error: tenanciesError } = await query;

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

  const fetchMaintenanceRequests = async (propertyId?: string) => {
    if (!user) return;
    
    setLoadingMaintenance(true);
    try {
      let query = supabase
        .from('maintenance_requests')
        .select('*')
        .eq('landlord_id', user.id);

      // Filter by property if specified
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
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

  // Aggregate conversations across all properties to suggest tenants to invite
  const fetchGlobalApplicationLeads = async () => {
    if (!user) return;
    try {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, tenant_id, property_id, landlord_id, last_message_at, properties ( title )')
        .eq('landlord_id', user.id)
        .order('last_message_at', { ascending: false })
        .limit(50);

      const tenantIds = Array.from(new Set((convs || []).map(c => c.tenant_id)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', tenantIds);
      const profileMap = new Map<string, any>();
      (profiles || []).forEach(p => profileMap.set(p.user_id, p.display_name));

      const leads = (convs || []).map(c => ({
        conversation_id: c.id,
        tenant_id: c.tenant_id,
        property_id: c.property_id,
        title: c.properties?.title || 'Property',
        tenant_name: profileMap.get(c.tenant_id) || 'Tenant',
        last_message_at: c.last_message_at
      }));
      setAppLeads(leads);

      const { data: invites } = await supabase
        .from('application_invites')
        .select('*')
        .eq('landlord_id', user.id);
      const map: Record<string, any> = {};
      (invites || []).forEach(i => { map[`${i.tenant_id}:${i.property_id}`] = i; });
      setAppInvitesMap(map);
    } catch (e) {
      console.warn('Failed to fetch global application leads', e);
    }
  };

  const handleInviteFromLead = async (tenantId: string, propertyId: string, conversationId?: string) => {
    if (!user) return;
    try {
      const token = crypto.randomUUID();
      await supabase
        .from('application_invites')
        .insert({
          token,
          property_id: propertyId,
          landlord_id: user.id,
          tenant_id: tenantId,
          conversation_id: conversationId,
          status: 'invited'
        });
      const link = `${window.location.origin}/apply/invite/${token}`;
      if (conversationId) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: `You've been invited to apply for this property. Click here to start: ${link}`,
          message_type: 'text'
        });
      }
      await fetchGlobalApplicationLeads();
      toast({ title: 'Invite sent', description: 'We notified the tenant with an application link.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to send invite', description: e.message });
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

  const fetchInvoiceHistory = async () => {
    if (!user) return;
    
    try {
      // Use localStorage as fallback until database migration is applied
      const saved = localStorage.getItem('invoiceHistory');
      if (saved) {
        const history = JSON.parse(saved);
        setInvoiceHistory(history);
        // Set next invoice number based on existing invoices
        if (history.length > 0) {
          const maxNumber = Math.max(...history.map((inv: Invoice) => 
            parseInt(inv.invoiceNumber.split('-')[2]) || 0
          ));
          setNextInvoiceNumber(maxNumber + 1);
        }
      }
    } catch (error) {
      console.error('Error fetching invoice history:', error);
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

      // Generate invoice with new format
      const currentDate = new Date();
      const invoiceNumber = `INV-${currentDate.getFullYear()}-${String(nextInvoiceNumber).padStart(4, '0')}`;
      const dueDate = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      // Generate rental period (current month)
      const rentalPeriod = `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`;

      const invoice: Invoice = {
        id: `INV-${Date.now()}`,
        invoiceNumber,
        invoiceDate: currentDate.toISOString().split('T')[0],
        landlordName: landlordDetails.name,
        landlordAddress: landlordDetails.address,
        landlordContact: landlordDetails.contact,
        vatNumber: landlordDetails.vatNumber || undefined,
        tenantName: tenant.name,
        rentalProperty: `${property.title}, ${property.location}`,
        rentalPeriod,
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
        bank: landlordDetails.bank,
        accountHolder: landlordDetails.accountHolder,
        accountNumber: landlordDetails.accountNumber,
        branchCode: landlordDetails.branchCode,
        paymentDueDate: dueDate.toISOString().split('T')[0],
        createdAt: currentDate.toISOString(),
      };

      // Save invoice to history
      const updatedHistory = [...invoiceHistory, invoice];
      setInvoiceHistory(updatedHistory);
      localStorage.setItem('invoiceHistory', JSON.stringify(updatedHistory));
      
      // Update next invoice number
      setNextInvoiceNumber(nextInvoiceNumber + 1);

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


  const handleSelectProperty = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setCurrentTab('/enhancedlandlorddashboard');
    setSearchParams({ property: propertyId });
    navigate(`/enhancedlandlorddashboard?property=${propertyId}`);
    // Refetch data for the selected property
    fetchTenants(propertyId);
    fetchMaintenanceRequests(propertyId);
  };

  const handleBackToProperties = () => {
    setSelectedPropertyId(null);
    setSearchParams({});
    // Refetch all data
    fetchTenants();
    fetchMaintenanceRequests();
  };

  const getSelectedProperty = () => {
    return properties.find(p => p.id === selectedPropertyId);
  };

  const renderTabContent = () => {
    console.log('[Dashboard] Rendering tab content for:', currentTab);
    
    // If no property is selected, show property selection
    if (!selectedPropertyId) {
      return (
        <PropertySelection 
          properties={properties}
          onSelectProperty={handleSelectProperty}
          loading={loading}
        />
      );
    }

    // Property is selected, show property-specific dashboard
    const selectedProperty = getSelectedProperty();
    
    switch (currentTab) {
      case '/enhancedlandlorddashboard/properties':
        console.log('[Dashboard] Rendering properties tab');
        return (
          <>
            {selectedProperty && <PropertyHeader property={selectedProperty} onBack={handleBackToProperties} />}
            {renderPropertiesTab()}
          </>
        );
      case '/enhancedlandlorddashboard/applications':
        console.log('[Dashboard] Rendering applications tab');
        return (
          <>
            {selectedProperty && <PropertyHeader property={selectedProperty} onBack={handleBackToProperties} />}
            {renderApplicationsTab()}
          </>
        );
      case '/enhancedlandlorddashboard/leases':
        console.log('[Dashboard] Rendering leases tab');
        return (
          <>
            {selectedProperty && <PropertyHeader property={selectedProperty} onBack={handleBackToProperties} />}
            {renderLeasesTab()}
          </>
        );
      case '/enhancedlandlorddashboard/tenants':
        console.log('[Dashboard] Rendering tenants tab');
        return (
          <>
            {selectedProperty && <PropertyHeader property={selectedProperty} onBack={handleBackToProperties} />}
            {renderTenantsTab()}
          </>
        );
      case '/enhancedlandlorddashboard/payments':
        console.log('[Dashboard] Rendering payments tab');
        return (
          <>
            {selectedProperty && <PropertyHeader property={selectedProperty} onBack={handleBackToProperties} />}
            {renderPaymentsTab()}
          </>
        );
      case '/enhancedlandlorddashboard/reports':
        console.log('[Dashboard] Rendering reports tab');
        return (
          <>
            {selectedProperty && <PropertyHeader property={selectedProperty} onBack={handleBackToProperties} />}
            <AccountingOverview />
          </>
        );
      case '/enhancedlandlorddashboard/inventory':
        console.log('[Dashboard] Rendering inventory tab');
        return (
          <>
            {selectedProperty && <PropertyHeader property={selectedProperty} onBack={handleBackToProperties} />}
            {renderInventoryTab()}
          </>
        );
      case '/enhancedlandlorddashboard/maintenance':
        console.log('[Dashboard] Rendering maintenance tab');
        return (
          <>
            {selectedProperty && <PropertyHeader property={selectedProperty} onBack={handleBackToProperties} />}
            {renderMaintenanceTab()}
          </>
        );
      default:
        console.log('[Dashboard] Rendering default dashboard content');
        return (
          <>
            {selectedProperty && <PropertyHeader property={selectedProperty} onBack={handleBackToProperties} />}
            {renderDashboardContent()}
          </>
        );
    }
  };

  const fetchLandlordInventory = async () => {
    if (!user) return;
    setInventoryLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('inventory_records')
        .select(`
          *,
          inventory_items (*)
        `)
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLandlordInventory(data || []);
    } catch (e) {
      console.error('Error fetching landlord inventory:', e);
    } finally {
      setInventoryLoading(false);
    }
  };

  const renderInventoryTab = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Camera className="h-6 w-6 text-ocean-blue" />
        <h2 className="text-xl font-bold">Property Inventory</h2>
        <Badge variant="secondary" className="ml-2">
          {landlordInventory.length} Records
        </Badge>
      </div>

      {inventoryLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : landlordInventory.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No inventory yet</h3>
            <p className="text-muted-foreground">Tenant-submitted inventory photos and audio will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {landlordInventory.map((record: any) => {
            const photos: string[] = (record?.inventory_items || [])
              .flatMap((it: any) => Array.isArray(it.photos) ? it.photos : [])
              .filter(Boolean);
            const preview = photos.slice(0, 6);
            return (
              <Card key={record.id} className="hover:shadow-medium transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{record.property?.title || 'Property'}</h3>
                      <p className="text-muted-foreground">Created: {new Date(record.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="secondary">{(record.status || 'in_progress').replace('_', ' ')}</Badge>
                  </div>
                  {preview.length > 0 ? (
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {preview.map((url, idx) => (
                        <img key={idx} src={url} alt="Inventory" className="w-full h-20 object-cover rounded border" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No photos uploaded in this record.</p>
                  )}
                  <div className="flex justify-end mt-4">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedInventoryRecord(record); setInventoryModalOpen(true); }}>
                      <Eye className="h-4 w-4 mr-2" /> View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Inventory detail modal removed - functionality can be added back if needed */}
    </div>
  );
  const renderLeasesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-6 w-6 text-ocean-blue" />
        <h2 className="text-xl font-bold">Lease System</h2>
        <Badge variant="secondary" className="ml-2">
          Contract Management
        </Badge>
      </div>
      <LeaseDashboardComponent />
    </div>
  );

  const renderApplicationsTab = () => {
    // Calculate stats
    const pendingCount = applications.filter(a => a.status === 'pending').length;
    const acceptedCount = applications.filter(a => a.status === 'accepted').length;
    const declinedCount = applications.filter(a => a.status === 'declined').length;
    const leadsCount = appLeads.filter(l => !appInvitesMap[`${l.tenant_id}:${l.property_id}`]?.status).length;

    // Organize applications by status
    const needsAction = applications.filter(a => a.status === 'pending');
    const inProgress = applications.filter(a => a.status === 'accepted');
    const completed = applications.filter(a => a.status === 'declined');

    // Filter leads (not yet invited)
    const filteredLeads = appLeads
      .filter(l => {
        const invited = appInvitesMap[`${l.tenant_id}:${l.property_id}`]?.status === 'invited';
        if (hideInvited && invited) return false;
        if (!leadQuery.trim()) return true;
        const q = leadQuery.toLowerCase();
        return l.tenant_name.toLowerCase().includes(q) || l.title.toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());

    return (
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Applications</h2>
          </div>

          {/* Stats Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                <div className="text-sm text-muted-foreground">Needs Action</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{leadsCount}</div>
                <div className="text-sm text-muted-foreground">New Leads</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{acceptedCount}</div>
                <div className="text-sm text-muted-foreground">Accepted</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-gray-500">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-muted-foreground">{declinedCount}</div>
                <div className="text-sm text-muted-foreground">Declined</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Loading State */}
        {applicationsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Needs Action Section */}
            {needsAction.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold">Needs Your Review</h3>
                  <Badge variant="secondary">{needsAction.length}</Badge>
                </div>
                <div className="space-y-3">
                  {needsAction.map((application) => (
                    <Card key={application.id} className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex gap-4 flex-1 min-w-0">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                                {(application.tenant_profile?.display_name || 'T').charAt(0).toUpperCase()}
                              </div>
                            </div>
                            
                            {/* Info */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <h4 className="font-semibold text-lg truncate">
                                  {application.tenant_profile?.display_name || 'Unknown Tenant'}
                                </h4>
                                <Badge variant="outline" className="w-fit">Pending Review</Badge>
                              </div>
                              
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4" />
                                  <span className="truncate">{application.properties?.title || 'Unknown Property'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>Applied {new Date(application.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex flex-col sm:flex-row gap-2 md:flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/application/${application.id}`)}
                              className="w-full sm:w-auto"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateApplicationStatus(application.id, 'accepted')}
                              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateApplicationStatus(application.id, 'declined')}
                              className="w-full sm:w-auto"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Leads Section */}
            {filteredLeads.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">New Leads</h3>
                  <Badge variant="secondary">{filteredLeads.length}</Badge>
                </div>
                
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={leadQuery}
                    onChange={(e) => setLeadQuery(e.target.value)}
                    placeholder="Search tenant or property..."
                    className="flex-1 border rounded-md px-3 py-2 text-sm"
                  />
                  <label className="flex items-center gap-2 text-sm px-3 py-2 border rounded-md bg-background cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={hideInvited} 
                      onChange={(e) => setHideInvited(e.target.checked)}
                      className="cursor-pointer"
                    />
                    Hide invited
                  </label>
                </div>

                <div className="space-y-3">
                  {filteredLeads.map((lead) => {
                    const invited = appInvitesMap[`${lead.tenant_id}:${lead.property_id}`]?.status === 'invited';
                    return (
                      <Card key={lead.conversation_id} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                        <CardContent className="p-4 md:p-6">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex gap-4 flex-1 min-w-0">
                              {/* Avatar */}
                              <div className="flex-shrink-0">
                                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-semibold text-lg">
                                  {lead.tenant_name.charAt(0).toUpperCase()}
                                </div>
                              </div>
                              
                              {/* Info */}
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                  <h4 className="font-semibold text-lg truncate">{lead.tenant_name}</h4>
                                  {invited && <Badge variant="secondary">Invited</Badge>}
                                </div>
                                
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Building className="h-4 w-4" />
                                    <span className="truncate">{lead.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4" />
                                    <span>Last chat {lead.last_message_at ? new Date(lead.last_message_at).toLocaleString() : 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-2 md:flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/messages?c=${lead.conversation_id}`)}
                                className="w-full sm:w-auto"
                              >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                View Chat
                              </Button>
                              {!invited && (
                                <Button
                                  size="sm"
                                  onClick={() => handleInviteFromLead(lead.tenant_id, lead.property_id, lead.conversation_id)}
                                  className="w-full sm:w-auto"
                                >
                                  Send Application
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Accepted Applications (In Progress) */}
            {inProgress.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Accepted Applications</h3>
                  <Badge variant="secondary">{inProgress.length}</Badge>
                </div>
                <div className="space-y-3">
                  {inProgress.map((application) => (
                    <Card key={application.id} className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex gap-4 flex-1 min-w-0">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 font-semibold text-lg">
                                {(application.tenant_profile?.display_name || 'T').charAt(0).toUpperCase()}
                              </div>
                            </div>
                            
                            {/* Info */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <h4 className="font-semibold text-lg truncate">
                                  {application.tenant_profile?.display_name || 'Unknown Tenant'}
                                </h4>
                                <Badge className="w-fit bg-green-600">Accepted</Badge>
                              </div>
                              
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4" />
                                  <span className="truncate">{application.properties?.title || 'Unknown Property'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>Applied {new Date(application.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex flex-col sm:flex-row gap-2 md:flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/application/${application.id}`)}
                              className="w-full sm:w-auto"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => navigate(`/lease/builder?tenantId=${encodeURIComponent(application.tenant_id)}&propertyId=${encodeURIComponent(application.property_id)}`)}
                              className="w-full sm:w-auto"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Create Lease
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Declined Applications */}
            {completed.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <X className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Declined Applications</h3>
                  <Badge variant="secondary">{completed.length}</Badge>
                </div>
                <div className="space-y-3">
                  {completed.map((application) => (
                    <Card key={application.id} className="border-l-4 border-l-gray-300 hover:shadow-lg transition-shadow opacity-75">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex gap-4 flex-1 min-w-0">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-lg">
                                {(application.tenant_profile?.display_name || 'T').charAt(0).toUpperCase()}
                              </div>
                            </div>
                            
                            {/* Info */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <h4 className="font-semibold text-lg truncate">
                                  {application.tenant_profile?.display_name || 'Unknown Tenant'}
                                </h4>
                                <Badge variant="outline" className="w-fit">Declined</Badge>
                              </div>
                              
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4" />
                                  <span className="truncate">{application.properties?.title || 'Unknown Property'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>Applied {new Date(application.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex flex-col sm:flex-row gap-2 md:flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/application/${application.id}`)}
                              className="w-full sm:w-auto"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {applications.length === 0 && filteredLeads.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Applications Yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    You haven't received any rental applications yet. Once tenants start applying or chatting about your properties, they'll appear here.
                  </p>
                  <Button onClick={() => navigate('/enhancedlandlorddashboard/properties')}>
                    <Building className="h-4 w-4 mr-2" />
                    View Your Properties
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    );
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


  const renderNotImplementedTab = (title: string, description: string) => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="h-6 w-6 text-orange-500" />
        <h2 className="text-xl font-bold">{title}</h2>
        <Badge variant="secondary" className="ml-2">
          Not Implemented
        </Badge>
      </div>
      
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Feature Not Available</h3>
          <p className="text-muted-foreground mb-4">
            {description}
          </p>
          <Button onClick={() => navigate('/enhancedlandlorddashboard/properties')}>
            <Building className="h-4 w-4 mr-2" />
            View Properties
          </Button>
        </CardContent>
      </Card>
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
            <Button onClick={() => navigate('/enhancedlandlorddashboard/properties')}>
              <Building className="h-4 w-4 mr-2" />
              View Properties
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
                      onClick={() => navigate('/messages')}
                    >
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
        <RIcon className="h-8 w-8 text-ocean-blue" />
        <h2 className="text-xl font-bold">Payment Management</h2>
        <Badge variant="secondary" className="ml-2">
          {tenants.length} active leases
        </Badge>
      </div>
      
      {tenants.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <RIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Leases</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any active leases yet. Once tenants sign leases, you'll be able to track rent payments here.
            </p>
            <Button onClick={() => navigate('/enhancedlandlorddashboard/properties')}>
              <Building className="h-4 w-4 mr-2" />
              View Properties
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
                    <RIcon className="h-7 w-7 text-success-green" />
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
                        onClick={() => navigate('/messages')}
                      >
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
        <h2 className="text-xl font-bold">SwiftBooks & Analytics</h2>
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
              Financial SwiftBooks will be available once you have active tenants and rental income.
            </p>
            <Button onClick={() => navigate('/enhancedlandlorddashboard/properties')}>
              <Building className="h-4 w-4 mr-2" />
              View Properties
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
                    <RIcon className="h-7 w-7 text-success-green" />
                  </div>
                  <div>
                    <p className="text-sm text-black text-muted-foreground">Annual Revenue</p>
                    <p className="text-xl text-black font-bold text-success-green">
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
                    <p className="text-sm text-black text-muted-foreground">Occupancy Rate</p>
                    <p className="text-xl text-black font-bold text-ocean-blue">
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

      {/* Invoice History Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-6 w-6 text-ocean-blue" />
            <h3 className="text-xl font-bold">Invoice History</h3>
            <Badge variant="secondary" className="ml-2">
              {invoiceHistory.length} invoices
            </Badge>
          </div>

          {invoiceHistory.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Invoices Generated</h3>
              <p className="text-muted-foreground">
                Generated invoices will appear here with options to view and export.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Invoice Number</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Tenant</th>
                    <th className="text-right p-3 font-medium">Total Amount</th>
                    <th className="text-center p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceHistory.map((invoice, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3 font-medium">{invoice.invoiceNumber}</td>
                      <td className="p-3">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                      <td className="p-3">{invoice.tenantName}</td>
                      <td className="p-3 text-right font-medium">R{invoice.totalAmount.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setGeneratedInvoice(invoice);
                              setInvoicePreviewOpen(true);
                            }}
                            className="text-ocean-blue hover:text-ocean-blue/80"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <InvoiceDownloadButton 
                            invoice={invoice}
                            variant="ghost"
                            size="sm"
                            className="text-success-green hover:text-success-green/80"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  <h2 className="text-2xl font-bold text-ocean-blue">RENTAL INVOICE</h2>
                  <p className="text-sm text-muted-foreground">#{generatedInvoice.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Date: {new Date(generatedInvoice.invoiceDate).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">Due: {new Date(generatedInvoice.paymentDueDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Rental Period */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-semibold mb-1">Rental Period</h3>
                <p className="text-lg">{generatedInvoice.rentalPeriod}</p>
              </div>

              {/* Landlord & Tenant Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Landlord Details:</h3>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{generatedInvoice.landlordName}</p>
                    <p>{generatedInvoice.landlordAddress}</p>
                    <p>{generatedInvoice.landlordContact}</p>
                    {generatedInvoice.vatNumber && <p>VAT: {generatedInvoice.vatNumber}</p>}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Tenant Details:</h3>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{generatedInvoice.tenantName}</p>
                    <p>{generatedInvoice.rentalProperty}</p>
                  </div>
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

              {/* Payment Details */}
              {generatedInvoice.bank && (
                <div>
                  <h3 className="font-semibold mb-2">Payment Details:</h3>
                  <div className="text-sm bg-muted/30 p-4 rounded-lg space-y-1">
                    <p><span className="font-medium">Bank:</span> {generatedInvoice.bank}</p>
                    <p><span className="font-medium">Account Holder:</span> {generatedInvoice.accountHolder}</p>
                    <p><span className="font-medium">Account Number:</span> {generatedInvoice.accountNumber}</p>
                    <p><span className="font-medium">Branch Code:</span> {generatedInvoice.branchCode}</p>
                    <p><span className="font-medium">Payment Due Date:</span> {new Date(generatedInvoice.paymentDueDate).toLocaleDateString()}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setInvoicePreviewOpen(false)} className="flex-1">
                  Close Preview
                </Button>
                <InvoiceDownloadButton 
                  invoice={generatedInvoice}
                  className="flex-1 bg-success-green hover:bg-success-green/90"
                />
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
                        request.priority === 'urgent' ? 'bg-red-500' :
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
                            request.priority === 'urgent' ? 'destructive' :
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
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-ios-gray-light to-white">
          <div className="animate-pulse space-y-4 p-4">
            <div className="h-20 bg-gray-300 rounded-ios"></div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-300 rounded-ios"></div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-300 rounded-ios"></div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const totalRevenue = tenants.reduce((sum, t) => sum + t.monthly_rent, 0);
    const occupancyRate = properties.length > 0 ? Math.round((tenants.length / properties.length) * 100) : 0;
    const activeMaintenanceRequests = maintenanceRequests.filter(req => req.status !== 'completed').length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-ios-gray-light to-white pb-24 md:pb-4">
        <div className="px-4 space-y-6">
          {/* Quick tile: Inspection (removed per request) */}
          {/* Header */}
          <div className="pt-4">
            <h1 className="text-2xl font-bold text-ios-gray-dark mb-1">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}
            </h1>
            <p className="text-ios-gray text-sm">
              {user?.email?.split('@')[0] || 'Landlord'}
            </p>
          </div>
          
          {/* Payment Reminder Banner */}
          <div className="bg-gradient-to-r from-ocean-blue/10 to-success-green/10 border border-ocean-blue/20 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-ocean-blue text-white flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold">Send Payment Reminder</div>
                  <div className="text-sm text-ios-gray">Notify a tenant instantly via app and email</div>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={reminderPropertyId} onValueChange={setReminderPropertyId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={sendingReminder}
                  onClick={async () => {
                    if (!reminderPropertyId) {
                      toast({ title: 'Select a property', description: 'Choose a property to notify its tenant.' });
                      return;
                    }
                    try {
                      setSendingReminder(true);
                      const { data: tenancy } = await supabase
                        .from('tenancies')
                        .select('tenant_id')
                        .eq('landlord_id', user?.id)
                        .eq('property_id', reminderPropertyId)
                        .eq('status', 'active')
                        .limit(1)
                        .maybeSingle();
                      if (!tenancy?.tenant_id) {
                        toast({ variant: 'destructive', title: 'No active tenant', description: 'This property has no active tenant.' });
                        setSendingReminder(false);
                        return;
                      }
                      const { error } = await supabase.functions.invoke('send-payment-reminder', {
                        body: { tenant_id: tenancy.tenant_id, property_id: reminderPropertyId }
                      });
                      if (error) throw error;
                      toast({ title: 'Reminder sent', description: 'Tenant notified via app and email.' });
                    } catch (e: any) {
                      toast({ variant: 'destructive', title: 'Failed to send reminder', description: e?.message || 'Please try again.' });
                    } finally {
                      setSendingReminder(false);
                    }
                  }}
                  className="bg-ocean-blue hover:bg-ocean-blue-dark text-white"
                >
                  {sendingReminder ? 'Sending…' : 'Send Reminder'}
                </Button>
              </div>
            </div>
          </div>

          {/* App-style Feature Grid */}
          <div>
            <h3 className="text-lg font-semibold text-ios-gray-dark mb-4">Management Tools</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <button
                onClick={() => handleTabChange('/enhancedlandlorddashboard/properties')}
                className="bg-white rounded-ios-card p-4 shadow-ios-sm active:scale-95 transition-all duration-200 border border-gray-100"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-ios-blue to-ios-blue-light rounded-ios mx-auto mb-2 flex items-center justify-center">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-medium text-ios-gray-dark">Properties</p>
                <p className="text-xs text-ios-gray">{properties.length}</p>
              </button>

              <button
                onClick={() => handleTabChange('/enhancedlandlorddashboard/tenants')}
                className="bg-white rounded-ios-card p-4 shadow-ios-sm active:scale-95 transition-all duration-200 border border-gray-100"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-ios-green to-ios-green-light rounded-ios mx-auto mb-2 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-medium text-ios-gray-dark">Tenants</p>
                <p className="text-xs text-ios-gray">{tenants.length}</p>
              </button>

              <button
                onClick={() => handleTabChange('/enhancedlandlorddashboard/applications')}
                className="bg-white rounded-ios-card p-4 shadow-ios-sm active:scale-95 transition-all duration-200 border border-gray-100"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-ios-purple to-ios-indigo rounded-ios mx-auto mb-2 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-medium text-ios-gray-dark">Applications</p>
                <p className="text-xs text-ios-gray">{applications.length}</p>
              </button>

              <button
                onClick={() => handleTabChange('/enhancedlandlorddashboard/maintenance')}
                className="bg-white rounded-ios-card p-4 shadow-ios-sm active:scale-95 transition-all duration-200 border border-gray-100"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-ios-orange to-ios-red rounded-ios mx-auto mb-2 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-medium text-ios-gray-dark">Maintenance</p>
                <p className="text-xs text-ios-gray">{activeMaintenanceRequests}</p>
                {activeMaintenanceRequests > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-ios-red rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{activeMaintenanceRequests}</span>
                  </div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('/enhancedlandlorddashboard/payments')}
                className="bg-white rounded-ios-card p-4 shadow-ios-sm active:scale-95 transition-all duration-200 border border-gray-100"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-ios-teal to-ios-green rounded-ios mx-auto mb-2 flex items-center justify-center">
                  <RIcon className="w-7 h-7 text-white" />
                </div>
                <p className="text-xs font-medium text-ios-gray-dark">Payments</p>
                <p className="text-xs text-ios-gray">Track</p>
              </button>


              {/* SwiftBooks */}
              <button 
                onClick={() => handleTabChange('/enhancedlandlorddashboard/reports')}
                className="bg-white rounded-ios-card p-4 shadow-ios-sm active:scale-95 transition-all duration-200 border border-gray-100"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-ios-indigo to-ios-purple rounded-ios mx-auto mb-2 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-medium text-ios-gray-dark">SwiftBooks</p>
                <p className="text-xs text-ios-gray">Analytics</p>
              </button>

              <button
                onClick={() => handleTabChange('/enhancedlandlorddashboard/leases')}
                className="bg-white rounded-ios-card p-4 shadow-ios-sm active:scale-95 transition-all duration-200 border border-gray-100"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-ios-pink to-ios-red rounded-ios mx-auto mb-2 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-medium text-ios-gray-dark">Leases</p>
                <p className="text-xs text-ios-gray">Manage</p>
              </button>

              <button
                onClick={() => navigate('/add-property')}
                className="bg-white rounded-ios-card p-4 shadow-ios-sm active:scale-95 transition-all duration-200 border border-gray-100"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-ios-gray to-ios-gray-dark rounded-ios mx-auto mb-2 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-medium text-ios-gray-dark">Add Property</p>
                <p className="text-xs text-ios-gray">New</p>
              </button>

              <button
                onClick={() => handleTabChange('/enhancedlandlorddashboard/inventory')}
                className="bg-white rounded-ios-card p-4 shadow-ios-sm active:scale-95 transition-all duration-200 border border-gray-100"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-ios-blue-light to-ios-teal rounded-ios mx-auto mb-2 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-medium text-ios-gray-dark">Inventory</p>
                <p className="text-xs text-ios-gray">Photos & Notes</p>
              </button>

              <button
                onClick={() => handleTabChange('/enhancedlandlorddashboard/inspection')}
                className="bg-white rounded-ios-card p-4 shadow-ios-sm active:scale-95 transition-all duration-200 border border-gray-100"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-ios-purple to-ios-pink rounded-ios mx-auto mb-2 flex items-center justify-center">
                  <Clipboard className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-medium text-ios-gray-dark">Inspection</p>
                <p className="text-xs text-ios-gray">View & Start</p>
              </button>

              {/* Support */}
              <button
                onClick={() => navigate('/enhancedlandlorddashboard/support')}
                className="bg-white rounded-ios-card p-4 shadow-ios-sm active:scale-95 transition-all duration-200 border border-gray-100"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-ios-blue to-ocean-blue rounded-ios mx-auto mb-2 flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-medium text-ios-gray-dark">Support</p>
                <p className="text-xs text-ios-gray">Help & Resources</p>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          {(properties.length > 0 || tenants.length > 0) && (
            <div className="bg-white rounded-ios-card p-4 shadow-ios-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-ios-gray-dark mb-3">Recent Activity</h3>
              
              {tenants.length > 0 && (
                <div className="space-y-3">
                  {tenants.slice(0, 3).map((tenant) => (
                    <div key={tenant.id} className="flex items-center gap-3 p-2 rounded-ios bg-ios-gray-light/30">
                      <div className="w-8 h-8 bg-gradient-to-br from-ios-green to-ios-green-light rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ios-gray-dark">{tenant.name}</p>
                        <p className="text-xs text-ios-gray">R{tenant.monthly_rent.toLocaleString()}/month</p>
                      </div>
                      <div className="text-right">
                        <div className={`w-2 h-2 rounded-full ${
                          tenant.payment_status === 'paid' ? 'bg-ios-green' : 
                          tenant.payment_status === 'pending' ? 'bg-ios-orange' : 'bg-ios-red'
                        }`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {properties.length > 0 && tenants.length === 0 && (
                <div className="text-center py-4">
                  <Building className="w-8 h-8 text-ios-gray mx-auto mb-2" />
                  <p className="text-sm text-ios-gray">No active tenants yet</p>
                  <p className="text-xs text-ios-gray">Your tenants will appear here</p>
                </div>
              )}
            </div>
          )}
        </div>
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
                      navigate(`/property/${property.id}`);
                    }}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={(e) => {
                      e.stopPropagation();
                      navigate('/messages');
                    }}>
                      Message
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
                <Button size="sm" variant="ghost" onClick={() => navigate('/messages')}>
                  Message
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
    // Update the URL when changing tabs, preserving property selection
    const params = selectedPropertyId ? `?property=${selectedPropertyId}` : '';
    navigate(`${tab}${params}`);
  };

  return (
    <VerificationGate requireVerification={true}>
      <EnhancedDashboardLayout 
        title="Landlord Dashboard" 
        currentTab={currentTab}
        onTabChange={handleTabChange}
      >
        {renderTabContent()}
      </EnhancedDashboardLayout>
    </VerificationGate>
  );
}