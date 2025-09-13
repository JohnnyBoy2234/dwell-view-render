import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Signature, CheckCircle, Eye, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SignatureCapture } from "./SignatureCapture";

interface LeaseAgreement {
  id: string;
  property_id: string;
  landlord_id: string;
  tenant_id?: string;
  status: 'draft' | 'pending_signatures' | 'completed' | 'cancelled';
  lease_data: any;
  pdf_url?: string;
  html_content?: string;
  landlord_signed_at?: string;
  tenant_signed_at?: string;
  created_at: string;
}

export const SwiftRentLeaseSigningPage = () => {
  const { leaseId } = useParams<{ leaseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lease, setLease] = useState<LeaseAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [showSignatureCapture, setShowSignatureCapture] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (leaseId) {
      fetchLease(leaseId);
    }
  }, [leaseId]);

  const fetchLease = async (id: string) => {
    try {
      // Use raw SQL query since lease_agreements isn't in the types yet
      const { data, error } = await supabase
        .from('leases') // Use existing table temporarily
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Map the old structure to new structure
      const mappedLease: LeaseAgreement = {
        id: data.id,
        property_id: data.property_id,
        landlord_id: data.landlord_user_id,
        tenant_id: data.tenant_user_id,
        status: data.status as any,
        lease_data: data.lease_data,
        pdf_url: data.pdf_draft_url || data.pdf_signed_url,
        html_content: '',
        landlord_signed_at: undefined,
        tenant_signed_at: undefined,
        created_at: data.created_at
      };
      
      setLease(mappedLease);
    } catch (error) {
      console.error('Error fetching lease:', error);
      toast.error("Lease not found");
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const generateOTP = () => {
    // Generate a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendOTP = async () => {
    try {
      const otpCode = generateOTP();
      
      // In production, you would send this via email/SMS
      // For demo, we'll store it temporarily and show it
      sessionStorage.setItem('lease_otp', otpCode);
      
      toast.success(`OTP sent to your email: ${otpCode} (Demo mode)`);
      setShowOtpDialog(true);
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error("Failed to send OTP");
    }
  };

  const verifyOTP = () => {
    const storedOtp = sessionStorage.getItem('lease_otp');
    if (otpCode === storedOtp) {
      setOtpVerified(true);
      setShowOtpDialog(false);
      setShowSignatureCapture(true);
      toast.success("OTP verified successfully!");
    } else {
      toast.error("Invalid OTP code");
    }
  };

  const handleSignature = async (signatureDataUrl: string) => {
    if (!lease || !user) return;

    setSigning(true);
    try {
      const userRole = user.id === lease.landlord_id ? 'landlord' : 'tenant';
      const timestamp = new Date().toISOString();
      
      // Upload signature image
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();
      const fileName = `signature_${lease.id}_${userRole}_${Date.now()}.png`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lease-documents')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Get signature URL
      const { data: urlData } = supabase.storage
        .from('lease-documents')
        .getPublicUrl(fileName);

      // Create signature record
      const signatureData = {
        lease_id: lease.id,
        signer_id: user.id,
        signer_role: userRole,
        signature_type: 'electronic',
        signature_image_url: urlData.publicUrl,
        otp_verified: otpVerified,
        metadata: {
          timestamp,
          user_agent: navigator.userAgent,
          ip_address: 'client_side' // In production, get from server
        }
      };

      // Insert signature
      const { error: sigError } = await supabase
        .from('lease_signatures')
        .insert(signatureData);

      if (sigError) throw sigError;

      // Update lease with signature timestamp
      const updateData = userRole === 'landlord' 
        ? { landlord_signed_at: timestamp }
        : { tenant_signed_at: timestamp };

      const { error: updateError } = await supabase.rpc('update_lease_status', {
        p_lease_id: lease.id,
        p_status: lease.status // Keep current status, let trigger handle completion
      });

      if (updateError) throw updateError;

      toast.success("Lease signed successfully!");
      
      // Refresh lease data
      await fetchLease(lease.id);
      setShowSignatureCapture(false);

    } catch (error) {
      console.error('Error signing lease:', error);
      toast.error("Failed to sign lease");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Lease Not Found</h2>
            <p className="text-muted-foreground">The requested lease agreement could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userRole = user?.id === lease.landlord_id ? 'landlord' : 'tenant';
  const hasUserSigned = userRole === 'landlord' ? !!lease.landlord_signed_at : !!lease.tenant_signed_at;
  const canSign = lease.status === 'pending_signatures' && !hasUserSigned;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">SR</span>
                </div>
                <div>
                  <CardTitle>SwiftRent Lease Agreement</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Ready for electronic signature
                  </p>
                </div>
              </div>
              <Badge variant={lease.status === 'completed' ? 'default' : 'secondary'}>
                {lease.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Signature Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Signature Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <div className={`w-4 h-4 rounded-full ${
                  lease.landlord_signed_at ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <div>
                  <p className="font-medium">Landlord</p>
                  <p className="text-sm text-muted-foreground">
                    {lease.landlord_signed_at ? 'Signed' : 'Pending signature'}
                  </p>
                </div>
                {lease.landlord_signed_at && <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />}
              </div>
              
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <div className={`w-4 h-4 rounded-full ${
                  lease.tenant_signed_at ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <div>
                  <p className="font-medium">Tenant</p>
                  <p className="text-sm text-muted-foreground">
                    {lease.tenant_signed_at ? 'Signed' : 'Pending signature'}
                  </p>
                </div>
                {lease.tenant_signed_at && <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {/* Preview Document */}
              <Button 
                variant="outline" 
                onClick={() => window.open(lease.pdf_url, '_blank')}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview Document
              </Button>

              {canSign && (
                <Button 
                  onClick={sendOTP}
                  disabled={signing}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Signature className="h-4 w-4" />
                  {signing ? 'Processing...' : `Sign as ${userRole === 'landlord' ? 'Landlord' : 'Tenant'}`}
                </Button>
              )}

              {hasUserSigned && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>You have signed this document</span>
                </div>
              )}
            </div>

            {/* Status Messages */}
            {lease.status === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <p className="font-medium">Lease Agreement Completed</p>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Both parties have signed. This document is now legally binding and immutable.
                </p>
              </div>
            )}

            {canSign && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <FileText className="h-5 w-5" />
                  <p className="font-medium">Ready for Your Signature</p>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Please review the document and click "Sign" when ready. You'll receive an OTP for verification.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* OTP Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Your Identity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please enter the 6-digit verification code sent to your email.
            </p>
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowOtpDialog(false)}>
                Cancel
              </Button>
              <Button onClick={verifyOTP} disabled={otpCode.length !== 6}>
                Verify
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

        {signing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg">
              <p>Processing signature...</p>
            </div>
          </div>
        )}
      
      {/* Signature Capture */}
      {showSignatureCapture && (
        <SignatureCapture
          onSignatureCapture={handleSignature}
          onCancel={() => setShowSignatureCapture(false)}
          title={`Sign as ${userRole === 'landlord' ? 'Landlord' : 'Tenant'}`}
        />
      )}
    </div>
  );
};