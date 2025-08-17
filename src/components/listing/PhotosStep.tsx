import React, { useRef } from 'react';
import { UseFormSetValue } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Camera, AlertCircle } from 'lucide-react';
import { ListingFormData } from '@/pages/ListProperty';

interface PhotosStepProps {
  setValue: UseFormSetValue<ListingFormData>;
  formData: ListingFormData;
}

export default function PhotosStep({ setValue, formData }: PhotosStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const images = formData.images || [];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImages = [...images, ...files].slice(0, 15); // Max 15 images
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
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              id="image-upload"
            />
            
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
              disabled={images.length >= 15}
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
            <h3 className="text-lg font-semibold">Uploaded Photos ({images.length}/15)</h3>
            <p className="text-sm text-muted-foreground">Drag to reorder</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={URL.createObjectURL(image)}
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