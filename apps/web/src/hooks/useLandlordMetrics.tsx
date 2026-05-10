// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface LandlordMetrics {
  totalProperties: number;
  totalTenants: number;
  pendingApplications: number;
  totalRentDue: number;
  availableProperties: number;
  occupiedProperties: number;
  monthlyRevenue: number;
}

export function useLandlordMetrics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<LandlordMetrics>({
    totalProperties: 0,
    totalTenants: 0,
    pendingApplications: 0,
    totalRentDue: 0,
    availableProperties: 0,
    occupiedProperties: 0,
    monthlyRevenue: 0,
  });

  const fetchMetrics = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch properties count and status
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, status, price')
        .eq('landlord_id', user.id);

      if (propertiesError) throw propertiesError;

      const totalProperties = propertiesData?.length || 0;
      const availableProperties = propertiesData?.filter(p => p.status === 'available').length || 0;
      const occupiedProperties = totalProperties - availableProperties;

      // Fetch active tenants count
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenancies')
        .select('id, monthly_rent')
        .eq('landlord_id', user.id)
        .eq('status', 'active');

      if (tenantsError) throw tenantsError;
      
      const totalTenants = tenantsData?.length || 0;
      const monthlyRevenue = tenantsData?.reduce((sum, t) => sum + t.monthly_rent, 0) || 0;

      // Fetch pending applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select('id')
        .eq('landlord_id', user.id)
        .eq('status', 'pending');

      if (applicationsError) throw applicationsError;
      const pendingApplications = applicationsData?.length || 0;

      // Fetch total rent due (unpaid)
      const { data: rentDueData, error: rentDueError } = await supabase
        .from('rent_payments')
        .select('amount')
        .eq('status', 'pending')
        .in('tenancy_id', tenantsData?.map(t => t.id) || []);

      if (rentDueError && rentDueError.code !== 'PGRST116') throw rentDueError;
      const totalRentDue = rentDueData?.reduce((sum, r) => sum + r.amount, 0) || 0;

      setMetrics({
        totalProperties,
        totalTenants,
        pendingApplications,
        totalRentDue,
        availableProperties,
        occupiedProperties,
        monthlyRevenue,
      });

    } catch (error: any) {
      console.error('Error fetching landlord metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [user]);

  return {
    loading,
    metrics,
    refetch: fetchMetrics,
  };
}