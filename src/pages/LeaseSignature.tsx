import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, FileText, Pen, Shield, CheckCircle } from 'lucide-react';
import { useLeaseContracts } from '@/hooks/useLeaseContracts';
import { useESignature } from '@/hooks/useESignature';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { LeaseContract } from '@/types/lease';

export function LeaseSignature() {
  const { contractId } = useParams<{ contractId: string }>();
  const { user, isLandlord } = useAuth();
  const { contracts } = useLeaseContracts();
  const { captureSignature, signing } = useESignature();
  const navigate = useNavigate();
  
  const [contract, setContract] = useState<LeaseContract | null>(null);
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (contractId) {
      const foundContract = contracts.find(c => c.id === contractId);
      setContract(foundContract || null);
    }
  }, [contractId, contracts]);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSignatureData(canvas.toDataURL());
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const handleSign = async () => {
    if (!contract || !signatureData || !consentAcknowledged) {
      toast.error('Please complete all requirements before signing');
      return;
    }

    const success = await captureSignature(contract.id, signatureData, consentAcknowledged);
    if (success) {
      toast.success('Contract signed successfully!');
      navigate('/leases');
    }
  };

  const canUserSign = () => {
    if (!contract || !user) return false;
    
    if (isLandlord) {
      return contract.landlord_id === user.id && !contract.landlord_signed_at;
    } else {
      return contract.tenant_id === user.id && !contract.tenant_signed_at;
    }
  };

  const getSigningRole = () => {
    return isLandlord ? 'landlord' : 'tenant';
  };

  const isAlreadySigned = () => {
    if (!contract || !user) return false;
    
    if (isLandlord) {
      return !!contract.landlord_signed_at;
    } else {
      return !!contract.tenant_signed_at;
    }
  };

  useEffect(() => {
    setupCanvas();
  }, []);

  if (!contract) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Contract Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The lease contract you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/leases')}>
              Back to Contracts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAlreadySigned()) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          <Button variant="ghost" onClick={() => navigate('/leases')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contracts
          </Button>

          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h3 className="text-lg font-medium mb-2">Already Signed</h3>
              <p className="text-muted-foreground mb-4">
                You have already signed this contract. 
              </p>
              <Badge variant="default">
                Signed on {new Date(
                  isLandlord ? contract.landlord_signed_at! : contract.tenant_signed_at!
                ).toLocaleDateString()}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!canUserSign()) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          <Button variant="ghost" onClick={() => navigate('/leases')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contracts
          </Button>

          <Card>
            <CardContent className="pt-6 text-center">
              <Shield className="h-12 w-12 mx-auto text-amber-600 mb-4" />
              <h3 className="text-lg font-medium mb-2">Not Ready for Signing</h3>
              <p className="text-muted-foreground">
                This contract is not ready for your signature yet.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/leases')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Sign Lease Contract</h1>
            <p className="text-muted-foreground">
              Signing as: <Badge variant="secondary">{getSigningRole()}</Badge>
            </p>
          </div>
        </div>

        {/* Contract Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>{contract.title}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Property</h4>
                <p className="text-sm text-muted-foreground">
                  {contract.contract_data?.propertyAddress || 'Address not specified'}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Monthly Rent</h4>
                <p className="text-sm text-muted-foreground">
                  {contract.contract_data?.rentCurrency} {contract.contract_data?.rentAmount?.toLocaleString() || 'Not specified'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal Consent */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Electronic Signature Consent</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Electronic Signature Agreement</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p>
                  By providing your electronic signature, you agree that:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Your electronic signature has the same legal effect as a handwritten signature</li>
                  <li>You consent to conduct this transaction electronically</li>
                  <li>You have the authority to enter into this agreement</li>
                  <li>All information provided is accurate and complete</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="consent"
                checked={consentAcknowledged}
                onCheckedChange={(checked) => setConsentAcknowledged(checked as boolean)}
              />
              <label htmlFor="consent" className="text-sm font-medium">
                I acknowledge and agree to the electronic signature terms above
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Signature Pad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Pen className="h-5 w-5" />
              <span>Digital Signature</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign your name in the box below using your mouse or touchscreen
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full h-32 border rounded cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={clearSignature}>
                Clear Signature
              </Button>
              <p className="text-xs text-muted-foreground">
                Draw your signature above
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sign Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Ready to Sign</p>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone once completed
                </p>
              </div>
              <Button
                onClick={handleSign}
                disabled={!signatureData || !consentAcknowledged || signing}
                size="lg"
              >
                {signing ? 'Signing...' : `Sign as ${getSigningRole()}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}