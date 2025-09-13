import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, PenTool, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLease } from '@/hooks/useLease';
import { SignatureModal } from '@/components/lease/SignatureModal';
import { useToast } from '@/hooks/use-toast';
import { createLeaseNotifications } from '@/utils/notificationHelpers';

export default function LeaseSigningPage() {
  const { leaseId } = useParams<{ leaseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { lease, loading, signLease, downloadLease, refetch } = useLease(leaseId);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signingLoading, setSigningLoading] = useState(false);

  const isLandlord = user?.id === lease?.landlord_user_id;
  const isTenant = user?.id === lease?.tenant_user_id;
  // Enforce tenant-first signing order
  const canSign = (isTenant && lease?.status === 'PENDING_TENANT_SIGNATURE') ||
                  (isLandlord && lease?.status === 'PENDING_LANDLORD_SIGNATURE');

  const hasSigned = (role: 'LANDLORD' | 'TENANT') => {
    return lease?.signatures?.some(sig => sig.role === role && sig.signed_at);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return { label: 'Draft', color: 'bg-gray-500' };
      case 'PENDING_TENANT_SIGNATURE':
        return { label: 'Awaiting Tenant Signature', color: 'bg-yellow-500' };
      case 'PENDING_LANDLORD_SIGNATURE':
        return { label: 'Awaiting Landlord Signature', color: 'bg-blue-500' };
      case 'COMPLETED':
        return { label: 'Completed', color: 'bg-green-500' };
      case 'CANCELED':
        return { label: 'Canceled', color: 'bg-red-500' };
      case 'CHANGES_REQUESTED':
        return { label: 'Changes Requested', color: 'bg-orange-500' };
      default:
        return { label: status, color: 'bg-gray-500' };
    }
  };

  const handleSign = async (signatureBase64: string) => {
    try {
      setSigningLoading(true);
      const role = isLandlord ? 'LANDLORD' : 'TENANT';
      await signLease(role, signatureBase64);
      
      // Create notification for the other party
      if (isLandlord) {
        await createLeaseNotifications.leaseSigned(
          lease?.landlord_user_id || '',
          lease?.tenant_user_id || '',
          lease?.lease_data?.property?.address || 'Property',
          lease?.id || '',
          'landlord'
        );
      } else {
        await createLeaseNotifications.leaseSigned(
          lease?.landlord_user_id || '',
          lease?.tenant_user_id || '',
          lease?.lease_data?.property?.address || 'Property',
          lease?.id || '',
          'tenant'
        );
      }
      
      setShowSignatureModal(false);
      toast({
        title: "Lease Signed Successfully",
        description: "Your signature has been added to the lease.",
      });
      
      // Refresh the lease data
      await refetch();
    } catch (error) {
      console.error('Error signing lease:', error);
      toast({
        variant: "destructive",
        title: "Signing Failed",
        description: "There was an error signing the lease. Please try again.",
      });
    } finally {
      setSigningLoading(false);
    }
  };

  const handleDownload = async (type: 'draft' | 'signed') => {
    try {
      await downloadLease(type);
    } catch (error) {
      console.error('Error downloading lease:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "There was an error downloading the lease. Please try again.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading lease...</p>
        </div>
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Lease Not Found</h2>
          <p className="text-muted-foreground mb-4">The lease you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(lease.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Lease Agreement</h1>
            <p className="text-muted-foreground">
              {lease.lease_data?.property?.address || 'Property Address'}
            </p>
          </div>
        </div>
        <Badge className={`${statusInfo.color} text-white`}>
          {statusInfo.label}
        </Badge>
      </div>

      {/* Lease Details */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Property Address</label>
              <p className="text-sm">{lease.lease_data?.property?.address || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Rent Amount</label>
              <p className="text-sm">R{lease.lease_data?.rent?.monthly_rent?.toLocaleString() || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Lease Start Date</label>
              <p className="text-sm">
                {lease.lease_data?.term?.start_date ? new Date(lease.lease_data.term.start_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Lease End Date</label>
              <p className="text-sm">
                {lease.lease_data?.term?.end_date ? new Date(lease.lease_data.term.end_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signatures Status */}
      <Card>
        <CardHeader>
          <CardTitle>Signature Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">L</span>
                </div>
                <div>
                  <p className="font-medium">Landlord Signature</p>
                  <p className="text-sm text-muted-foreground">
                    {lease.landlord_user_id === user?.id ? 'You' : 'Landlord'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasSigned('LANDLORD') ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-600">Signed</span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Pending</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-semibold text-sm">T</span>
                </div>
                <div>
                  <p className="font-medium">Tenant Signature</p>
                  <p className="text-sm text-muted-foreground">
                    {lease.tenant_user_id === user?.id ? 'You' : 'Tenant'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasSigned('TENANT') ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-600">Signed</span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Pending</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {/* Download Buttons */}
            {lease.pdf_draft_url && (
              <Button 
                variant="outline" 
                onClick={() => handleDownload('draft')}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Draft
              </Button>
            )}
            
            {lease.pdf_signed_url && (
              <Button 
                variant="outline" 
                onClick={() => handleDownload('signed')}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Signed
              </Button>
            )}

            {/* Sign Button */}
            {canSign && (
              <Button 
                onClick={() => setShowSignatureModal(true)}
                className="flex items-center gap-2 bg-ocean-blue hover:bg-ocean-blue-dark"
                disabled={signingLoading}
              >
                <PenTool className="h-4 w-4" />
                {signingLoading ? 'Signing...' : `Sign as ${isLandlord ? 'Landlord' : 'Tenant'}`}
              </Button>
            )}

            {/* Status Messages */}
            {!canSign && lease.status === 'COMPLETED' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Lease is fully signed and completed!</span>
              </div>
            )}

            {!canSign && lease.status !== 'COMPLETED' && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-lg">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {isLandlord ? 'Waiting for tenant signature' : 'Waiting for landlord signature'}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Signature Modal */}
      {showSignatureModal && (
        <SignatureModal
          isOpen={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSign={handleSign}
          role={isLandlord ? 'LANDLORD' : 'TENANT'}
          loading={signingLoading}
        />
      )}
    </div>
  );
}