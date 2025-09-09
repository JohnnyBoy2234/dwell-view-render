import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QrCode, Smartphone, Camera, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'react-qr-code';

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'id_front' | 'id_back' | 'selfie';
}

export function QRCodeModal({ open, onOpenChange, type }: QRCodeModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const getTitle = () => {
    switch (type) {
      case 'id_front': return 'Scan to Take Front ID Photo';
      case 'id_back': return 'Scan to Take Back ID Photo';
      case 'selfie': return 'Scan to Take Selfie with ID';
      default: return 'Scan to Take Photo';
    }
  };

  const getInstructions = () => {
    switch (type) {
      case 'id_front': 
        return 'Scan this QR code with your phone to take a high-quality photo of the front of your ID document.';
      case 'id_back': 
        return 'Scan this QR code with your phone to take a high-quality photo of the back of your ID document.';
      case 'selfie': 
        return 'Scan this QR code with your phone to take a selfie while holding your ID document next to your face.';
      default: 
        return 'Scan this QR code with your phone to take a photo.';
    }
  };

  // Create URL for mobile capture
  const mobileUrl = `${window.location.origin}/mobile-capture?type=${type}&session=${Math.random().toString(36).substr(2, 9)}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(mobileUrl);
      setIsCopied(true);
      toast({
        title: "Link copied",
        description: "The mobile capture link has been copied to your clipboard.",
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Unable to copy link. Please try again.",
      });
    }
  };

  const openInNewTab = () => {
    window.open(mobileUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <QrCode className="h-4 w-4" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {getInstructions()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code */}
          <div className="flex justify-center p-3 bg-white rounded-lg">
            <QRCode 
              value={mobileUrl}
              size={160}
              level="M"
            />
          </div>

          {/* Instructions */}
          <Alert className="p-3">
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="text-sm font-medium">How to use:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Open your phone's camera app</li>
                  <li>Point it at the QR code above</li>
                  <li>Tap the notification to open the link</li>
                  <li>Position your ID in the frame for auto-capture</li>
                  <li>The photo will automatically appear here</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>

          {/* Alternative Options */}
          <div className="space-y-2">
            <p className="text-xs font-medium">Alternative options:</p>
            
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="justify-start text-xs h-8"
              >
                <Copy className="h-3 w-3 mr-2" />
                {isCopied ? 'Link Copied!' : 'Copy Link'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewTab}
                className="justify-start text-xs h-8"
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Open in New Tab
              </Button>
            </div>
          </div>

          {/* Tips */}
          <Alert className="p-3">
            <Camera className="h-4 w-4" />
            <AlertDescription>
              <div className="text-xs space-y-1">
                <p className="font-medium">Photo Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Use good lighting, avoid shadows</li>
                  <li>Keep document flat and visible</li>
                  <li>Auto-capture works for ID documents</li>
                  <li>For selfies: hold ID next to face</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}