import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SwiftRentLease {
  id: string;
  property_id: string;
  landlord_id: string;
  tenant_id?: string;
  status: 'draft' | 'pending_signatures' | 'completed' | 'cancelled';
  lease_data: any;
  pdf_url?: string;
  pdf_path?: string;
  html_content?: string;
  landlord_signed_at?: string;
  tenant_signed_at?: string;
  landlord_signature_data?: any;
  tenant_signature_data?: any;
  immutable?: boolean;
  audit_trail?: any[];
  created_at: string;
  updated_at: string;
}

export function useSwiftRentLease(propertyId?: string) {
  const [leases, setLeases] = useState<SwiftRentLease[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchLeases = async () => {
    if (!propertyId || !user) return;

    setLoading(true);
    setError(null);

    try {
      // Use the existing leases table structure for now
      const { data, error: fetchError } = await supabase
        .from('leases')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Map to SwiftRent lease structure
      const mappedLeases: SwiftRentLease[] = data.map(lease => ({
        id: lease.id,
        property_id: lease.property_id,
        landlord_id: lease.landlord_user_id,
        tenant_id: lease.tenant_user_id,
        status: lease.status as any,
        lease_data: lease.lease_data,
        pdf_url: lease.pdf_draft_url || lease.pdf_signed_url,
        html_content: '',
        landlord_signed_at: undefined,
        tenant_signed_at: undefined,
        created_at: lease.created_at,
        updated_at: lease.updated_at,
        immutable: lease.status === 'COMPLETED'
      }));

      setLeases(mappedLeases);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch leases');
    } finally {
      setLoading(false);
    }
  };

  const generateLease = async (propertyId: string, tenantUserId?: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('generate-swiftrent-lease', {
        body: {
          property_id: propertyId,
          tenant_user_id: tenantUserId
        }
      });

      if (error) throw error;

      await fetchLeases(); // Refresh the list
      toast.success('SwiftRent lease agreement generated successfully!');
      return data.lease;
    } catch (error: any) {
      console.error('Error generating lease:', error);
      toast.error('Failed to generate lease agreement');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signLease = async (leaseId: string, signatureData: any) => {
    try {
      setLoading(true);
      
      const userRole = user?.id === leases.find(l => l.id === leaseId)?.landlord_id ? 'landlord' : 'tenant';
      
      // Insert signature record
      const { error: sigError } = await supabase
        .from('lease_signatures')
        .insert({
          lease_id: leaseId,
          signer_id: user?.id,
          signer_role: userRole,
          signature_type: 'electronic',
          ...signatureData
        });

      if (sigError) throw sigError;

      // Update lease status
      const { error: statusError } = await supabase.rpc('update_lease_status', {
        p_lease_id: leaseId,
        p_status: 'pending_signatures' // Let trigger handle completion
      });

      if (statusError) throw statusError;

      await fetchLeases(); // Refresh the list
      toast.success('Lease signed successfully!');
    } catch (error: any) {
      console.error('Error signing lease:', error);
      toast.error('Failed to sign lease');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId) {
      fetchLeases();
    }
  }, [propertyId, user]);

  return {
    leases,
    loading,
    error,
    generateLease,
    signLease,
    refetch: fetchLeases
  };
}