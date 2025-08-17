import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Signature, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Tenancy {
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

interface LeaseGeneratorProps {
  tenancy: Tenancy;
  onLeaseGenerated?: () => void;
  onSigningRequested?: () => void;
}

export const LeaseGenerator = ({ 
  tenancy, 
  onLeaseGenerated,
  onSigningRequested 
}: LeaseGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const { user } = useAuth();

  // Status badge with role-aware labels
  const getStatusBadge = (status: string) => {
    const isTenantCtx = user?.id === tenancy.tenant_id;
    const isLandlordCtx = user?.id === tenancy.landlord_id;

    let label = "Draft";
    let variant: "secondary" | "default" | "outline" = "secondary";
    let IconComp: any = Clock;

    if (status === "awaiting_tenant_signature") {
      label = isTenantCtx ? "Awaiting Your Signature" : "Awaiting Tenant Signature";
      variant = "default";
      IconComp = FileText;
    } else if (status === "awaiting_landlord_signature") {
      label = isLandlordCtx ? "Awaiting Your Signature" : "Awaiting Landlord Signature";
      variant = "outline";
      IconComp = Signature;
    } else if (status === "completed") {
      label = "Active & Signed";
      variant = "default";
      IconComp = CheckCircle;
    }

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <IconComp className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const generateLease = async () => {
    setGenerating(true);
    try {
      // Call edge function to generate PDF lease
      const { data, error } = await supabase.functions.invoke('generate-lease', {
        body: { tenancyId: tenancy.id }
      });

      // Edge function will update lease_document_path and set status to awaiting_tenant_signature
      // No direct status update here to avoid race conditions
      if (error) throw error;

      toast.success("Lease document generated successfully");
      onLeaseGenerated?.();
    } catch (error) {
      console.error('Error generating lease:', error);
      toast.error("Failed to generate lease document");
    } finally {
      setGenerating(false);
    }
  };

  // Direct download helper
  const downloadLease = async () => {
    try {
      const title = tenancy.properties?.title || "Lease_Agreement";
      const ref = tenancy.lease_document_path || tenancy.lease_document_url || "";
      if (!ref) {
        toast.error("No document available to download");
        return;
      }

      if (ref.startsWith("http")) {
        const a = document.createElement("a");
        a.href = ref;
        a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.pdf`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      const { data, error } = await supabase.storage
        .from('lease-documents')
        .download(ref);

      if (error) throw error;

      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading lease:', error);
      toast.error("Failed to download lease document");
    }
  };

  const canGenerate = tenancy.lease_status === 'draft';
  const isTenant = user?.id === tenancy.tenant_id;
  const isLandlord = user?.id === tenancy.landlord_id;
  const isCompleted = tenancy.lease_status === 'completed';
  const canDownloadSigned = isCompleted && (tenancy.lease_document_path || tenancy.lease_document_url);
  const canSignForUser = (
    tenancy.lease_status === 'awaiting_tenant_signature' && isTenant
  ) || (
    tenancy.lease_status === 'awaiting_landlord_signature' && isLandlord
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lease Agreement
          </CardTitle>
          {getStatusBadge(tenancy.lease_status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Property:</span> {tenancy.properties?.title}
          </div>
          <div>
            <span className="font-medium">Tenant:</span> {tenancy.tenant_profile?.display_name}
          </div>
          <div>
            <span className="font-medium">Monthly Rent:</span> ${tenancy.monthly_rent}
          </div>
          <div>
            <span className="font-medium">Security Deposit:</span> ${tenancy.security_deposit}
          </div>
          <div>
            <span className="font-medium">Lease Term:</span> {tenancy.start_date} to {tenancy.end_date}
          </div>
          <div>
            <span className="font-medium">Location:</span> {tenancy.properties?.location}
          </div>
        </div>

        {tenancy.landlord_signed_at && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Landlord signed on {new Date(tenancy.landlord_signed_at).toLocaleDateString()}
          </div>
        )}

        {tenancy.tenant_signed_at && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Tenant signed on {new Date(tenancy.tenant_signed_at).toLocaleDateString()}
          </div>
        )}

        <div className="flex gap-2">
          {canGenerate && (
            <Button 
              onClick={generateLease} 
              disabled={generating}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {generating ? "Generating..." : "Generate Lease"}
            </Button>
          )}

          {(tenancy.lease_document_path || tenancy.lease_document_url) && !isCompleted && (
            <Button 
              variant="outline" 
              onClick={() => {
                // For in-progress leases, open the document for viewing
                if (tenancy.lease_document_path) {
                  supabase.storage.from('lease-documents').download(tenancy.lease_document_path).then(({ data, error }) => {
                    if (error) throw error;
                    const blob = new Blob([data], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    window.URL.revokeObjectURL(url);
                  }).catch((err) => {
                    console.error('Error viewing lease:', err);
                    toast.error("Failed to open document");
                  });
                } else if (tenancy.lease_document_url) {
                  window.open(tenancy.lease_document_url, '_blank');
                }
              }}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              View Document
            </Button>
          )}

          {canDownloadSigned && (
            <Button 
              variant="default" 
              onClick={downloadLease}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              Download Signed Lease (PDF)
            </Button>
          )}

          {canSignForUser && !isCompleted && (
            <Button 
              onClick={onSigningRequested}
              className="flex items-center gap-2"
            >
              <Signature className="h-4 w-4" />
              Sign Document
            </Button>
          )}
        </div>

        {isCompleted && (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Lease fully executed by all parties - Tenancy is now active!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
