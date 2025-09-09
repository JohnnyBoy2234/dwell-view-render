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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {getInstructions()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <QRCode 
              value={mobileUrl}
              size={200}
              level="M"
            />
          </div>

          {/* Instructions */}
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>How to use:</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Open your phone's camera app</li>
                  <li>Point it at the QR code above</li>
                  <li>Tap the notification to open the link</li>
                  <li>Follow the on-screen instructions to take your photo</li>
                  <li>The photo will automatically appear here</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>

          {/* Alternative Options */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Alternative options:</p>
            
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="justify-start"
              >
                <Copy className="h-4 w-4 mr-2" />
                {isCopied ? 'Link Copied!' : 'Copy Link to Send Manually'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewTab}
                className="justify-start"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          </div>

          {/* Tips */}
          <Alert>
            <Camera className="h-4 w-4" />
            <AlertDescription>
              <div className="text-xs space-y-1">
                <p><strong>Photo Tips:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Use good lighting, avoid shadows and glare</li>
                  <li>Keep the document flat and all edges visible</li>
                  <li>Make sure all text is clearly readable</li>
                  <li>For selfies: hold ID next to your face, both should be visible</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}