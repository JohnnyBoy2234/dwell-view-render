// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { ArrowLeft, Home, Users, Wrench, CreditCard, BarChart3, Calendar, MessageSquare, Settings, FileText, Shield, Key } from 'lucide-react';
import { Property } from '@mzanzihomes/common/types/dashboard';
import { PropertyOverview } from '@/components/property/PropertyOverview';
import { PropertyManagementSection } from '@/components/property/PropertyManagementSection';
import { TenantRelations } from '@/components/property/TenantRelations';
import { TenantInviteSection } from '@/components/property/TenantInviteSection';
import { PropertyOperations } from '@/components/property/PropertyOperations';
import { SalePropertyOverview, SaleCompliance } from '@/components/property/SalePropertyManagement';
import { SellingJourney } from '@/components/property/SellingJourney';

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

type TabType = 'overview' | 'management' | 'tenants' | 'operations' | 'deed_of_sale' | 'compliance' | 'selling_journey';

export default function PropertyManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLandlord } = useAuth();
  const { toast } = useToast();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tabFromUrl = searchParams.get('tab');
    return (tabFromUrl as TabType) || 'overview';
  });
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);

  const handleTabChange = (value: TabType) => {
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
      console.log('Fetched property data:', data);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-success-green/10 text-success-green border-success-green/20';
      case 'rented':
        return 'bg-ocean-blue/10 text-ocean-blue border-ocean-blue/20';
      case 'maintenance':
        return 'bg-earth-warm/10 text-earth-warm border-earth-warm/20';
      default:
        return 'bg-ios-gray/10 text-ios-gray border-ios-gray/20';
    }
  };

  const navigationItems = property?.listing_type === 'sale' ? [
    {
      id: 'overview' as TabType,
      label: 'Overview',
      icon: BarChart3,
      color: 'ios-blue'
    },
    {
      id: 'deed_of_sale' as TabType,
      label: 'Deed of Sale',
      icon: FileText,
      color: 'ios-green'
    },
    {
      id: 'compliance' as TabType,
      label: 'Legal & Compliance',
      icon: Shield,
      color: 'ios-purple'
    },
    {
      id: 'selling_journey' as TabType,
      label: 'Selling Journey',
      icon: Key,
      color: 'ios-orange'
    }
  ] : [
    {
      id: 'overview' as TabType,
      label: 'Overview',
      icon: BarChart3,
      color: 'ios-blue'
    },
    {
      id: 'management' as TabType,
      label: 'Management',
      icon: Settings,
      color: 'ios-green'
    },
    {
      id: 'tenants' as TabType,
      label: 'Tenants',
      icon: Users,
      color: 'ios-purple'
    },
    {
      id: 'operations' as TabType,
      label: 'Operations',
      icon: Wrench,
      color: 'ios-orange'
    }
  ];

  console.log('Property listing type:', property?.listing_type);
  console.log('Navigation items:', navigationItems);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ios-gray-light to-white flex items-center justify-center">
          <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ios-blue mx-auto"></div>
          <p className="mt-2 text-ios-gray">Loading property...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ios-gray-light to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-ios-gray-dark">Property not found</h1>
          <Button 
            onClick={() => navigate('/enhancedlandlorddashboard')}
            className="bg-ios-blue hover:bg-ios-blue-dark text-white"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-4" style={{ minHeight: '100dvh', paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      <div className="mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-4 w-full">
        {/* Property Details Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow duration-300 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-ocean-blue to-ocean-blue-light rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{property.title}</h2>
                <p className="text-sm text-gray-600">{property.location}</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/enhancedlandlorddashboard')}
              className="bg-ocean-blue hover:bg-ocean-blue-dark text-white"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Management Tools Grid */}
        {property.listing_type === 'sale' ? (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Sale Property Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => handleTabChange('deed_of_sale')}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Deed of Sale</h4>
                    <p className="text-sm text-gray-600">Generate and manage sale documents</p>
                  </div>
                </div>
              </div>
              <div
                onClick={() => handleTabChange('compliance')}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Legal & Compliance</h4>
                    <p className="text-sm text-gray-600">Upload documents and certificates</p>
                  </div>
                </div>
              </div>
              <div
                onClick={() => handleTabChange('selling_journey')}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <Key className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Selling Journey</h4>
                    <p className="text-sm text-gray-600">Track your 9-step conveyancing process</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Rental Property Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => handleTabChange('management')}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Management</h4>
                    <p className="text-sm text-gray-600">Property settings and configuration</p>
                  </div>
                </div>
              </div>
              <div 
                onClick={() => handleTabChange('tenants')}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Tenants</h4>
                    <p className="text-sm text-gray-600">Manage tenant relationships</p>
                  </div>
                </div>
              </div>
              <div 
                onClick={() => handleTabChange('operations')}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Operations</h4>
                    <p className="text-sm text-gray-600">Maintenance and operations</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content Area */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            property.listing_type === 'sale' ? (
              <SalePropertyOverview property={property} />
            ) : (
              <PropertyOverview 
                property={property} 
                maintenanceRequests={maintenanceRequests}
              />
            )
          )}
          
          {activeTab === 'deed_of_sale' && property.listing_type === 'sale' && (
            <SalePropertyOverview property={property} />
          )}
          
          {activeTab === 'compliance' && property.listing_type === 'sale' && (
            <SaleCompliance property={property} />
          )}

          {activeTab === 'selling_journey' && property.listing_type === 'sale' && (
            <SellingJourney propertyId={property.id} />
          )}
          
          {activeTab === 'management' && property.listing_type !== 'sale' && (
            <PropertyManagementSection 
              property={property}
            />
          )}
          
          {activeTab === 'tenants' && property.listing_type !== 'sale' && (
            <div className="space-y-4">
              <TenantRelations property={property} />
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <TenantInviteSection propertyId={property.id} />
              </div>
            </div>
          )}
          
          {activeTab === 'operations' && property.listing_type !== 'sale' && (
            <PropertyOperations 
              property={property}
              maintenanceRequests={maintenanceRequests}
            />
          )}
        </div>
      </div>
    </div>
  );
}