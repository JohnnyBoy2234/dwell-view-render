// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { FileText, ArrowLeft } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { toast } from 'sonner';
import { LeasePreviewModal } from '@mzanzihomes/features/lease';
import { SuccessDialog } from '@mzanzihomes/ui/components/SuccessDialog';
import { DEFAULT_WIZARD_DATA, type LeaseWizardData } from '@mzanzihomes/common/types/lease';

interface SignatureInfo {
  imageUrl: string;
  name: string;
  signedAt: string;
}

export function LeaseSignature() {
  const { contractId } = useParams<{ contractId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const [wizardData, setWizardData] = useState<LeaseWizardData>(DEFAULT_WIZARD_DATA);
  const [landlordSignature, setLandlordSignature] = useState<SignatureInfo | undefined>();
  const [tenantSignature, setTenantSignature] = useState<SignatureInfo | undefined>();
  const [showPreview, setShowPreview] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isFullySigned, setIsFullySigned] = useState(false);

  useEffect(() => {
    if (contractId) {
      loadContract(contractId);
    }
  }, [contractId]);

  const loadContract = async (id: string) => {
    setIsLoading(true);
    try {
      const { data: contractData, error } = await supabase
        .from('lease_contracts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      setContract(contractData);
      
      if (contractData?.contract_data) {
        setWizardData({ ...DEFAULT_WIZARD_DATA, ...contractData.contract_data });
      }
      
      // Load landlord signature
      if (contractData?.landlord_signed_at && contractData?.landlord_signature_data) {
        const sigData = contractData.landlord_signature_data as any;
        setLandlordSignature({
          imageUrl: sigData.signature_image_url || sigData.signatureImageUrl,
          name: contractData.contract_data?.landlordFullName || 'Landlord',
          signedAt: new Date(contractData.landlord_signed_at).toLocaleString(),
        });
      }
      
      // Load tenant signature
      if (contractData?.tenant_signed_at && contractData?.tenant_signature_data) {
        const sigData = contractData.tenant_signature_data as any;
        setTenantSignature({
          imageUrl: sigData.signature_image_url || sigData.signatureImageUrl,
          name: contractData.contract_data?.tenantFullName || 'Tenant',
          signedAt: new Date(contractData.tenant_signed_at).toLocaleString(),
        });
        setIsFullySigned(!!contractData.landlord_signed_at);
      }
      
      // Auto-open preview if contract is valid
      if (contractData && !contractData.tenant_signed_at) {
        setShowPreview(true);
      }
    } catch (err) {
      console.error('Error loading contract:', err);
      toast.error('Failed to load contract');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTenantSign = async (signatureDataUrl: string) => {
    if (!contractId || !user) return;
    
    setIsSigning(true);
    try {
      // Get IP address
      let ipAddress = 'unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch {}
      
      const signatureData = {
        signature_image_url: signatureDataUrl,
        signed_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
        consent_acknowledged: true,
      };
      
      const bothSigned = !!landlordSignature;
      
      const { error } = await supabase
        .from('lease_contracts')
        .update({
          tenant_signed_at: new Date().toISOString(),
          tenant_signature_data: signatureData as any,
          status: bothSigned ? 'signed' : 'pending_landlord',
        })
        .eq('id', contractId);
      
      if (error) throw error;
      
      setTenantSignature({
        imageUrl: signatureDataUrl,
        name: wizardData.tenantFullName,
        signedAt: new Date().toLocaleString(),
      });
      
      setIsFullySigned(bothSigned);
      setShowPreview(false);
      setShowSuccessDialog(true);
      
      // Create tenancy record and generate PDF if both signed
      if (bothSigned && contract?.property_id) {
        try {
          // Create tenancy record to link tenant to property
          const leaseStart = wizardData.leaseStartDate || new Date().toISOString().split('T')[0];
          const leaseEnd = wizardData.leaseEndDate || 
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          await supabase.from('tenancies').insert({
            property_id: contract.property_id,
            tenant_id: user.id,
            landlord_id: contract.landlord_id,
            start_date: leaseStart,
            end_date: leaseEnd,
            monthly_rent: wizardData.rentAmount || 0,
            security_deposit: wizardData.depositAmount || 0,
            status: 'active',
          });
        } catch (tenancyErr) {
          console.error('Tenancy creation error:', tenancyErr);
          // Don't fail the signing if tenancy creation fails
        }
        
        try {
          await supabase.functions.invoke('generate-lease-pdf', {
            body: { contractId }
          });
        } catch (pdfErr) {
          console.error('PDF generation error:', pdfErr);
        }
      }
    } catch (err) {
      console.error('Error signing:', err);
      toast.error('Failed to sign contract');
    } finally {
      setIsSigning(false);
    }
  };

  const handleUpdateTenantDetails = async (updates: Partial<LeaseWizardData>) => {
    if (!contractId) return;
    const newData = { ...wizardData, ...updates };
    const { error } = await supabase
      .from('lease_contracts')
      .update({ contract_data: newData as any, updated_at: new Date().toISOString() })
      .eq('id', contractId);
    if (error) throw error;
    setWizardData(newData);
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    navigate('/leases');
  };

  const handleDownloadPdf = async () => {
    if (!contract?.pdf_url) {
      toast.error('PDF not yet available');
      return;
    }
    window.open(contract.pdf_url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading lease...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Contract Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The lease contract you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/leases')}>
              Back to Leases
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already signed by tenant
  if (tenantSignature) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate('/leases')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leases
          </Button>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="h-12 w-12 mx-auto text-green-600 mb-4 flex items-center justify-center">
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">Already Signed</h3>
              <p className="text-muted-foreground mb-4">
                You have already signed this lease agreement.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowPreview(true)}>
                  View Lease
                </Button>
                {isFullySigned && contract.pdf_url && (
                  <Button onClick={handleDownloadPdf}>
                    Download PDF
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <LeasePreviewModal
          open={showPreview}
          onOpenChange={setShowPreview}
          wizardData={wizardData}
          mode="tenant"
          landlordSignature={landlordSignature}
          tenantSignature={tenantSignature}
          onDownloadPdf={isFullySigned ? handleDownloadPdf : undefined}
          contractStatus={contract.status}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/leases')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leases
        </Button>

        <Card>
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-primary mb-4" />
            <h3 className="text-lg font-medium mb-2">Review & Sign Lease</h3>
            <p className="text-muted-foreground mb-4">
              {wizardData.landlordFullName} has sent you a lease agreement to review and sign.
            </p>
            <Button onClick={() => setShowPreview(true)}>
              Open Lease Agreement
            </Button>
          </CardContent>
        </Card>
      </div>

      <LeasePreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        wizardData={wizardData}
        mode="tenant"
        landlordSignature={landlordSignature}
        tenantSignature={tenantSignature}
        onSign={handleTenantSign}
        onUpdateTenantDetails={handleUpdateTenantDetails}
        isSigning={isSigning}
        contractStatus={contract.status}
      />

      <SuccessDialog
        open={showSuccessDialog}
        onClose={handleSuccessClose}
        icon={isFullySigned ? 'star' : 'check'}
        title={isFullySigned ? 'Lease Complete!' : 'You\'ve Signed the Lease!'}
        subtitle={isFullySigned 
          ? 'Both parties have signed. The lease is now legally binding.'
          : 'Your signature has been recorded.'
        }
        nextSteps={isFullySigned ? [
          { title: 'Download your copy', description: 'Get the fully signed PDF for your records' },
          { title: 'Move-in preparation', description: 'Get ready for your new home!' },
        ] : [
          { title: 'Landlord signature', description: 'Waiting for the landlord to sign' },
          { title: 'Final contract', description: 'You\'ll receive the completed PDF once signed' },
        ]}
        primaryAction={{
          label: 'View My Leases',
          onClick: handleSuccessClose
        }}
        showConfetti={isFullySigned}
      />
    </div>
  );
}