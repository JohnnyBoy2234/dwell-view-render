import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Camera, ImageIcon } from 'lucide-react';
import { MobileServices } from '@/services/mobileServices';
import { useMobile } from '@/hooks/useMobile';
import { toast } from 'sonner';

interface MobileCameraProps {
  onPhotoTaken: (imageUrl: string) => void;
  children?: React.ReactNode;
}

export function MobileCamera({ onPhotoTaken, children }: MobileCameraProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isNative } = useMobile();

  const handleTakePhoto = async () => {
    try {
      const result = await MobileServices.takePhoto();
      if (result.success && result.imageUrl) {
        onPhotoTaken(result.imageUrl);
        setIsOpen(false);
        await MobileServices.vibrateLight();
        toast.success('Photo captured successfully');
      } else {
        toast.error('Failed to take photo');
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Camera access failed');
    }
  };

  const handleSelectFromGallery = async () => {
    try {
      const result = await MobileServices.selectFromGallery();
      if (result.success && result.imageUrl) {
        onPhotoTaken(result.imageUrl);
        setIsOpen(false);
        await MobileServices.vibrateLight();
        toast.success('Photo selected successfully');
      } else {
        toast.error('Failed to select photo');
      }
    } catch (error) {
      console.error('Gallery error:', error);
      toast.error('Gallery access failed');
    }
  };

  if (!isNative) {
    return children || null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        {children || (
          <Button variant="outline" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Take Photo
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add Photo</AlertDialogTitle>
          <AlertDialogDescription>
            Choose how you'd like to add a photo
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleTakePhoto} className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Take Photo
          </AlertDialogAction>
          <AlertDialogAction onClick={handleSelectFromGallery} className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Choose from Gallery
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}