import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { useKyc } from '@/hooks/useKyc';
import { useToast } from '@/hooks/use-toast';

interface MobilePhotoCaptureProps {
  type: 'id_front' | 'selfie';
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function MobilePhotoCapture({ type, onCapture, onClose }: MobilePhotoCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { uploadFile, uploading } = useKyc();
  const { toast } = useToast();

  const getTitle = () => {
    switch (type) {
      case 'id_front': return 'Photo: Front of ID';
      case 'selfie': return 'Selfie with ID in Hand';
      default: return 'Take Photo';
    }
  };

  const getInstructions = () => {
    switch (type) {
      case 'id_front': 
        return 'Position the front of your ID document in the frame. Ensure all text is clearly visible and there\'s no glare.';
      case 'selfie':
        return 'Hold your ID document next to your face. Both your face and the ID should be clearly visible in the photo.';
      default: 
        return 'Position your document in the frame.';
    }
  };

  const startCamera = useCallback(async () => {
    try {
      setIsCapturing(true);
      
      // Check if we have mediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      const constraints = {
        video: { 
          facingMode: type === 'selfie' ? 'user' : 'environment',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('muted', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          videoRef.current!.onloadedmetadata = () => resolve(undefined);
        });
        
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      let description = "Unable to access camera. ";
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        description += "Please allow camera access and try again.";
      } else if (errorMessage.includes('NotFoundError')) {
        description += "No camera found on this device.";
      } else if (errorMessage.includes('NotSupportedError')) {
        description += "Camera not supported on this device.";
      } else {
        description += "Please use the gallery upload option.";
      }
      
      toast({
        variant: "destructive",
        title: "Camera Error",
        description,
      });
      setIsCapturing(false);
    }
  }, [type, toast]);

  // REMOVED AUTO-DETECTION CODE - Manual capture only

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${type}_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const imageUrl = URL.createObjectURL(blob);
        
        setCapturedImage(imageUrl);
        setCapturedFile(file);
        
        // Stop camera
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCapturing(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Invalid File",
          description: "Please select an image file.",
        });
        return;
      }

      const imageUrl = URL.createObjectURL(file);
      setCapturedImage(imageUrl);
      setCapturedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!capturedFile) return;

    try {
      await uploadFile(capturedFile, type);
      toast({
        title: "Photo uploaded successfully",
        description: `Your ${type.replace('_', ' ')} has been uploaded.`,
      });
      onCapture(capturedFile);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Please try again.",
      });
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-lg font-semibold">{getTitle()}</h1>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Instructions */}
        <div className="p-4 border-b">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {getInstructions()}
            </AlertDescription>
          </Alert>
        </div>

        {/* Camera/Preview Area */}
        <div className="flex-1 relative bg-black">
          {capturedImage ? (
            // Show captured image
            <div className="h-full flex items-center justify-center">
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : isCapturing ? (
            // Show camera feed
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            // Show start screen
            <div className="h-full flex flex-col items-center justify-center space-y-6 p-8">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                <Camera className="h-12 w-12 text-primary" />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-white">Ready to take photo</h3>
                <p className="text-muted-foreground text-center">
                  Position your camera and tap the button below to start
                </p>
              </div>

              <div className="space-y-3 w-full max-w-xs">
                <Button 
                  onClick={startCamera} 
                  className="w-full"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Start Camera
                </Button>
                
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="gallery-upload"
                  />
                  <Button variant="outline" className="w-full" size="lg" asChild>
                    <label htmlFor="gallery-upload" className="cursor-pointer">
                      <Upload className="h-5 w-5 mr-2" />
                      Upload from Gallery
                    </label>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Simple camera guide overlay */}
          {isCapturing && !capturedImage && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="h-full flex items-center justify-center">
                <div className="relative border-2 border-white/50 rounded-lg">
                  {type === 'selfie' ? (
                    <div className="w-64 h-80 bg-transparent" />
                  ) : (
                    <div className="w-80 h-48 bg-transparent" />
                  )}
                </div>
              </div>
              
              {/* Manual capture instruction */}
              <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg">
                <div className="text-center text-sm">
                  Position your {type === 'selfie' ? 'face and ID' : 'ID document'} in the frame, then tap the button to capture
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="p-4 pb-20 bg-background border-t">{/* Added pb-20 for mobile navigation */}
          {capturedImage ? (
            // Review controls
            <div className="flex justify-between">
              <Button variant="outline" onClick={retake}>
                Retake
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={uploading}
                className="bg-success hover:bg-success/90"
              >
                {uploading ? 'Uploading...' : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Use Photo
                  </>
                )}
              </Button>
            </div>
          ) : isCapturing ? (
            // Manual camera controls only
            <div className="flex flex-col items-center space-y-4">
              <Button 
                onClick={capturePhoto}
                size="lg"
                className="w-16 h-16 rounded-full bg-white text-black hover:bg-white/90"
              >
                <div className="w-12 h-12 border-4 border-black rounded-full" />
              </Button>
              <div className="text-xs text-center text-muted-foreground max-w-xs">
                Tap the button to take a photo
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}