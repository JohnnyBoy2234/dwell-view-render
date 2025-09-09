import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { useKyc } from '@/hooks/useKyc';
import { useToast } from '@/hooks/use-toast';

interface MobilePhotoCaptureProps {
  type: 'id_front' | 'id_back' | 'selfie';
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function MobilePhotoCapture({ type, onCapture, onClose }: MobilePhotoCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { uploadFile, uploading } = useKyc();
  const { toast } = useToast();

  const getTitle = () => {
    switch (type) {
      case 'id_front': return 'Photo: Front of ID';
      case 'id_back': return 'Photo: Back of ID';
      case 'selfie': return 'Selfie with ID in Hand';
      default: return 'Take Photo';
    }
  };

  const getInstructions = () => {
    switch (type) {
      case 'id_front': 
        return 'Position the front of your ID document in the frame. Ensure all text is clearly visible and there\'s no glare.';
      case 'id_back': 
        return 'Position the back of your ID document in the frame. Make sure all information is clearly readable.';
      case 'selfie': 
        return 'Hold your ID document next to your face. Both your face and the ID should be clearly visible in the photo.';
      default: 
        return 'Position your document in the frame.';
    }
  };

  const startCamera = useCallback(async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: type === 'selfie' ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          startAutoDetection();
        };
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
      });
      setIsCapturing(false);
    }
  }, [type, toast]);

  const startAutoDetection = () => {
    if (type === 'selfie') return; // Skip auto-detection for selfies
    
    setIsAutoDetecting(true);
    let progress = 0;
    
    detectionIntervalRef.current = setInterval(() => {
      if (hasDocumentInFrame()) {
        progress += 10;
        setDetectionProgress(progress);
        
        if (progress >= 100) {
          clearInterval(detectionIntervalRef.current!);
          setDetectionProgress(0);
          setIsAutoDetecting(false);
          capturePhoto();
        }
      } else {
        progress = Math.max(0, progress - 5);
        setDetectionProgress(progress);
      }
    }, 200);
  };

  const hasDocumentInFrame = () => {
    // Simple document detection based on frame analysis
    // In a real app, you'd use more sophisticated computer vision
    if (!videoRef.current || !canvasRef.current) return false;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return false;
    
    // Set small canvas for analysis
    canvas.width = 320;
    canvas.height = 240;
    context.drawImage(video, 0, 0, 320, 240);
    
    const imageData = context.getImageData(80, 60, 160, 120);
    const data = imageData.data;
    
    let edges = 0;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (brightness > 200 || brightness < 50) edges++;
    }
    
    // Simple heuristic: if there are enough high-contrast areas, assume document is present
    return edges > imageData.width * imageData.height * 0.1;
  };

  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

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
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    setIsCapturing(false);
    setIsAutoDetecting(false);
    setDetectionProgress(0);
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
                    capture="environment"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button variant="outline" className="w-full" size="lg">
                    <Upload className="h-5 w-5 mr-2" />
                    Upload from Gallery
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Overlay for camera guide */}
          {isCapturing && !capturedImage && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="h-full flex items-center justify-center">
                <div className={`relative border-2 rounded-lg transition-all duration-300 ${
                  isAutoDetecting 
                    ? `border-green-400 shadow-lg shadow-green-400/50` 
                    : 'border-white/50'
                }`}>
                  {type === 'selfie' ? (
                    <div className="w-64 h-80 bg-transparent" />
                  ) : (
                    <div className="w-80 h-48 bg-transparent" />
                  )}
                  
                  {/* Detection progress overlay */}
                  {isAutoDetecting && detectionProgress > 0 && (
                    <div className="absolute inset-0 rounded-lg overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-1 bg-green-400 transition-all duration-200"
                        style={{ width: `${detectionProgress}%` }}
                      />
                      <div 
                        className="absolute top-0 right-0 w-1 bg-green-400 transition-all duration-200"
                        style={{ height: `${detectionProgress}%` }}
                      />
                      <div 
                        className="absolute bottom-0 right-0 h-1 bg-green-400 transition-all duration-200"
                        style={{ width: `${detectionProgress}%` }}
                      />
                      <div 
                        className="absolute bottom-0 left-0 w-1 bg-green-400 transition-all duration-200"
                        style={{ height: `${detectionProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Auto-detection status */}
              {isAutoDetecting && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm font-medium">
                      {detectionProgress > 0 ? 'Detecting document...' : 'Position your ID in the frame'}
                    </div>
                    {detectionProgress > 0 && (
                      <div className="text-xs mt-1">
                        {Math.round(detectionProgress)}% - Hold still!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="p-4 bg-background border-t">
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
            // Camera controls
            <div className="flex flex-col items-center space-y-4">
              {type !== 'selfie' && (
                <div className="text-center text-sm text-muted-foreground">
                  {isAutoDetecting ? 'Auto-capture active' : 'Manual capture mode'}
                </div>
              )}
              <Button 
                onClick={capturePhoto}
                size="lg"
                className="w-16 h-16 rounded-full bg-white text-black hover:bg-white/90"
                disabled={isAutoDetecting && detectionProgress > 50}
              >
                <div className="w-12 h-12 border-4 border-black rounded-full" />
              </Button>
              {type !== 'selfie' && (
                <div className="text-xs text-center text-muted-foreground max-w-xs">
                  Position your ID in the white frame for auto-capture, or tap the button to take a photo manually
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}