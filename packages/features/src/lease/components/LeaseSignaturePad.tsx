// @ts-nocheck
import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Checkbox } from '@mzanzihomes/ui/components/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@mzanzihomes/ui/components/dialog';
import { AlertTriangle, PenTool, RotateCcw, Check } from 'lucide-react';
import { useESignature } from '../hooks/useESignature';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { toast } from 'sonner';
import type { LeaseContract } from '@mzanzihomes/common/types/lease';

interface LeaseSignaturePadProps {
  contract: LeaseContract;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSigned?: () => void;
}

export function LeaseSignaturePad({ contract, open, onOpenChange, onSigned }: LeaseSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();
  const { captureSignature, signing } = useESignature();
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);

  const isLandlord = user?.id === contract.landlord_id;
  const isTenant = user?.id === contract.tenant_id;
  const signerRole = isLandlord ? 'landlord' : 'tenant';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [open]);

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

    try {
      // Convert canvas to data URL
      const signatureDataUrl = canvas.toDataURL('image/png');
      
      // Capture the signature
      const success = await captureSignature(contract.id, signatureDataUrl, consentAcknowledged);
      
      if (success) {
        toast.success('Contract signed successfully!');
        onSigned?.();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error signing contract:', error);
      toast.error('Failed to sign contract');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Electronic Signature Required
          </DialogTitle>
          <DialogDescription>
            Please review the contract details and provide your electronic signature to complete the agreement.
          </DialogDescription>
        </DialogHeader>

        {/* Contract Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contract Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-muted-foreground">Property</p>
                <p>{contract.contract_data?.propertyAddress}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Monthly Rent</p>
                <p>{contract.contract_data?.rentCurrency} {contract.contract_data?.rentAmount?.toLocaleString()}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Lease Period</p>
                <p>{contract.contract_data?.leaseStartDate} to {contract.contract_data?.leaseEndDate}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Security Deposit</p>
                <p>{contract.contract_data?.rentCurrency} {contract.contract_data?.securityDeposit?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal Notice */}
        <div className="flex items-start gap-3 p-4 border rounded-lg bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800">Legal Notice</p>
            <p className="text-yellow-700 mt-1">
              By signing this document electronically, you agree that your electronic signature is the legal equivalent 
              of your manual signature on this document. This signature is binding and legally enforceable.
            </p>
          </div>
        </div>

        {/* Signature Pad */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Signature</CardTitle>
            <CardDescription>
              Sign in the box below using your mouse or touch screen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full cursor-crosshair border rounded"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-muted-foreground">
                  Signing as: <span className="font-medium">{signerRole}</span>
                </p>
                <Button variant="outline" size="sm" onClick={clearSignature}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consent Checkbox */}
        <div className="flex items-start space-x-2">
          <Checkbox 
            id="consent" 
            checked={consentAcknowledged}
            onCheckedChange={(checked) => setConsentAcknowledged(checked as boolean)}
          />
          <label htmlFor="consent" className="text-sm leading-relaxed">
            I acknowledge that I have read and understood this lease agreement in its entirety. 
            I consent to sign this document electronically and agree that my electronic signature 
            has the same legal effect as a handwritten signature. I understand that this creates 
            a legally binding agreement.
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={signing}>
            Cancel
          </Button>
          <Button 
            onClick={handleSign} 
            disabled={!hasSignature || !consentAcknowledged || signing}
          >
            {signing ? (
              'Signing...'
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Sign Contract
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}