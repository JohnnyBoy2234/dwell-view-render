import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MobilePhotoCapture } from '@/components/kyc/MobilePhotoCapture';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function MobileCapture() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [captureType, setCaptureType] = useState<'id_front' | 'selfie' | null>(null);

  useEffect(() => {
    const type = searchParams.get('type');
    const session = searchParams.get('session');

    // Validate parameters
    if (!type || !session) {
      return;
    }

    if (!['id_front', 'selfie'].includes(type)) {
      return;
    }

    setCaptureType(type as 'id_front' | 'selfie');
  }, [searchParams]);

  const handleCapture = (file: File) => {
    // Notify parent window of successful upload
    if (window.opener) {
      window.opener.postMessage({
        type: 'kyc-upload-success',
        captureType: captureType,
        fileName: file.name
      }, '*');
    }
    
    // Show success and close
    setTimeout(() => {
      window.close();
    }, 1000);
  };

  const handleClose = () => {
    navigate('/');
  };

  if (!captureType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Invalid capture session. Please scan the QR code again or return to the verification page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <MobilePhotoCapture
      type={captureType}
      onCapture={handleCapture}
      onClose={handleClose}
    />
  );
}