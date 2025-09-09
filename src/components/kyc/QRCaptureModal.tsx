import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WaitForPhoneUpload } from './WaitForPhoneUpload';
import { useKycCapture } from '@/hooks/useKycCapture';

interface QRCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purpose: 'id_front' | 'id_back' | 'selfie';
  onUploadSuccess: (filePath: string) => void;
}

interface CaptureSession {
  sid: string;
  qrPayload: string;
  deeplink: string;
}

export function QRCaptureModal({ open, onOpenChange, purpose, onUploadSuccess }: QRCaptureModalProps) {
  const [session, setSession] = useState<CaptureSession | null>(null);
  const { createCaptureSession, updateKycProfile, loading, error, clearError } = useKycCapture();
  const { toast } = useToast();

  const createSession = async () => {
    const sessionData = await createCaptureSession(purpose);
    if (sessionData) {
      setSession(sessionData);
    }
  };

  // Create session when modal opens
  useEffect(() => {
    if (open && !session) {
      createSession();
    }
  }, [open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSession(null);
      clearError();
    }
  }, [open, clearError]);

  const getPurposeTitle = () => {
    switch (purpose) {
      case 'id_front': return 'Front of ID Document';
      case 'id_back': return 'Back of ID Document';  
      case 'selfie': return 'Selfie with ID';
      default: return 'Take Photo';
    }
  };

  const copyToClipboard = async () => {
    if (!session) return;
    
    try {
      await navigator.clipboard.writeText(session.qrPayload);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Could not copy to clipboard.",
      });
    }
  };

  const openInNewTab = () => {
    if (!session) return;
    window.open(session.qrPayload, '_blank');
  };

  const handleUploadSuccess = async (filePath: string) => {
    try {
      await updateKycProfile(purpose, filePath);
      onUploadSuccess(filePath);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to update KYC profile:', err);
      // Keep modal open on error
    }
  };

  const handleExpired = () => {
    setSession(null);
    createSession(); // Auto-generate new session
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Use Your Phone Camera
          </DialogTitle>
          <DialogDescription>
            {getPurposeTitle()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert className="border-destructive">
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button size="sm" variant="outline" onClick={createSession} disabled={loading}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="flex items-center justify-center p-8">
              <div className="text-center space-y-2">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Creating QR code...</p>
              </div>
            </div>
          )}

          {session && (
            <>
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border">
                  <QRCodeSVG
                    value={session.qrPayload}
                    size={200}
                    level="M"
                    includeMargin
                  />
                </div>
              </div>

              {/* Instructions */}
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <div className="font-medium">How to use:</div>
                  <ol className="text-sm space-y-1 ml-4">
                    <li>1. Scan the QR code with your phone camera</li>
                    <li>2. Take a clear photo of your {purpose.replace('_', ' ')}</li>
                    <li>3. Upload the photo - it will appear here automatically</li>
                  </ol>
                </AlertDescription>
              </Alert>

              {/* Status */}
              <WaitForPhoneUpload 
                sid={session.sid} 
                onUploaded={handleUploadSuccess}
                onExpired={handleExpired}
              />

              {/* Alternative options */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Alternative options:</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard} className="flex-1">
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Link
                  </Button>
                  <Button variant="outline" size="sm" onClick={openInNewTab} className="flex-1">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open in Tab
                  </Button>
                </div>
              </div>

              {/* Photo tips */}
              <Alert>
                <AlertDescription className="text-xs">
                  <div className="font-medium mb-1">Photo tips:</div>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Ensure good lighting, avoid shadows</li>
                    <li>• Keep the document flat and all corners visible</li>
                    <li>• Make sure all text is sharp and readable</li>
                    <li>• Avoid glare and reflections</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}