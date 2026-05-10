import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageWithSkeleton } from '@/components/ui/ImageWithSkeleton';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MaintenanceImageGalleryProps {
  images: string[];
  ticketTitle?: string;
}

export function MaintenanceImageGallery({ images, ticketTitle }: MaintenanceImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

  const handleImageClick = (index: number) => {
    if (!imageErrors.has(index)) {
      setSelectedImageIndex(index);
    }
  };

  const nextImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex(selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1);
    }
  };

  const validImages = images.filter((_, index) => !imageErrors.has(index));

  if (!images.length) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {images.map((imageUrl, index) => (
          <div
            key={index}
            className="relative group cursor-pointer overflow-hidden rounded-md border"
            onClick={() => handleImageClick(index)}
          >
            {imageErrors.has(index) ? (
              <div className="w-full h-24 bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Image unavailable</span>
              </div>
            ) : (
              <ImageWithSkeleton
                src={imageUrl}
                alt={`Maintenance image ${index + 1}`}
                className="w-full h-24 object-cover transition-transform group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
        ))}
      </div>

      {/* Image Modal */}
      <Dialog open={selectedImageIndex !== null} onOpenChange={() => setSelectedImageIndex(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-lg">
              {ticketTitle ? `${ticketTitle} - Image ${(selectedImageIndex || 0) + 1} of ${images.length}` : `Image ${(selectedImageIndex || 0) + 1} of ${images.length}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="relative flex items-center justify-center p-4">
            {selectedImageIndex !== null && (
              <>
                <img
                  src={images[selectedImageIndex]}
                  alt={`Maintenance image ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  onError={() => handleImageError(selectedImageIndex)}
                />
                
                {images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => setSelectedImageIndex(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          
          {images.length > 1 && (
            <div className="flex justify-center gap-2 p-4 pt-0">
              {images.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === selectedImageIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                  onClick={() => setSelectedImageIndex(index)}
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}