import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, XCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function LeaseVerify() {
  const { leaseId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [lease, setLease] = useState<any>(null);
  const [verification, setVerification] = useState<{
    verified: boolean;
    hash: string;
    computedHash?: string;
  } | null>(null);

  useEffect(() => {
    if (leaseId) {
      loadLease();
    }
  }, [leaseId]);

  const loadLease = async () => {
    try {
      const { data, error } = await supabase
        .from('lease_agreements')
        .select('*')
        .eq('id', leaseId)
        .single();

      if (error) throw error;
      setLease(data);
      
      // Extract hash from lease data
      const leaseData = data.lease_data as any;
      const storedHash = leaseData?.pdf?.finalSha256;
      if (storedHash) {
        setVerification({ verified: false, hash: storedHash });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lease not found",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyDocument = async () => {
    if (!lease?.pdf_path) return;
    
    try {
      setLoading(true);
      
      // Get signed URL and download PDF
      const { data: signedData } = await supabase.storage
        .from('lease-documents')
        .createSignedUrl(lease.pdf_path, 60);
        
      if (!signedData?.signedUrl) throw new Error('Failed to get document URL');
      
      // Download and compute hash
      const response = await fetch(signedData.signedUrl);
      const pdfBytes = await response.arrayBuffer();
      
      // Compute SHA-256 using Web Crypto API
      const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      setVerification({
        verified: computedHash === verification?.hash,
        hash: verification?.hash || '',
        computedHash
      });
      
    } catch (error: any) {
      toast({
        variant: "destructive", 
        title: "Verification failed",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !lease) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Lease Document Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lease ? (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Lease ID:</span>
                  <div className="text-muted-foreground">{leaseId}</div>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <div className="text-muted-foreground capitalize">{lease.status}</div>
                </div>
              </div>
              
              {verification && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {verification.verified ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : verification.computedHash ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <Shield className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="font-medium">
                      {verification.verified ? 'Document Verified ✓' : 
                       verification.computedHash ? 'Verification Failed ✗' : 
                       'Ready to Verify'}
                    </span>
                  </div>
                  
                  <div className="text-xs space-y-1">
                    <div>Stored Hash: <code className="bg-muted px-1 rounded">{verification.hash}</code></div>
                    {verification.computedHash && (
                      <div>Computed Hash: <code className="bg-muted px-1 rounded">{verification.computedHash}</code></div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={verifyDocument} disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify Document'}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Lease document not found or access denied.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}