import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Home, Users, Wrench, CreditCard, BarChart3, Calendar, MessageSquare, Settings } from 'lucide-react';
import { Property } from '@/types/dashboard';
import { PropertyOverview } from '@/components/property/PropertyOverview';
import { PropertyManagementSection } from '@/components/property/PropertyManagementSection';
import { TenantRelations } from '@/components/property/TenantRelations';
import { PropertyOperations } from '@/components/property/PropertyOperations';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';

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

type TabType = 'overview' | 'management' | 'tenants' | 'operations';

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

  const navigationItems = [
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

  // Get the current location for the active tab
  const location = useLocation();
  const currentPath = location.pathname;

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
    <EnhancedDashboardLayout 
      title={`${property.property_type} • ${property.location}`}
      currentTab={currentPath}
      onTabChange={(tab) => navigate(tab)}
      selectedPropertyId={id}
      onBackToProperties={() => navigate('/enhancedlandlorddashboard')}
    >
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-ios-blue to-ios-blue-light rounded-xl flex items-center justify-center">
              <Home className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ios-gray-dark">R{property.price.toLocaleString()}/month</h1>
              <p className="text-sm text-ios-gray">{property.property_type} • {property.location}</p>
            </div>
          </div>
          <Badge className={`${getStatusColor(property.status)} rounded-lg font-medium px-3 py-1`}>
            {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
          </Badge>
        </div>

        {/* Navigation Pills */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 min-w-fit
                    ${isActive 
                      ? `bg-gradient-to-r from-${item.color} to-${item.color}-light text-white shadow-md` 
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
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <PropertyOverview 
              property={property} 
              maintenanceRequests={maintenanceRequests}
            />
          )}
          
          {activeTab === 'management' && (
            <PropertyManagementSection 
              property={property}
            />
          )}
          
          {activeTab === 'tenants' && (
            <TenantRelations 
              property={property}
            />
          )}
          
          {activeTab === 'operations' && (
            <PropertyOperations 
              property={property}
              maintenanceRequests={maintenanceRequests}
            />
          )}
        </div>
      </div>
    </EnhancedDashboardLayout>
  );
}