// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { toast } from 'sonner';
import type { LeaseContract, LeaseContractData, LeaseTemplate } from '@mzanzihomes/common/types/lease';

export function useLeaseContracts(propertyId?: string) {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<LeaseContract[]>([]);
  const [templates, setTemplates] = useState<LeaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('lease_contracts')
        .select('*')
        .or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`);
      
      // Filter by property if specified
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setContracts((data || []) as unknown as LeaseContract[]);
    } catch (err) {
      console.error('Error fetching contracts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch contracts');
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('lease_templates')
        .select('*')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []).map(t => ({ ...t, template_data: t.template_content })) as unknown as LeaseTemplate[]);
    } catch (err) {
      console.error('Error fetching templates:', err);
      toast.error('Failed to load templates');
    }
  };

  const createContract = async (contractData: Partial<LeaseContractData>, propertyId?: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('lease_contracts')
        .insert({
          landlord_id: user.id,
          property_id: propertyId,
          title: contractData.propertyAddress ? `Lease for ${contractData.propertyAddress}` : 'New Rental Agreement',
          contract_data: contractData as any,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      // Add audit entry
      await supabase.rpc('add_lease_audit_entry', {
        contract_id: data.id,
        action: 'contract_created',
        actor_id: user.id,
        details: { property_id: propertyId }
      });

      toast.success('Contract created successfully');
      fetchContracts();
      return data.id;
    } catch (err) {
      console.error('Error creating contract:', err);
      toast.error('Failed to create contract');
      return null;
    }
  };

  const updateContract = async (contractId: string, updates: Partial<LeaseContract>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('lease_contracts')
        .update(updates as any)
        .eq('id', contractId);

      if (error) throw error;

      // Add audit entry
      await supabase.rpc('add_lease_audit_entry', {
        contract_id: contractId,
        action: 'contract_updated',
        actor_id: user.id,
        details: { updated_fields: Object.keys(updates) }
      });

      toast.success('Contract updated successfully');
      fetchContracts();
      return true;
    } catch (err) {
      console.error('Error updating contract:', err);
      toast.error('Failed to update contract');
      return false;
    }
  };

  const deleteContract = async (contractId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('lease_contracts')
        .delete()
        .eq('id', contractId);

      if (error) throw error;

      toast.success('Contract deleted successfully');
      fetchContracts();
      return true;
    } catch (err) {
      console.error('Error deleting contract:', err);
      toast.error('Failed to delete contract');
      return false;
    }
  };

  const generatePDF = async (contractId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.functions.invoke('generate-lease-pdf', {
        body: { contractId, force: true, ts: Date.now() }
      });

      if (error) throw error;

      toast.success('PDF generated successfully');
      fetchContracts();
      return data.pdfUrl;
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF');
      return null;
    }
  };

  const searchContracts = async (query: string): Promise<LeaseContract[]> => {
    if (!user || !query.trim()) return contracts;

    try {
      const { data, error } = await supabase
        .from('lease_contracts')
        .select('*')
        .or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`)
        .textSearch('search_vector', query)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as LeaseContract[];
    } catch (err) {
      console.error('Error searching contracts:', err);
      return [];
    }
  };

  useEffect(() => {
    if (user) {
      fetchContracts();
      fetchTemplates();
    }
  }, [user, propertyId]);

  return {
    contracts,
    templates,
    loading,
    error,
    createContract,
    updateContract,
    deleteContract,
    generatePDF,
    searchContracts,
    refetch: fetchContracts
  };
}