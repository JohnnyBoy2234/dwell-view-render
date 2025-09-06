import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lease, LeaseWithSignatures, LeaseStatus, LeaseRole, LeaseData } from '@/types/lease';
import { useToast } from '@/hooks/use-toast';

export function useLease(leaseId: string | null) {
  const [lease, setLease] = useState<LeaseWithSignatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!leaseId) {
      setLease(null);
      setLoading(false);
      return;
    }

    fetchLease();
  }, [leaseId]);

  const fetchLease = async () => {
    if (!leaseId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch lease with signatures and audit logs
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .select(`
          *,
          signatures:lease_signatures(*),
          audit_logs:lease_audit_logs(*)
        `)
        .eq('id', leaseId)
        .single();

      if (leaseError) throw leaseError;

      setLease(leaseData as unknown as LeaseWithSignatures);
    } catch (err) {
      console.error('Error fetching lease:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch lease');
      toast({
        title: "Error",
        description: "Failed to load lease details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateLease = async (propertyId: string, tenantUserId?: string, leaseData?: Partial<LeaseData>) => {
    try {
      const { data, error } = await supabase.functions.invoke('lease-management', {
        body: {
          action: 'generate',
          property_id: propertyId,
          tenant_user_id: tenantUserId,
          lease_data: leaseData
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lease generated successfully",
      });

      return data.lease;
    } catch (err) {
      console.error('Error generating lease:', err);
      toast({
        title: "Error",
        description: "Failed to generate lease",
        variant: "destructive",
      });
      throw err;
    }
  };

  const signLease = async (role: LeaseRole, signaturePngBase64: string) => {
    if (!leaseId) throw new Error('No lease ID provided');

    try {
      const { data, error } = await supabase.functions.invoke('lease-management', {
        body: {
          action: 'sign',
          lease_id: leaseId,
          role,
          signature_png_base64: signaturePngBase64
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lease signed successfully",
      });

      // Refresh lease data
      await fetchLease();

      return data;
    } catch (err) {
      console.error('Error signing lease:', err);
      toast({
        title: "Error",
        description: "Failed to sign lease",
        variant: "destructive",
      });
      throw err;
    }
  };

  const requestChanges = async (reason: string) => {
    if (!leaseId) throw new Error('No lease ID provided');

    try {
      const { data, error } = await supabase.functions.invoke('lease-management', {
        body: {
          action: 'request-changes',
          lease_id: leaseId,
          reason
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Changes requested successfully",
      });

      // Refresh lease data
      await fetchLease();

      return data;
    } catch (err) {
      console.error('Error requesting changes:', err);
      toast({
        title: "Error",
        description: "Failed to request changes",
        variant: "destructive",
      });
      throw err;
    }
  };

  const cancelLease = async () => {
    if (!leaseId) throw new Error('No lease ID provided');

    try {
      const { data, error } = await supabase.functions.invoke('lease-management', {
        body: {
          action: 'cancel',
          lease_id: leaseId
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lease canceled successfully",
      });

      // Refresh lease data
      await fetchLease();

      return data;
    } catch (err) {
      console.error('Error canceling lease:', err);
      toast({
        title: "Error",
        description: "Failed to cancel lease",
        variant: "destructive",
      });
      throw err;
    }
  };

  const downloadLease = async (type: 'draft' | 'signed' = 'draft') => {
    if (!lease) return;

    try {
      const url = type === 'signed' ? lease.pdf_signed_url : lease.pdf_draft_url;
      if (!url) {
        toast({
          title: "Error",
          description: `${type} PDF not available`,
          variant: "destructive",
        });
        return;
      }

      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = url;
      link.download = `lease_${lease.id}_${type}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log download action
      await supabase.functions.invoke('lease-management', {
        body: {
          action: 'log-action',
          lease_id: leaseId,
          action_type: 'DOWNLOADED',
          metadata: { type }
        }
      });

    } catch (err) {
      console.error('Error downloading lease:', err);
      toast({
        title: "Error",
        description: "Failed to download lease",
        variant: "destructive",
      });
    }
  };

  return {
    lease,
    loading,
    error,
    generateLease,
    signLease,
    requestChanges,
    cancelLease,
    downloadLease,
    refetch: fetchLease
  };
}

export function useLeases(propertyId?: string, userId?: string) {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (propertyId || userId) {
      fetchLeases();
    }
  }, [propertyId, userId]);

  const fetchLeases = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('leases')
        .select('*')
        .order('created_at', { ascending: false });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      } else if (userId) {
        query = query.or(`landlord_user_id.eq.${userId},tenant_user_id.eq.${userId}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLeases((data || []) as unknown as Lease[]);
    } catch (err) {
      console.error('Error fetching leases:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leases');
      toast({
        title: "Error",
        description: "Failed to load leases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    leases,
    loading,
    error,
    refetch: fetchLeases
  };
}
