import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PhotoCaptureProps {
  onPhotoCaptured: (photoUrl: string) => void;
  onRemovePhoto: () => void;
  currentPhoto?: string | null;
  label?: string;
  className?: string;
}

export function PhotoCapture({ 
  onPhotoCaptured, 
  onRemovePhoto, 
  currentPhoto,
  label = 'Add Photo',
  className = '' 
}: PhotoCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Initialize with current photo if provided
  useEffect(() => {
    if (currentPhoto) {
      setPreviewUrl(currentPhoto);
    }
  }, [currentPhoto]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCapturing(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast({
        title: 'Camera Error',
        description: 'Could not access the camera. Please check your permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageUrl = canvas.toDataURL('image/jpeg');
      setPreviewUrl(imageUrl);
      onPhotoCaptured(imageUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setPreviewUrl(imageUrl);
      onPhotoCaptured(imageUrl);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPreviewUrl(null);
    onRemovePhoto();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (isCapturing) {
    return (
      <div className={`flex flex-col items-center space-y-4 ${className}`}>
        <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex space-x-4">
          <Button 
            variant="outline" 
            onClick={stopCamera}
            className="flex items-center"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={capturePhoto}
            className="bg-primary text-white hover:bg-primary/90 flex items-center"
          >
            <Camera className="h-4 w-4 mr-2" />
            Take Photo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {previewUrl ? (
        <div className="relative w-full">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-full h-64 object-cover rounded-lg"
          />
          <button
            onClick={removePhoto}
            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
            aria-label="Remove photo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center">
          <Camera className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 mb-2">No photo added</p>
        </div>
      )}

      <div className="flex space-x-2 w-full">
        <Button
          type="button"
          variant="outline"
          onClick={startCamera}
          className="flex-1 flex items-center justify-center"
        >
          <Camera className="h-4 w-4 mr-2" />
          Take Photo
        </Button>
        
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          id="photo-upload"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>
    </div>
  );
}
