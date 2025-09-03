import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Download, 
  PenTool, 
  MessageSquare, 
  X, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Eye,
  History
} from 'lucide-react';
import { useLease } from '@/hooks/useLease';
import { SignatureModal } from './SignatureModal';
import { LEASE_STATUS_INFO, LeaseStatus, LeaseRole } from '@/types/lease';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface LeaseManagementProps {
  propertyId: string;
  tenantUserId?: string;
  onGenerateLease?: (leaseData: any) => void;
}

export function LeaseManagement({ propertyId, tenantUserId, onGenerateLease }: LeaseManagementProps) {
  const { user } = useAuth();
  const { lease, loading, generateLease, signLease, requestChanges, cancelLease, downloadLease } = useLease(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [changesReason, setChangesReason] = useState('');
  const [signingLoading, setSigningLoading] = useState(false);

  const isLandlord = user?.id === lease?.landlord_user_id;
  const isTenant = user?.id === lease?.tenant_user_id;
  const canSign = (isLandlord && lease?.status === 'DRAFT') || 
                  (isLandlord && lease?.status === 'PENDING_LANDLORD_SIGNATURE') ||
                  (isTenant && lease?.status === 'PENDING_TENANT_SIGNATURE');

  const hasSigned = (role: LeaseRole) => {
    return lease?.signatures?.some(sig => sig.role === role && sig.signed_at);
  };

  const getStatusInfo = (status: LeaseStatus) => {
    return LEASE_STATUS_INFO[status];
  };

  const handleGenerateLease = async () => {
    try {
      const newLease = await generateLease(propertyId, tenantUserId);
      if (onGenerateLease) {
        onGenerateLease(newLease);
      }
    } catch (error) {
      console.error('Error generating lease:', error);
    }
  };

  const handleSign = async (signatureBase64: string) => {
    try {
      setSigningLoading(true);
      const role = isLandlord ? 'LANDLORD' : 'TENANT';
      await signLease(role, signatureBase64);
      setShowSignatureModal(false);
    } catch (error) {
      console.error('Error signing lease:', error);
    } finally {
      setSigningLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!changesReason.trim()) return;
    
    try {
      await requestChanges(changesReason);
      setShowRequestChangesModal(false);
      setChangesReason('');
    } catch (error) {
      console.error('Error requesting changes:', error);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelLease();
      setShowCancelModal(false);
    } catch (error) {
      console.error('Error canceling lease:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-blue"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lease) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lease Agreement
          </CardTitle>
          <CardDescription>
            Generate a lease agreement for this property
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Lease Generated</h3>
            <p className="text-muted-foreground mb-4">
              Generate a lease agreement to start the rental process
            </p>
            <Button onClick={handleGenerateLease} className="bg-ocean-blue hover:bg-ocean-blue-dark">
              Generate Lease
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = getStatusInfo(lease.status);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lease Agreement v{lease.version}
              </CardTitle>
              <CardDescription>
                Created {format(new Date(lease.created_at), 'PPP')}
              </CardDescription>
            </div>
            <Badge 
              variant={statusInfo.color === 'green' ? 'default' : 
                      statusInfo.color === 'amber' ? 'secondary' : 
                      statusInfo.color === 'red' ? 'destructive' : 'outline'}
            >
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Description */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {statusInfo.color === 'green' && <CheckCircle className="h-4 w-4 text-green-500" />}
            {statusInfo.color === 'amber' && <Clock className="h-4 w-4 text-amber-500" />}
            {statusInfo.color === 'red' && <AlertCircle className="h-4 w-4 text-red-500" />}
            {statusInfo.color === 'gray' && <FileText className="h-4 w-4 text-gray-500" />}
            {statusInfo.description}
          </div>

          {/* Signature Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${hasSigned('LANDLORD') ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm">Landlord: {hasSigned('LANDLORD') ? 'Signed' : 'Pending'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${hasSigned('TENANT') ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm">Tenant: {hasSigned('TENANT') ? 'Signed' : 'Pending'}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Download Buttons */}
            {lease.pdf_draft_url && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => downloadLease('draft')}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Draft
              </Button>
            )}
            
            {lease.pdf_signed_url && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => downloadLease('signed')}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Signed
              </Button>
            )}

            {/* Sign Button */}
            {canSign && (
              <Button 
                size="sm" 
                onClick={() => setShowSignatureModal(true)}
                className="flex items-center gap-2 bg-ocean-blue hover:bg-ocean-blue-dark"
              >
                <PenTool className="h-4 w-4" />
                Sign as {isLandlord ? 'Landlord' : 'Tenant'}
              </Button>
            )}

            {/* Request Changes Button */}
            {(isLandlord || isTenant) && lease.status !== 'COMPLETED' && lease.status !== 'CANCELED' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowRequestChangesModal(true)}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Request Changes
              </Button>
            )}

            {/* Cancel Button (Landlord only, before signatures) */}
            {isLandlord && lease.status === 'DRAFT' && !hasSigned('LANDLORD') && !hasSigned('TENANT') && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setShowCancelModal(true)}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel Lease
              </Button>
            )}
          </div>

          {/* Audit Log */}
          {lease.audit_logs && lease.audit_logs.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                Activity Log
              </h4>
              <div className="space-y-2">
                {lease.audit_logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <span className="capitalize">{log.action.toLowerCase().replace('_', ' ')}</span>
                    <span className="text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSign={handleSign}
        role={isLandlord ? 'LANDLORD' : 'TENANT'}
        loading={signingLoading}
      />

      {/* Request Changes Modal */}
      <Dialog open={showRequestChangesModal} onOpenChange={setShowRequestChangesModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="changes-reason">Reason for changes</Label>
              <Textarea
                id="changes-reason"
                placeholder="Please explain what changes you would like to make..."
                value={changesReason}
                onChange={(e) => setChangesReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestChangesModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRequestChanges} 
              disabled={!changesReason.trim()}
              className="bg-ocean-blue hover:bg-ocean-blue-dark"
            >
              Request Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Lease</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to cancel this lease? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Keep Lease
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Cancel Lease
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
