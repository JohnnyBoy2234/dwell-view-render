// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@mzanzihomes/ui/components/dialog';
import { Download, Eye, FileText, Shield, Clock, User, Send, PenLine, FilePlus, RefreshCw } from 'lucide-react';
import { useLeaseContracts } from '../hooks/useLeaseContracts';
import { useESignature } from '../hooks/useESignature';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { toast } from 'sonner';
import { downloadFileFromUrl } from '@mzanzihomes/common/lib/download';
import type { LeaseContract } from '@mzanzihomes/common/types/lease';

interface LeaseDocumentViewerProps {
  contract: LeaseContract;
}

const ACTION_META: Record<string, { icon: typeof FileText; label: string }> = {
  contract_created: { icon: FilePlus, label: 'Contract created' },
  contract_updated: { icon: RefreshCw, label: 'Contract updated' },
  sent_to_tenant: { icon: Send, label: 'Sent to tenant' },
  signature_session_created: { icon: PenLine, label: 'Signing session started' },
  pdf_generated: { icon: Download, label: 'PDF generated' },
};

interface TimelineItem {
  key: string;
  timestamp: string;
  icon: typeof FileText;
  title: string;
  subtitle?: string;
}

// contract_signed lifecycle entries are dropped here — the signature audit
// entries below are the authoritative, both-party record of who signed when.
function buildAuditTimeline(lifecycle: any[], signatures: any[]): TimelineItem[] {
  const lifecycleItems: TimelineItem[] = (lifecycle ?? [])
    .filter((entry) => entry.action !== 'contract_signed')
    .map((entry, index) => {
      const meta = ACTION_META[entry.action] ?? { icon: Clock, label: (entry.action ?? 'Activity').replace(/_/g, ' ') };
      return {
        key: `lifecycle-${index}`,
        timestamp: entry.timestamp,
        icon: meta.icon,
        title: meta.label,
      };
    });

  const signatureItems: TimelineItem[] = (signatures ?? []).map((entry, index) => ({
    key: `signature-${index}`,
    timestamp: entry.timestamp,
    icon: Shield,
    title: `${entry.signer_role === 'landlord' ? 'Landlord' : 'Tenant'} signed`,
    subtitle: entry.consent_method ? `Consent: ${entry.consent_method.replace(/_/g, ' ')}` : undefined,
  }));

  return [...lifecycleItems, ...signatureItems].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
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
    const withTs = (u: string) => `${u}${u.includes('?') ? '&' : '?'}ts=${Date.now()}`;
    if (contract.pdf_url) {
      await downloadFileFromUrl(withTs(contract.pdf_url), `lease-${contract.id}.pdf`);
      return;
    }
    // No PDF yet — generate it, then save the file (not just open it in a tab).
    setGeneratingPDF(true);
    try {
      const pdfUrl = await generatePDF(contract.id);
      if (pdfUrl) await downloadFileFromUrl(withTs(pdfUrl), `lease-${contract.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 truncate">
              <FileText className="h-5 w-5 shrink-0" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
                
                {(() => {
                  const timeline = buildAuditTimeline(contract.audit_trail, auditTrail);

                  if (timeline.length === 0) {
                    return (
                      <p className="py-8 text-center text-sm text-muted-foreground">No activity yet</p>
                    );
                  }

                  return (
                    <div className="relative ml-3 space-y-6 border-l-2 border-border py-1 pl-6">
                      {timeline.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.key} className="relative">
                            <span className="absolute -left-[29px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <p className="text-sm font-medium">{item.title}</p>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatDate(item.timestamp)}
                              {item.subtitle ? ` · ${item.subtitle}` : ''}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}