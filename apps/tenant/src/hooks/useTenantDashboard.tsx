// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';

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
  // True when the tenant has an active tenancy with a fully-signed lease document.
  // False (but with tenantProperty set) means they're connected via invite only.
  const [hasSignedLease, setHasSignedLease] = useState(false);
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
          lease_document_path,
          tenant_signed_at,
          properties (
            id,
            title,
            location,
            images
          )
        `)
        .eq('tenant_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tenancyError) {
        console.error('Error fetching tenancy data:', tenancyError);
        // Don't throw here, just log the error and continue
      }

      if (tenancyData) {
        // A signed lease means we have a stored lease document or the tenant has signed.
        setHasSignedLease(Boolean(tenancyData.lease_document_path || tenancyData.tenant_signed_at));
        // Ensure we have property details even if FK relationship isn't cached
        let prop = tenancyData.properties as any;
        if (!prop) {
          const { data: p } = await supabase
            .from('properties')
            .select('id,title,location,images')
            .eq('id', tenancyData.property_id)
            .maybeSingle();
          prop = p || null;
        }
        if (prop) {
          setTenantProperty({
            id: prop.id,
            title: prop.title,
            location: prop.location,
            images: prop.images || [],
            monthlyRent: tenancyData.monthly_rent,
            leaseEndDate: tenancyData.end_date,
            securityDeposit: tenancyData.security_deposit || 0,
          });
        }

        // Fetch next rent payment due
        const { data: rentData, error: rentError } = await supabase
          .from('rent_payments')
          .select('*')
          .eq('tenancy_id', tenancyData.id)
          .eq('status', 'pending')
          .order('due_date', { ascending: true })
          .limit(1);

        if (rentError) {
          console.error('Error fetching rent payment data:', rentError);
        }

        if (!rentError && rentData && rentData.length > 0) {
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
      } else {
        // Fallback: Check for signed lease contracts if no active tenancy
        const { data: leaseData, error: leaseError } = await supabase
          .from('lease_contracts')
          .select('property_id, contract_data')
          .eq('tenant_id', user.id)
          .in('status', ['signed', 'pending_tenant'])
          .not('property_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!leaseError && leaseData?.property_id) {
          const { data: prop } = await supabase
            .from('properties')
            .select('id,title,location,images')
            .eq('id', leaseData.property_id)
            .maybeSingle();
          
          if (prop) {
            // Reached via a signed/pending lease contract — treat as leased.
            setHasSignedLease(true);
            const contractData = leaseData.contract_data as any;
            setTenantProperty({
              id: prop.id,
              title: prop.title,
              location: prop.location,
              images: prop.images || [],
              monthlyRent: contractData?.rentAmount || 0,
              leaseEndDate: contractData?.leaseEndDate || '',
              securityDeposit: contractData?.depositAmount || 0,
            });
          }
        }
      }

      // Fetch recent maintenance requests
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('maintenance_requests')
        .select('id, title, status, created_at, priority')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (maintenanceError) {
        console.error('Error fetching maintenance data:', maintenanceError);
      }
      if (!maintenanceError) {
        setRecentMaintenance((maintenanceData || []).map(item => ({
          ...item,
          status: item.status as 'submitted' | 'in_progress' | 'completed' | 'cancelled',
          priority: item.priority as 'low' | 'medium' | 'high'
        })));
      }

      // Fetch upcoming viewings (for viewing requests)
      const { data: viewingData, error: viewingError } = await supabase
        .from('viewing_slots')
        .select('id,start_time,end_time,status,property_id')
        .eq('booked_by_tenant_id', user.id)
        .eq('status', 'booked')
        .gt('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(3);

      if (viewingError) {
        console.error('Error fetching viewing data:', viewingError);
      } else {
        setUpcomingViewings(viewingData || []);
      }

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
    hasSignedLease,
    recentMaintenance,
    upcomingViewings,
    refetch: fetchTenantData,
  };
}