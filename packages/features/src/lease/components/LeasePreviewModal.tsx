import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@mzanzihomes/ui/components/dialog';
import { SheetContent } from '@mzanzihomes/ui/components/sheet';
import { useIsMobile } from '@mzanzihomes/ui/hooks/use-mobile';
import { Button } from '@mzanzihomes/ui/components/button';
import { Checkbox } from '@mzanzihomes/ui/components/checkbox';
import { ScrollArea } from '@mzanzihomes/ui/components/scroll-area';
import { Separator } from '@mzanzihomes/ui/components/separator';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { FileText, Pen, RotateCcw, Send, Download, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { renderLeaseAsHtml, getLeaseStyles } from '../utils/leaseHtmlRenderer';
import { processLeaseTemplate, formatDate } from '../utils/leaseTemplateEngine';
import { MASTER_LEASE_TEMPLATE } from '../templates/masterLeaseTemplate';
import { CONDITION_REPORT_TEMPLATE } from '../templates/conditionReportTemplate';
import type { LeaseWizardData } from '@mzanzihomes/common/types/lease';
import { CONSENT_REGISTRY } from '@mzanzihomes/common/constants/consentRegistry';
import { toast } from 'sonner';

interface SignatureInfo {
  imageUrl: string;
  name: string;
  signedAt: string;
}

interface LeasePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wizardData: LeaseWizardData;
  mode: 'landlord' | 'tenant';
  landlordSignature?: SignatureInfo;
  tenantSignature?: SignatureInfo;
  onSign?: (signatureDataUrl: string) => Promise<void>;
  onUpdateTenantDetails?: (updates: Partial<LeaseWizardData>) => Promise<void>;
  onSendToTenant?: () => void;
  onDownloadPdf?: () => void;
  isSigning?: boolean;
  isSending?: boolean;
  contractStatus?: string;
}

