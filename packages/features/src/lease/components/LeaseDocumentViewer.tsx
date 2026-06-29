// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@mzanzihomes/ui/components/dialog';
import { Download, Eye, FileText, Shield, Clock, User } from 'lucide-react';
import { useLeaseContracts } from '../hooks/useLeaseContracts';
import { useESignature } from '../hooks/useESignature';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { toast } from 'sonner';
import { downloadFileFromUrl } from '@mzanzihomes/common/lib/download';
import type { LeaseContract } from '@mzanzihomes/common/types/lease';

interface LeaseDocumentViewerProps {
  contract: LeaseContract;
}

export function LeaseDocumentViewer({ contract }: LeaseDocumentViewerProps) {
  const { user } = useAuth();
  const { generatePDF } = useLeaseContracts();
  const { verifySignature, getSignatureAuditTrail } = useESignature();
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const isLandlord = user?.id === contract.landlord_id;
  const isTenant = user?.id === contract.tenant_id;

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const pdfUrl = await generatePDF(contract.id);
      if (pdfUrl) {
        toast.success('PDF generated successfully');
        // Open PDF in new tab
        const joiner = pdfUrl.includes('?') ? '&' : '?';
        window.open(`${pdfUrl}${joiner}ts=${Date.now()}`,'_blank');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (contract.pdf_url) {
      const joiner = contract.pdf_url.includes('?') ? '&' : '?';
      await downloadFileFromUrl(`${contract.pdf_url}${joiner}ts=${Date.now()}`, `lease-${contract.id}.pdf`);
    } else {
      handleGeneratePDF();
    }
  };

  const handleViewAuditTrail = async () => {
    try {
      const trail = await getSignatureAuditTrail(contract.id);
      setAuditTrail(trail);
      setShowAuditTrail(true);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      toast.error('Failed to load audit trail');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'pending_tenant': return 'destructive';
      case 'pending_landlord': return 'destructive';
      case 'signed': return 'default';
      case 'expired': return 'outline';
      case 'terminated': return 'outline';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {contract.title}
            </CardTitle>
            <CardDescription>
              Version {contract.version} • Created {formatDate(contract.created_at)}
            </CardDescription>
          </div>
          <Badge variant={getStatusColor(contract.status)}>
            {contract.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contract Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-muted-foreground">Property</p>
            <p>{contract.contract_data?.propertyAddress || 'Not specified'}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Monthly Rent</p>
            <p>{contract.contract_data?.rentCurrency || 'ZAR'} {contract.contract_data?.rentAmount?.toLocaleString() || 'Not specified'}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Lease Period</p>
            <p>{contract.contract_data?.leaseStartDate || 'Not specified'} - {contract.contract_data?.leaseEndDate || 'Not specified'}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Security Deposit</p>
            <p>{contract.contract_data?.rentCurrency || 'ZAR'} {contract.contract_data?.securityDeposit?.toLocaleString() || '0'}</p>
          </div>
        </div>

        {/* Signature Status */}
        {(contract.landlord_signed_at || contract.tenant_signed_at) && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Signature Status
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <div>
                  <p className="font-medium">Landlord</p>
                  {contract.landlord_signed_at ? (
                    <p className="text-green-600">✓ Signed {formatDate(contract.landlord_signed_at)}</p>
                  ) : (
                    <p className="text-muted-foreground">Pending signature</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <div>
                  <p className="font-medium">Tenant</p>
                  {contract.tenant_signed_at ? (
                    <p className="text-green-600">✓ Signed {formatDate(contract.tenant_signed_at)}</p>
                  ) : (
                    <p className="text-muted-foreground">Pending signature</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadPDF}
            disabled={generatingPDF}
          >
            {generatingPDF ? (
              <>Generating...</>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>

          {contract.pdf_url && (
            <Button variant="outline" size="sm" onClick={() => {
              const joiner = contract.pdf_url!.includes('?') ? '&' : '?';
              window.open(`${contract.pdf_url}${joiner}ts=${Date.now()}`, '_blank');
            }}>
              <Eye className="h-4 w-4 mr-2" />
              View PDF
            </Button>
          )}

          {(isLandlord || isTenant) && (
            <Dialog open={showAuditTrail} onOpenChange={setShowAuditTrail}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleViewAuditTrail}>
                  <Clock className="h-4 w-4 mr-2" />
                  Audit Trail
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Contract Audit Trail</DialogTitle>
                  <DialogDescription>
                    Complete history of all actions taken on this contract
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {contract.audit_trail.map((entry: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{entry.action.replace('_', ' ').toUpperCase()}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(entry.timestamp)}
                          </p>
                        </div>
                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            {Object.entries(entry.details).map(([key, value]: [string, any]) => (
                              <p key={key}>
                                <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {auditTrail.map((entry: any, index: number) => (
                    <div key={`signature-${index}`} className="flex items-start gap-3 p-3 border rounded-lg bg-blue-50">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">SIGNATURE - {entry.signer_role.toUpperCase()}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(entry.timestamp)}
                          </p>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          <p><span className="font-medium">IP Address:</span> {entry.ip_address}</p>
                          <p><span className="font-medium">Consent Method:</span> {entry.consent_method}</p>
                          <p><span className="font-medium">Signature Hash:</span> {entry.signature_hash.substring(0, 16)}...</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}