import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Check } from "lucide-react";
import { LeasePack, ESIGN_CONSENT_TEXT } from "../../types";
import { LeaseSchedulePreview } from "../LeaseSchedulePreview";
import { SignatureSection } from "../SignatureSection";

interface ReviewSignStepProps {
  data: Partial<LeasePack>;
  onComplete: (data: Partial<LeasePack>) => void;
}

export function ReviewSignStep({ data, onComplete }: ReviewSignStepProps) {
  const [consentGiven, setConsentGiven] = useState(false);
  const [landlordSigned, setLandlordSigned] = useState(false);
  const [tenantSigned, setTenantSigned] = useState(false);
  const [signatures, setSignatures] = useState(data.signatures || {
    tenant: {},
    landlord: {},
    initials: []
  });

  const handleLandlordSign = (signatureData: { pngPath?: string; typedName?: string }) => {
    console.log('Landlord signature data:', signatureData);
    const updatedSignatures = {
      ...signatures,
      landlord: {
        ...signatureData,
        signedAt: new Date().toISOString()
      }
    };
    setSignatures(updatedSignatures);
    // Valid if has typed name (both signature types require a name)
    setLandlordSigned(!!signatureData.typedName);
  };

  const handleTenantSign = (signatureData: { pngPath?: string; typedName?: string }) => {
    console.log('Tenant signature data:', signatureData);
    const updatedSignatures = {
      ...signatures,
      tenant: {
        ...signatureData,
        signedAt: new Date().toISOString()
      }
    };
    setSignatures(updatedSignatures);
    // Valid if has typed name (both signature types require a name)
    setTenantSigned(!!signatureData.typedName);
  };

  const handleComplete = () => {
    console.log('Review step completion attempt:', {
      consentGiven,
      landlordSigned,
      tenantSigned,
      signatures
    });

    const now = new Date().toISOString();
    const updatedData: Partial<LeasePack> = {
      ...data,
      signatures,
      consent: {
        ...data.consent,
        eSignConsentVersion: "1.0-ZA",
        landlordConsentedAt: now,
        tenantConsentedAt: now,
      },
      auditLog: [
        ...(data.auditLog || []),
        {
          actor: "system",
          event: "lease_created",
          at: now,
          details: { leaseId: data.core?.leaseId }
        },
        {
          actor: "landlord",
          event: "signature_captured",
          at: signatures.landlord.signedAt || now,
          details: { signatureType: "electronic" }
        },
        {
          actor: "tenant",
          event: "signature_captured", 
          at: signatures.tenant.signedAt || now,
          details: { signatureType: "electronic" }
        }
      ]
    };

    console.log('Calling onComplete with data:', updatedData);
    onComplete(updatedData);
  };

  const isValid = consentGiven && landlordSigned && tenantSigned;
  
  console.log('Validation state:', {
    consentGiven,
    landlordSigned,
    tenantSigned,
    isValid,
    landLordHasName: !!signatures.landlord.typedName,
    landLordHasSignature: !!signatures.landlord.pngPath,
    tenantHasName: !!signatures.tenant.typedName,
    tenantHasSignature: !!signatures.tenant.pngPath
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-4">Review & Electronic Signature</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Review the lease terms below and complete the electronic signature process.
        </p>
      </div>

      {/* Lease Schedule Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Lease Schedule Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeaseSchedulePreview leasePack={data as LeasePack} />
        </CardContent>
      </Card>

      {/* E-Sign Consent */}
      <Card>
        <CardHeader>
          <CardTitle>Electronic Signature Consent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            {ESIGN_CONSENT_TEXT}
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="consent"
              checked={consentGiven}
              onCheckedChange={(checked) => setConsentGiven(!!checked)}
            />
            <Label htmlFor="consent" className="text-sm">
              I agree to the electronic signature terms above
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Signatures */}
      {consentGiven && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Landlord Signature
                {landlordSigned && (
                  <Badge variant="default" className="gap-1">
                    <Check className="w-3 h-3" />
                    Signed
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SignatureSection
                title="Landlord Electronic Signature"
                signer={data.parties?.landlord}
                onSignature={handleLandlordSign}
                disabled={landlordSigned}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Tenant Signature
                {tenantSigned && (
                  <Badge variant="default" className="gap-1">
                    <Check className="w-3 h-3" />
                    Signed
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SignatureSection
                title="Tenant Electronic Signature"
                signer={data.parties?.tenant}
                onSignature={handleTenantSign}
                disabled={tenantSigned}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-end pt-6 border-t">
        <Button 
          onClick={handleComplete} 
          disabled={!isValid}
          className="gap-2"
        >
          <Check className="w-4 h-4" />
          Complete & Generate Lease
        </Button>
      </div>
    </div>
  );
}