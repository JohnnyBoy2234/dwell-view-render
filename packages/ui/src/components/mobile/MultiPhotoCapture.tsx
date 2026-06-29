import { useState, useRef } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Camera, Upload, X, Check } from 'lucide-react';
import { MobileServices } from '@mzanzihomes/ui/services/mobileServices';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';

interface MultiPhotoCaptureProps {
  onPhotosSelected: (photos: File[]) => void;
  maxPhotos?: number;
}

export function MultiPhotoCapture({ onPhotosSelected, maxPhotos = 10 }: MultiPhotoCaptureProps) {
  const [capturedPhotos, setCapturedPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isNative = MobileServices.isMobile();

  const handleNativeCamera = async () => {
    if (capturedPhotos.length >= maxPhotos) {
      toast({
        title: 'Maximum photos reached',
        description: `You can only add up to ${maxPhotos} photos`,
        variant: 'destructive',
      });
      return;
    }

    setIsCapturing(true);
    try {
      const result = await MobileServices.takePhoto();
      if (result.success && result.imageUrl) {
        // Convert URL to File
        const response = await fetch(result.imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        const newPhotos = [...capturedPhotos, file];
        const newPreviews = [...previews, result.imageUrl];
        
        setCapturedPhotos(newPhotos);
        setPreviews(newPreviews);
        
        toast({
          title: 'Photo captured',
          description: `${newPhotos.length} of ${maxPhotos} photos`,
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: 'Camera error',
        description: 'Failed to capture photo',
        variant: 'destructive',
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length && capturedPhotos.length + newFiles.length < maxPhotos; i++) {
      const file = files[i];
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    if (capturedPhotos.length + newFiles.length > maxPhotos) {
      toast({
        title: 'Maximum photos reached',
        description: `Only first ${maxPhotos - capturedPhotos.length} photos added`,
      });
    }

    setCapturedPhotos([...capturedPhotos, ...newFiles]);
    setPreviews([...previews, ...newPreviews]);

    // Reset input
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    const newPhotos = capturedPhotos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setCapturedPhotos(newPhotos);
    setPreviews(newPreviews);
  };

  const handleDone = () => {
    if (capturedPhotos.length === 0) {
      toast({
        title: 'No photos',
        description: 'Please capture at least one photo',
        variant: 'destructive',
      });
      return;
    }
    onPhotosSelected(capturedPhotos);
    setCapturedPhotos([]);
    setPreviews([]);
  };

  const handleCancel = () => {
    setCapturedPhotos([]);
    setPreviews([]);
  };

  return (
    <div className="space-y-4">
      {/* Camera/Upload Buttons */}
      <div className="flex gap-2">
        {isNative ? (
          <Button
            type="button"
            onClick={handleNativeCamera}
            disabled={isCapturing || capturedPhotos.length >= maxPhotos}
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-2" />
            {isCapturing ? 'Opening Camera...' : 'Take Photo'}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={capturedPhotos.length >= maxPhotos}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photos
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              capture="environment"
              onChange={handleFileInput}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* Photo Previews */}
      {previews.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {capturedPhotos.length} photo{capturedPhotos.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleDone}
              >
                <Check className="h-4 w-4 mr-1" />
                Add to Note
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {previews.map((preview, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">
                  {index + 1}/{previews.length}
                </div>
              </div>
            ))}
          </div>

          {isNative && capturedPhotos.length < maxPhotos && (
            <Button
              type="button"
              variant="outline"
              onClick={handleNativeCamera}
              disabled={isCapturing}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Another Photo
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
