import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Signature, Clock, CheckCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LeaseAgreement {
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
  created_at: string;
  updated_at: string;
  immutable?: boolean;
}

interface SwiftRentLeaseGeneratorProps {
  propertyId: string;
  tenantUserId?: string;
  onLeaseGenerated?: (lease: LeaseAgreement) => void;
}

export const SwiftRentLeaseGenerator = ({ 
  propertyId, 
  tenantUserId, 
  onLeaseGenerated 
}: SwiftRentLeaseGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const [currentLease, setCurrentLease] = useState<LeaseAgreement | null>(null);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const { user } = useAuth();

  const generateLease = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-swiftrent-lease', {
        body: {
          property_id: propertyId,
          tenant_user_id: tenantUserId
        }
      });

      if (error) throw error;

      setCurrentLease(data.lease);
      toast.success("SwiftRent lease agreement generated successfully!");
      onLeaseGenerated?.(data.lease);
    } catch (error) {
      console.error('Error generating lease:', error);
      toast.error("Failed to generate lease agreement");
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!currentLease?.pdf_url) return;
    
    try {
      const link = document.createElement('a');
      link.href = currentLease.pdf_url;
      link.download = `SwiftRent_Lease_${new Date().toISOString().split('T')[0]}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error("Failed to download lease");
    }
  };

  const initiateSigningProcess = async () => {
    if (!currentLease) return;

    try {
      // Update status to pending signatures using raw SQL
      const { error } = await supabase.rpc('execute_sql', {
        query: `UPDATE lease_agreements SET status = 'pending_signatures' WHERE id = $1`,
        params: [currentLease.id]
      });

      if (error) throw error;

      setCurrentLease({ ...currentLease, status: 'pending_signatures' });
      toast.success("Lease sent for signatures!");
    } catch (error) {
      console.error('Error initiating signing:', error);
      toast.error("Failed to send lease for signing");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Draft
          </Badge>
        );
      case 'pending_signatures':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Signature className="h-3 w-3" />
            Awaiting Signatures
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Completed & Signed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!currentLease) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            SwiftRent Lease Agreement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">SR</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Generate New Lease Agreement</h3>
            <p className="text-muted-foreground mb-4">
              Create a comprehensive, legally compliant lease agreement with SwiftRent branding
            </p>
            <Button 
              onClick={generateLease} 
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generating ? 'Generating...' : 'Generate SwiftRent Lease'}
            </Button>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">What's included:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Complete 28-section legal agreement</li>
              <li>✓ SwiftRent branding and styling</li>
              <li>✓ Electronic signature capability</li>
              <li>✓ Audit trail and compliance</li>
              <li>✓ Immutable when completed</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">SR</span>
              </div>
              <div>
                <CardTitle>SwiftRent Lease Agreement</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Generated {new Date(currentLease.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            {getStatusBadge(currentLease.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-800">
              <FileText className="h-4 w-4" />
              <span className="font-medium">
                {currentLease.status === 'draft' && 'Ready for review and signatures'}
                {currentLease.status === 'pending_signatures' && 'Waiting for both parties to sign'}
                {currentLease.status === 'completed' && 'Fully executed and active'}
              </span>
            </div>
          </div>

          {/* Signature status */}
          {currentLease.status !== 'draft' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  currentLease.landlord_signed_at ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm">
                  Landlord: {currentLease.landlord_signed_at ? 'Signed' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  currentLease.tenant_signed_at ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm">
                  Tenant: {currentLease.tenant_signed_at ? 'Signed' : 'Pending'}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowHtmlPreview(true)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview Document
            </Button>
            
            <Button 
              variant="outline" 
              onClick={downloadPDF}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>

            {currentLease.status === 'draft' && (
              <Button 
                onClick={initiateSigningProcess}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Signature className="h-4 w-4" />
                Send for Signatures
              </Button>
            )}

            {currentLease.status === 'pending_signatures' && user?.id === currentLease.landlord_id && (
              <Button 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  // Navigate to signing page
                  window.location.href = `/lease-signing/${currentLease.id}`;
                }}
              >
                <Signature className="h-4 w-4" />
                Sign as Landlord
              </Button>
            )}

            {currentLease.status === 'pending_signatures' && user?.id === currentLease.tenant_id && (
              <Button 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  // Navigate to signing page
                  window.location.href = `/lease-signing/${currentLease.id}`;
                }}
              >
                <Signature className="h-4 w-4" />
                Sign as Tenant
              </Button>
            )}
          </div>

          {/* Completed status */}
          {currentLease.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Lease Agreement Completed</p>
                  <p className="text-sm">
                    Both parties have signed. This document is now legally binding and immutable.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* HTML Preview Modal */}
      <Dialog open={showHtmlPreview} onOpenChange={setShowHtmlPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>SwiftRent Lease Agreement Preview</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {currentLease.html_content && (
              <div 
                dangerouslySetInnerHTML={{ __html: currentLease.html_content }}
                className="prose prose-sm max-w-none"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};