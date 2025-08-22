import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface RentDue {
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  tenancyId: string;
}

interface TenantProperty {
  id: string;
  title: string;
  location: string;
  images: string[];
  monthlyRent: number;
  leaseEndDate: string;
  securityDeposit: number;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  status: 'submitted' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  priority: 'low' | 'medium' | 'high';
}

export function useTenantDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rentDue, setRentDue] = useState<RentDue | null>(null);
  const [tenantProperty, setTenantProperty] = useState<TenantProperty | null>(null);
  const [recentMaintenance, setRecentMaintenance] = useState<MaintenanceRequest[]>([]);
  const [upcomingViewings, setUpcomingViewings] = useState<any[]>([]);

  const fetchTenantData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch active tenancy and property
      const { data: tenancyData, error: tenancyError } = await supabase
        .from('tenancies')
        .select(`
          id,
          monthly_rent,
          end_date,
          security_deposit,
          property_id,
          properties (
            id,
            title,
            location,
            images
          )
        `)
        .eq('tenant_id', user.id)
        .eq('status', 'active')
        .single();

      if (tenancyError && tenancyError.code !== 'PGRST116') throw tenancyError;

      if (tenancyData) {
        setTenantProperty({
          id: tenancyData.properties.id,
          title: tenancyData.properties.title,
          location: tenancyData.properties.location,
          images: tenancyData.properties.images || [],
          monthlyRent: tenancyData.monthly_rent,
          leaseEndDate: tenancyData.end_date,
          securityDeposit: tenancyData.security_deposit || 0,
        });

        // Fetch next rent payment due
        const { data: rentData, error: rentError } = await supabase
          .from('rent_payments')
          .select('*')
          .eq('tenancy_id', tenancyData.id)
          .eq('status', 'pending')
          .order('due_date', { ascending: true })
          .limit(1);

        if (rentError) throw rentError;

        if (rentData && rentData.length > 0) {
          const payment = rentData[0];
          const today = new Date();
          const dueDate = new Date(payment.due_date);
          const isOverdue = dueDate < today;
          
          setRentDue({
            amount: payment.amount,
            dueDate: payment.due_date,
            status: isOverdue ? 'overdue' : 'pending',
            tenancyId: tenancyData.id,
          });
        }
      }

      // Fetch recent maintenance requests
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('maintenance_requests')
        .select('id, title, status, created_at, priority')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (maintenanceError) throw maintenanceError;
      setRecentMaintenance((maintenanceData || []).map(item => ({
        ...item,
        status: item.status as 'submitted' | 'in_progress' | 'completed' | 'cancelled',
        priority: item.priority as 'low' | 'medium' | 'high'
      })));

      // Fetch upcoming viewings (for viewing requests)
      const { data: viewingData, error: viewingError } = await supabase
        .from('viewing_slots')
        .select(`
          id,
          start_time,
          end_time,
          status,
          property_id,
          properties (
            title,
            location
          )
        `)
        .eq('booked_by_tenant_id', user.id)
        .eq('status', 'booked')
        .gt('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(3);

      if (viewingError) throw viewingError;
      setUpcomingViewings(viewingData || []);

    } catch (error: any) {
      console.error('Error fetching tenant dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
  }, [user]);

  return {
    loading,
    rentDue,
    tenantProperty,
    recentMaintenance,
    upcomingViewings,
    refetch: fetchTenantData,
  };
}