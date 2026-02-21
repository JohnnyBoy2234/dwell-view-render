// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Home, Users, Wrench, CreditCard, BarChart3, Calendar, MessageSquare, Settings, FileText, Shield } from 'lucide-react';
import { Property } from '@/types/dashboard';
import { PropertyOverview } from '@/components/property/PropertyOverview';
import { PropertyManagementSection } from '@/components/property/PropertyManagementSection';
import { TenantRelations } from '@/components/property/TenantRelations';
import { PropertyOperations } from '@/components/property/PropertyOperations';
import { SalePropertyOverview, SaleCompliance } from '@/components/property/SalePropertyManagement';

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

type TabType = 'overview' | 'management' | 'tenants' | 'operations' | 'deed_of_sale' | 'compliance';

export default function PropertyManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLandlord } = useAuth();
  const { toast } = useToast();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() => 
    (searchParams.get('tab') as TabType) || 'overview'
  );
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
    <div className="min-h-screen bg-gradient-to-br from-ios-gray-light to-white">
      {/* iOS-style Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-ios-gray/10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/enhancedlandlorddashboard')}
            className="p-2 hover:bg-ios-gray/10 rounded-ios"
          >
           <ArrowLeft className="h-5 w-5 text-ios-blue" />
          </Button>
          <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-ios-blue to-ios-blue-light rounded-ios flex items-center justify-center">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-ios-gray-dark">R{property.price.toLocaleString()}{property.listing_type === 'sale' ? '' : '/month'}</h1>
                  <p className="text-sm text-ios-gray">{property.property_type} • {property.location}</p>
              </div>
          </div>
            </div>
            <Badge className={`${getStatusColor(property.status)} rounded-ios font-medium px-3 py-1`}>
              {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
            </Badge>
          </div>
        </div>
        </div>

        {/* Navigation Pills */}
      <div className="px-4 py-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 rounded-ios-card transition-all duration-200 min-w-fit
                  ${isActive 
                    ? `bg-gradient-to-r from-${item.color} to-${item.color}-light text-white shadow-ios-sm` 
                    : 'bg-white/60 text-ios-gray hover:bg-white/80 border border-ios-gray/10'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>
            </div>

           {/* Content Area */}
      <div className="px-4 pb-8 space-y-6">
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
          <div className="text-center text-gray-500 py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Deed of Sale Generator</h3>
            <p className="text-sm text-gray-500">This feature is coming soon. Please use the Overview tab to generate deeds.</p>
          </div>
        )}
        
        {activeTab === 'compliance' && property.listing_type === 'sale' && (
          <SaleCompliance property={property} />
        )}
        
        {activeTab === 'management' && property.listing_type !== 'sale' && (
          <PropertyManagementSection 
            property={property}
          />
        )}
        
        {activeTab === 'tenants' && property.listing_type !== 'sale' && (
          <TenantRelations 
            property={property}
          />
        )}
        
        {activeTab === 'operations' && property.listing_type !== 'sale' && (
          <PropertyOperations 
            property={property}
            maintenanceRequests={maintenanceRequests}
          />
        )}
      </div>
    </div>
  );
}