export function LeasePreviewModal({
  open,
  onOpenChange,
  wizardData,
  mode,
  landlordSignature,
  tenantSignature,
  onSign,
  onUpdateTenantDetails,
  onSendToTenant,
  onDownloadPdf,
  isSigning = false,
  isSending = false,
  contractStatus = 'draft',
}: LeasePreviewModalProps) {
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  const [tenantAddress, setTenantAddress] = useState(wizardData.tenantAddress || '');
  const [tenantPhone, setTenantPhone] = useState(wizardData.tenantPhone || '');
  const [occupantsList, setOccupantsList] = useState(wizardData.occupantsList || '');
  const [isSavingTenantDetails, setIsSavingTenantDetails] = useState(false);

  useEffect(() => {
    setTenantAddress(wizardData.tenantAddress || '');
    setTenantPhone(wizardData.tenantPhone || '');
    setOccupantsList(wizardData.occupantsList || '');
  }, [wizardData.tenantAddress, wizardData.tenantPhone, wizardData.occupantsList]);

  const tenantDetailsChanged = tenantAddress !== (wizardData.tenantAddress || '')
    || tenantPhone !== (wizardData.tenantPhone || '')
    || occupantsList !== (wizardData.occupantsList || '');

  const handleSaveTenantDetails = async () => {
    if (!onUpdateTenantDetails) return;
    setIsSavingTenantDetails(true);
    try {
      await onUpdateTenantDetails({ tenantAddress, tenantPhone, occupantsList });
      toast.success('Your details have been updated');
    } catch {
      toast.error('Failed to save your details');
    } finally {
      setIsSavingTenantDetails(false);
    }
  };

  // Process the lease template
  const processedLease = processLeaseTemplate(MASTER_LEASE_TEMPLATE, wizardData);
  const processedConditionReport = processLeaseTemplate(CONDITION_REPORT_TEMPLATE, wizardData);
  
  // Convert to HTML
  const leaseHtml = renderLeaseAsHtml(processedLease);
  const conditionReportHtml = renderLeaseAsHtml(processedConditionReport);

  // Determine if user can sign
  // Signing requires a sign handler — without one the modal is review-only
  // (e.g. the landlord previewing at creation, before the tenant has signed).
  const canSign = !!onSign && (mode === 'landlord' ? !landlordSignature : !tenantSignature);
  const hasOtherPartySignature = mode === 'landlord' ? !!tenantSignature : !!landlordSignature;
  const bothSigned = !!landlordSignature && !!tenantSignature;

  // Setup canvas - match the internal drawing buffer to the canvas's actual
  // rendered size (it's styled w-full, so on narrow mobile screens the CSS
  // size shrinks below the 500x150 default). Without this, touch/mouse
  // coordinates (measured in rendered CSS pixels) get drawn into the wrong
  // spot in the buffer, making the signature look broken or unresponsive.
  useEffect(() => {
    if (!open || !canSign) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [open, canSign]);

  // Touch event handlers
  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setLastX(x);
    setLastY(y);
    setHasSignature(true);
  };

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getTouchPos(e);
    setIsDrawing(true);
    setLastX(pos.x);
    setLastY(pos.y);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    setLastX(x);
    setLastY(y);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getTouchPos(e);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    setLastX(pos.x);
    setLastY(pos.y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSign = async () => {
    if (!hasSignature) {
      toast.error('Please provide your signature');
      return;
    }

    if (!consentAcknowledged) {
      toast.error('Please acknowledge your consent to sign electronically');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureDataUrl = canvas.toDataURL('image/png');
    
    if (onSign) {
      await onSign(signatureDataUrl);
    }
  };

  const getStatusBadge = () => {
    if (bothSigned) {
      return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Fully Signed</Badge>;
    }
    if (landlordSignature) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Awaiting Tenant</Badge>;
    }
    if (tenantSignature) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Awaiting Landlord</Badge>;
    }
    return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" /> Draft</Badge>;
  };

  const ContentComponent = isMobile ? SheetContent : DialogContent;
  const contentProps = isMobile
    ? { side: 'bottom' as const, className: 'h-[95vh] max-h-[95vh] w-full flex flex-col p-0 gap-0 rounded-t-xl' }
    : { className: 'max-w-5xl h-[95vh] flex flex-col p-0 gap-0 overflow-hidden' };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ContentComponent {...contentProps}>
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5" />
                Lease Agreement
              </DialogTitle>
              <DialogDescription className="mt-1">
                {wizardData.propertyAddress?.split('\n')[0] || 'Property Address'}
              </DialogDescription>
            </div>
            {getStatusBadge()}
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 min-h-0 px-6">
          <style>{getLeaseStyles()}</style>
          
          {/* Draft Watermark */}
          {!bothSigned && (
            <div className="lease-draft-watermark">DRAFT</div>
          )}

          {/* Tenant self-service correction - the landlord may not know the
              tenant's current address, phone, or co-occupants, so let the
              tenant fix those before they sign rather than sign off on the
              landlord's guess. */}
          {mode === 'tenant' && canSign && onUpdateTenantDetails && (
            <Card className="my-6 border-primary/30 bg-primary/5 relative z-10">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h4 className="font-semibold mb-1">Confirm your details</h4>
                  <p className="text-sm text-muted-foreground">
                    Your landlord filled in this lease - please check these fields are correct before signing.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantAddressConfirm">Current Address</Label>
                  <Input
                    id="tenantAddressConfirm"
                    value={tenantAddress}
                    onChange={(e) => setTenantAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantPhoneConfirm">Phone Number</Label>
                  <Input
                    id="tenantPhoneConfirm"
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupantsListConfirm">Other Authorized Occupants (family members living with you)</Label>
                  <Input
                    id="occupantsListConfirm"
                    value={occupantsList}
                    onChange={(e) => setOccupantsList(e.target.value)}
                    placeholder="e.g. Jane Doe (spouse), Tom Doe (child)"
                  />
                </div>
                {tenantDetailsChanged && (
                  <Button size="sm" onClick={handleSaveTenantDetails} disabled={isSavingTenantDetails}>
                    {isSavingTenantDetails ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Main Lease Content */}
          <div className="lease-content py-6 relative z-10">
            <div dangerouslySetInnerHTML={{ __html: leaseHtml }} />
            
            <Separator className="my-8" />
            
            {/* Annexure A - Condition Report */}
            <h2 className="text-xl font-bold mb-4">ANNEXURE A: CONDITION REPORT</h2>
            <div dangerouslySetInnerHTML={{ __html: conditionReportHtml }} />

            <Separator className="my-8" />

            {/* Signature Section */}
            <div className="lease-signature-section">
              <h3 className="text-lg font-bold uppercase tracking-wide mb-6">SIGNATURES</h3>
              
              {/* Landlord Signature */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h4 className="font-semibold uppercase text-sm tracking-wide mb-4">LANDLORD</h4>
                  {landlordSignature ? (
                    <div>
                      <img 
                        src={landlordSignature.imageUrl} 
                        alt="Landlord Signature" 
                        className="max-w-[300px] h-auto border rounded bg-white p-2"
                      />
                      <div className="text-sm text-muted-foreground mt-2 space-y-1">
                        <div><span className="font-medium">Name:</span> {landlordSignature.name}</div>
                        <div><span className="font-medium">Signed:</span> {landlordSignature.signedAt}</div>
                      </div>
                    </div>
                  ) : mode === 'landlord' && canSign ? (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 bg-white">
                        <canvas
                          ref={canvasRef}
                          width={500}
                          height={150}
                          className="w-full max-w-[500px] h-[150px] cursor-crosshair touch-none"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawingTouch}
                          onTouchMove={drawTouch}
                          onTouchEnd={stopDrawing}
                        />
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-muted-foreground">Draw your signature above</p>
                          <Button variant="ghost" size="sm" onClick={clearSignature}>
                            <RotateCcw className="h-3 w-3 mr-1" /> Clear
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Awaiting signature...</p>
                  )}
                </CardContent>
              </Card>

              {/* Tenant Signature */}
              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-semibold uppercase text-sm tracking-wide mb-4">TENANT</h4>
                  {tenantSignature ? (
                    <div>
                      <img 
                        src={tenantSignature.imageUrl} 
                        alt="Tenant Signature" 
                        className="max-w-[300px] h-auto border rounded bg-white p-2"
                      />
                      <div className="text-sm text-muted-foreground mt-2 space-y-1">
                        <div><span className="font-medium">Name:</span> {tenantSignature.name}</div>
                        <div><span className="font-medium">Signed:</span> {tenantSignature.signedAt}</div>
                      </div>
                    </div>
                  ) : mode === 'tenant' && canSign ? (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 bg-white">
                        <canvas
                          ref={canvasRef}
                          width={500}
                          height={150}
                          className="w-full max-w-[500px] h-[150px] cursor-crosshair touch-none"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawingTouch}
                          onTouchMove={drawTouch}
                          onTouchEnd={stopDrawing}
                        />
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-muted-foreground">Draw your signature above</p>
                          <Button variant="ghost" size="sm" onClick={clearSignature}>
                            <RotateCcw className="h-3 w-3 mr-1" /> Clear
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Awaiting signature...</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t px-6 py-4 shrink-0 bg-background">
          {canSign && (
            <div className="flex items-start gap-3 mb-4">
              <Checkbox 
                id="consent" 
                checked={consentAcknowledged}
                onCheckedChange={(checked) => setConsentAcknowledged(checked as boolean)}
              />
              <label htmlFor="consent" className="text-sm leading-relaxed">
                {CONSENT_REGISTRY.lease_esignature.text}
              </label>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            
            <div className="flex gap-2">
              {bothSigned && onDownloadPdf && (
                <Button variant="outline" onClick={onDownloadPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              )}
              
              {mode === 'landlord' && !tenantSignature && onSendToTenant && (
                <Button onClick={onSendToTenant} disabled={isSending}>
                  <Send className="h-4 w-4 mr-2" />
                  {isSending ? 'Sending...' : 'Send to Tenant'}
                </Button>
              )}
              
              {canSign && onSign && (
                <Button 
                  onClick={handleSign}
                  disabled={!hasSignature || !consentAcknowledged || isSigning || tenantDetailsChanged}
                >
                  <Pen className="h-4 w-4 mr-2" />
                  {isSigning ? 'Signing...' : `Sign as ${mode === 'landlord' ? 'Landlord' : 'Tenant'}`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </ContentComponent>
    </Dialog>
  );
}
