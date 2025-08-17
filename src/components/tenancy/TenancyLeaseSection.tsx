import { useState } from "react";
import { LeaseGenerator } from "../lease/LeaseGenerator";
import { LeaseSigningDialog } from "../lease/LeaseSigningDialog";

interface TenancyData {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  monthly_rent: number;
  security_deposit: number;
  start_date: string;
  end_date: string;
  lease_status: string;
  lease_document_url?: string;
  lease_document_path?: string; // Added for new system
  landlord_signature_url?: string;
  tenant_signature_url?: string;
  landlord_signed_at?: string;
  tenant_signed_at?: string;
  properties?: {
    title: string;
    location: string;
  };
  tenant_profile?: {
    display_name: string;
  };
  landlord_profile?: {
    display_name: string;
  };
}

interface TenancyLeaseSectionProps {
  tenancy: TenancyData;
  onUpdate?: () => void;
}

export const TenancyLeaseSection = ({ tenancy, onUpdate }: TenancyLeaseSectionProps) => {
  const [showSigning, setShowSigning] = useState(false);

  return (
    <>
      <LeaseGenerator
        tenancy={tenancy}
        onLeaseGenerated={onUpdate}
        onSigningRequested={() => setShowSigning(true)}
      />
      
      <LeaseSigningDialog
        isOpen={showSigning}
        onClose={() => setShowSigning(false)}
        tenancyId={tenancy.id}
        leaseDocumentUrl={tenancy.lease_document_path || tenancy.lease_document_url}
        currentStatus={tenancy.lease_status}
        onSigned={() => {
          setShowSigning(false);
          onUpdate?.();
        }}
      />
    </>
  );
};