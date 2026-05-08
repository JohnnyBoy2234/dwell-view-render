// @ts-nocheck
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLeaseContracts } from '@/hooks/useLeaseContracts';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CreateLeaseFromApplicationProps {
  propertyId: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  propertyAddress: string;
  rentAmount?: number;
  onLeaseCreated?: () => void;
}

export function CreateLeaseFromApplication({
  propertyId,
  tenantId,
  tenantName,
  tenantEmail,
  propertyAddress,
  rentAmount,
  onLeaseCreated
}: CreateLeaseFromApplicationProps) {
  const navigate = useNavigate();
  const { createContract } = useLeaseContracts();
  const { user } = useAuth();

  const handleCreateLease = async () => {
    if (!user) return;

    try {
      // Pre-populate contract data with application information
      const contractData = {
        propertyAddress,
        propertyType: 'apartment', // Default, can be changed in builder
        landlordName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        landlordEmail: user.email || '',
        tenantName,
        tenantEmail,
        rentAmount: rentAmount || 0,
        rentCurrency: 'ZAR',
        rentPaymentFrequency: 'monthly' as const,
        rentDueDay: 1,
        leaseStartDate: '',
        leaseEndDate: '',
        jurisdiction: 'South Africa',
        petsAllowed: false,
        smokingAllowed: false,
        guestsAllowed: true,
        sublettingAllowed: false,
        utilitiesIncluded: [],
        utilitiesExcluded: [],
        additionalClauses: [],
        customFields: {
          created_from_application: true,
          application_tenant_id: tenantId
        }
      };

      const contractId = await createContract(contractData, propertyId);
      
      if (contractId) {
        toast.success('Lease contract created successfully');
        onLeaseCreated?.();
        navigate(`/lease/builder/${contractId}`);
      }
    } catch (error) {
      console.error('Error creating lease:', error);
      toast.error('Failed to create lease contract');
    }
  };

  return (
    <Button onClick={handleCreateLease} className="w-full">
      <FileText className="h-4 w-4 mr-2" />
      Create Lease Agreement
      <ArrowRight className="h-4 w-4 ml-2" />
    </Button>
  );
}