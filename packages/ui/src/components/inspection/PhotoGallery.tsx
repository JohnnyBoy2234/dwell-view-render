import { X } from 'lucide-react';
import { Button } from '@mzanzihomes/ui/components/button';
import { ImageWithSkeleton } from '@mzanzihomes/ui/components/ImageWithSkeleton';

interface Photo {
  id: string;
  previewUrl: string;
  file?: File;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onDelete?: (photoId: string) => void;
  onView?: (index: number) => void;
  readOnly?: boolean;
}

export function PhotoGallery({ photos, onDelete, onView, readOnly = false }: PhotoGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        {photos.length} photo{photos.length !== 1 ? 's' : ''} attached
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-muted group cursor-pointer hover:ring-2 hover:ring-ocean-blue transition-all"
            onClick={() => onView?.(index)}
          >
            <ImageWithSkeleton
              src={photo.previewUrl}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover"
              aspectRatio="square"
            />
            
            {/* Photo number badge */}
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded-md font-medium">
              {index + 1}
            </div>

            {/* Delete button */}
            {!readOnly && onDelete && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(photo.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
