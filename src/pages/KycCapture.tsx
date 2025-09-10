import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, X, CheckCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function KycCapture() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const sid = searchParams.get('sid');
  const token = searchParams.get('t');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<string>('');

  // Validate parameters on mount
  useEffect(() => {
    // For testing route, allow missing parameters
    const isTestRoute = window.location.pathname === '/kyc/test';
    
    if (!sid || !token) {
      if (!isTestRoute) {
        setError('Invalid capture session. Please scan the QR code again.');
        return;
      } else {
        // Test mode - set default purpose
        setPurpose('id_front');
      }
    }

    // Decode token to get purpose (optional, for better UX)
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setPurpose(payload.purpose || '');
      } catch (err) {
        console.warn('Could not decode token for purpose');
      }
    }
  }, [sid, token]);

  // Start camera
  useEffect(() => {
    if (error) return;

    const startCamera = async () => {
      try {
        // Check if we have mediaDevices support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported on this device');
        }

        const constraints = {
          video: { 
            facingMode: { ideal: purpose === 'selfie' ? 'user' : 'environment' },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          },
          audio: false,
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          // Important for iOS to avoid fullscreen
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('muted', 'true');
          videoRef.current.setAttribute('autoplay', 'true');
          
          // Wait for video to be ready before playing
          await new Promise((resolve) => {
            videoRef.current!.onloadedmetadata = () => resolve(undefined);
          });
          
          await videoRef.current.play();
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        let errorDescription = 'Unable to access camera. ';
        if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
          errorDescription += 'Please allow camera access and refresh the page.';
        } else if (errorMessage.includes('NotFoundError')) {
          errorDescription += 'No camera found on this device.';
        } else if (errorMessage.includes('NotSupportedError')) {
          errorDescription += 'Camera not supported on this device.';
        } else {
          errorDescription += 'Please use the file upload option below.';
        }
        
        setError(errorDescription);
      }
    };

    startCamera();

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [error, purpose]);

  const getPurposeTitle = () => {
    switch (purpose) {
      case 'id_front': return 'Front of ID Document';
      case 'selfie': return 'Selfie with ID';
      default: return 'Take Photo';
    }
  };

  const getPurposeInstructions = () => {
    switch (purpose) {
      case 'id_front': 
        return 'Position the front of your ID document clearly in the camera view. Make sure all text is readable and there\'s no glare.';
      case 'selfie':
        return 'Hold your ID document next to your face. Both your face and the ID should be clearly visible.';
      default: 
        return 'Position your document in the camera view and tap the button to capture.';
    }
  };

  // MANUAL CAPTURE ONLY - No auto-capture
  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to match video
    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, width, height);
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImageUrl(imageUrl);
        
        // Stop camera preview
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      }
    }, 'image/jpeg', 0.92);
  };

  const retakePhoto = () => {
    // Clean up previous capture
    if (capturedImageUrl) {
      URL.revokeObjectURL(capturedImageUrl);
    }
    setCapturedBlob(null);
    setCapturedImageUrl(null);
    
    // Restart camera
    navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: { ideal: purpose === 'selfie' ? 'user' : 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false,
    }).then(mediaStream => {
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    }).catch(err => {
      console.error('Error restarting camera:', err);
      setError('Unable to restart camera');
    });
  };

  const confirmUpload = async () => {
    if (!capturedBlob) return;
    
    // For test mode, just show success
    const isTestRoute = window.location.pathname === '/kyc/test';
    if (isTestRoute) {
      toast({
        title: "Success!",
        description: "Photo captured successfully (test mode).",
      });
      return;
    }
    
    if (!sid || !token) return;
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', capturedBlob, `capture_${sid}.jpg`);
      
      const uploadUrl = `https://rsfrvjaqxhoqavvscvwf.supabase.co/functions/v1/kyc-upload-capture?sid=${sid}&t=${encodeURIComponent(token)}`;
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        toast({
          title: "Success!",
          description: "Photo uploaded successfully. You can return to your computer.",
        });
        
        // Clean up
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        // Show success state
        setTimeout(() => {
          window.close();
        }, 2000);
        
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select an image file.",
      });
      return;
    }
    
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 10MB.",
      });
      return;
    }
    
    setCapturedBlob(file);
    const imageUrl = URL.createObjectURL(file);
    setCapturedImageUrl(imageUrl);
    
    // Stop camera if running
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Capture Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            
            {/* Fallback file input */}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You can still upload a photo from your device:
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Photo from Gallery
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <h1 className="text-lg font-semibold">{getPurposeTitle()}</h1>
        <Button variant="ghost" size="sm" onClick={() => window.close()}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Instructions */}
      <div className="p-4 border-b">
        <Alert>
          <Camera className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {getPurposeInstructions()}
          </AlertDescription>
        </Alert>
      </div>

      {/* Camera/Preview Area */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {capturedImageUrl ? (
          // Show captured image preview
          <div className="h-full w-full flex items-center justify-center">
            <img 
              src={capturedImageUrl} 
              alt="Captured" 
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          // Show camera feed
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-4 bg-background/95 backdrop-blur border-t">
        {capturedImageUrl ? (
          // Review controls
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={retakePhoto}
              disabled={uploading}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button 
              onClick={confirmUpload} 
              disabled={uploading}
              className="flex-1 bg-success hover:bg-success/90"
            >
              {uploading ? (
                'Uploading...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm & Upload
                </>
              )}
            </Button>
          </div>
        ) : stream ? (
          // Camera controls - MANUAL CAPTURE ONLY
          <div className="flex flex-col items-center space-y-4">
            <Button 
              onClick={takePhoto}
              size="lg"
              className="w-16 h-16 rounded-full bg-white text-black hover:bg-white/90 border-4 border-white"
              disabled={!stream}
            >
              <div className="w-8 h-8 bg-black rounded-full" />
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Tap the button to take a photo
            </p>
            
            {/* Alternative file upload */}
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="gallery-upload-kyc"
              />
              <Button variant="outline" size="sm" className="text-xs" asChild>
                <label htmlFor="gallery-upload-kyc" className="cursor-pointer">
                  <Upload className="h-3 w-3 mr-1" />
                  Or choose from gallery
                </label>
              </Button>
            </div>
          </div>
        ) : (
          // Loading camera
          <div className="flex justify-center">
            <Button disabled className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Starting camera...
            </Button>
          </div>
        )}
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}