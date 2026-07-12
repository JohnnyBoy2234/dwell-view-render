import * as React from 'react';
import { useRef } from 'react';
import { UseFormSetValue } from 'react-hook-form';
import { Label } from '@mzanzihomes/ui/components/label';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Upload, X, Camera, AlertCircle } from 'lucide-react';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { ListingFormData } from '../types';
import PhotoUploader from './PhotoUploader';
import { RECOMMENDED_PHOTOS } from '../validation';

const MAX_IMAGES = 15;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // the "max 10MB each" the copy below promises
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const RECOMMENDED_SHOTS = ['Front exterior', 'Living room', 'Kitchen', 'Main bedroom', 'Bathroom'];

interface PhotosStepProps {
  setValue: UseFormSetValue<ListingFormData>;
  formData: ListingFormData;
  // Rent wizard: photos upload immediately and are autosaved to the draft.
  upload?: { userId: string; onSaved: (urls: string[]) => void };
}

export default function PhotosStep({ setValue, formData, upload }: PhotosStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const images = formData.images || [];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const rejected = files.filter(
        (f) => !ACCEPTED_TYPES.includes(f.type) || f.size > MAX_IMAGE_BYTES
      );
      const accepted = files.filter(
        (f) => ACCEPTED_TYPES.includes(f.type) && f.size <= MAX_IMAGE_BYTES
      );
      if (rejected.length > 0) {
        toast({
          variant: 'destructive',
          title: `${rejected.length} photo${rejected.length > 1 ? 's' : ''} skipped`,
          description: 'Photos must be JPG, PNG or WebP and no larger than 10MB each.',
        });
      }
      const newImages = [...images, ...accepted].slice(0, MAX_IMAGES);
      if (images.length + accepted.length > MAX_IMAGES) {
        toast({
          title: 'Photo limit reached',
          description: `Only the first ${MAX_IMAGES} photos are kept.`,
        });
      }
      setValue('images', newImages);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setValue('images', newImages);
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [removed] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, removed);
    setValue('images', newImages);
  };

  if (upload) {
    const urls = (formData.images || []).filter((i): i is string => typeof i === 'string');
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Add photos of your property</h2>
          <p className="text-muted-foreground">
            Listings with more quality photos receive significantly more tenant enquiries.
          </p>
        </div>

        {/* Quality tips — read before uploading */}
        <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <CardContent className="p-5">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">📸 Photo tips</h3>
                <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  <li>• Shoot during the day with good natural light</li>
                  <li>• Clean and declutter each room first</li>
                  <li>• Use landscape orientation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommended shots */}
        <div className="flex flex-wrap items-center gap-2 justify-center">
          <span className="text-sm text-muted-foreground">Recommended shots:</span>
          {RECOMMENDED_SHOTS.map((shot) => (
            <span key={shot} className="text-xs bg-muted text-muted-foreground rounded-full px-3 py-1">
              {shot}
            </span>
          ))}
        </div>

        <PhotoUploader
          userId={upload.userId}
          images={urls}
          onImagesChange={(next) => {
            setValue('images', next, { shouldDirty: true });
            upload.onSaved(next);
          }}
        />
      </div>
    );
  }

  // Legacy deferred-upload behaviour (sale flow) — existing JSX unchanged below.
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Add photos of your property</h2>
        <p className="text-muted-foreground">High-quality photos help your listing stand out</p>
      </div>

      {/* Upload Area */}
      <Card className="border-2 border-dashed">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Upload Property Photos</h3>
              <p className="text-muted-foreground mb-4">
                Add up to 15 photos. The first photo will be your main listing image.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="sr-only"
              id="image-upload"
            />
            
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
              disabled={images.length >= MAX_IMAGES}
            >
              <Upload className="h-4 w-4" />
              {images.length === 0 ? 'Choose Photos' : 'Add More Photos'}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Supported formats: JPG, PNG, WebP (max 10MB each)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Uploaded Photos ({images.length}/{MAX_IMAGES})</h3>
            <p className="text-sm text-muted-foreground">Drag to reorder</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={typeof image === 'string' ? image : URL.createObjectURL(image)}
                    alt={`Property ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Main Photo Badge */}
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    Main Photo
                  </div>
                )}
                
                {/* Remove Button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                {/* Photo Number */}
                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo Tips */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">
                📸 Photo Tips for Better Results
              </h3>
              <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <li>• Take photos during the day with good natural lighting</li>
                <li>• Clean and declutter rooms before photographing</li>
                <li>• Include all rooms, especially bedrooms and bathrooms</li>
                <li>• Show exterior views and any outdoor spaces</li>
                <li>• Highlight unique features and amenities</li>
                <li>• Use landscape orientation for better viewing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}