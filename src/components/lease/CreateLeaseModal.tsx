import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLeaseContracts } from '@/hooks/useLeaseContracts';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CreateLeaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TenantOption {
  id: string;
  name: string;
  email: string;
}

interface PropertyOption {
  id: string;
  title: string;
  location: string;
}

export function CreateLeaseModal({ open, onOpenChange }: CreateLeaseModalProps) {
  const { user } = useAuth();
  const { createContract } = useLeaseContracts();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [tenantEmail, setTenantEmail] = useState<string>('');
  const [useExistingTenant, setUseExistingTenant] = useState(true);

  useEffect(() => {
    if (open && user) {
      fetchTenants();
      fetchProperties();
    }
  }, [open, user]);

  const fetchTenants = async () => {
    if (!user) return;

    try {
      // Fetch tenants from existing tenancies and ACCEPTED applications
      const { data: tenanciesData, error: tenanciesError } = await supabase
        .from('tenancies')
        .select(`
          tenant_id,
          tenant_profiles:profiles!tenant_id(display_name, user_id)
        `)
        .eq('landlord_id', user.id)
        .not('tenant_profiles', 'is', null);

      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select(`
          tenant_id,
          tenant_profiles:profiles!tenant_id(display_name, user_id)
        `)
        .eq('landlord_id', user.id)
        .eq('status', 'accepted')
        .not('tenant_profiles', 'is', null);

      if (tenanciesError && applicationsError) {
        console.error('Error fetching tenants:', tenanciesError, applicationsError);
        return;
      }

      // Combine and deduplicate tenants
      const allTenants = [
        ...(tenanciesData || []),
        ...(applicationsData || [])
      ];

      const uniqueTenants = Array.from(
        new Map(allTenants.map((t: any) => [
          t.tenant_id,
          {
            id: t.tenant_id,
            name: t.tenant_profiles?.display_name || 'Unknown Tenant',
            email: '' // We'd need to get this from auth.users but that's not accessible
          }
        ])).values()
      );

      setTenants(uniqueTenants);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchProperties = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, location')
        .eq('landlord_id', user.id);

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const handleCreateLease = async () => {
    if (!selectedProperty) {
      toast.error('Please select a property');
      return;
    }

    if (useExistingTenant && !selectedTenant) {
      toast.error('Please select a tenant');
      return;
    }

    if (!useExistingTenant && !tenantEmail) {
      toast.error('Please enter tenant email');
      return;
    }

    setLoading(true);

    try {
      const property = properties.find(p => p.id === selectedProperty);
      const selectedTenantData = tenants.find(t => t.id === selectedTenant);

      const contractData = {
        propertyAddress: property ? `${property.title}, ${property.location}` : '',
        tenantEmail: useExistingTenant ? '' : tenantEmail,
        tenantName: useExistingTenant ? selectedTenantData?.name : '',
        landlordName: user?.user_metadata?.full_name || user?.user_metadata?.name || 'Landlord',
        landlordEmail: user?.email || ''
      };

      const contractId = await createContract(contractData, selectedProperty);

      if (contractId) {
        // Update contract with tenant_id if using existing tenant
        if (useExistingTenant && selectedTenant) {
          await supabase
            .from('lease_contracts')
            .update({ tenant_id: selectedTenant })
            .eq('id', contractId);
        }

        onOpenChange(false);
        navigate(`/lease/builder/${contractId}`);
      }
    } catch (error) {
      console.error('Error creating lease:', error);
      toast.error('Failed to create lease contract');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedTenant('');
    setSelectedProperty('');
    setTenantEmail('');
    setUseExistingTenant(true);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Lease Contract</DialogTitle>
          <DialogDescription>
            Select a property and tenant to create a new lease contract.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="property">Property *</Label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger>
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.title} - {property.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Tenant Selection</Label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={useExistingTenant}
                  onChange={() => setUseExistingTenant(true)}
                />
                <span>Existing Tenant</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={!useExistingTenant}
                  onChange={() => setUseExistingTenant(false)}
                />
                <span>New Tenant</span>
              </label>
            </div>

            {useExistingTenant ? (
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="tenantEmail">Tenant Email *</Label>
                <Input
                  id="tenantEmail"
                  type="email"
                  placeholder="Enter tenant email address"
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateLease} disabled={loading}>
            {loading ? 'Creating...' : 'Create Lease'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}