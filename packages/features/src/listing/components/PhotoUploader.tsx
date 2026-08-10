// @ts-nocheck
import * as React from 'react';
import { useRef, useState } from 'react';
import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@mzanzihomes/ui/components/button';
import { Progress } from '@mzanzihomes/ui/components/progress';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';
import { Camera, Loader2, RefreshCw, Star, Upload, X } from 'lucide-react';
import { MIN_PHOTOS, RECOMMENDED_PHOTOS } from '../validation';

const MAX_IMAGES = 15;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface PhotoItem {
  id: string;
  url?: string; // set when uploaded
  file?: File; // set while uploading / on error (for retry)
  preview?: string; // object URL for local preview; revoked once uploaded/removed
  status: 'uploading' | 'done' | 'error';
}

interface PhotoUploaderProps {
  userId: string;
  images: string[]; // already-uploaded URLs, in display order
  onImagesChange: (urls: string[]) => void; // called with ordered done-URLs
}

function storagePathFromUrl(url: string): string | null {
  const marker = '/object/public/property-images/';
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

function SortableTile({
  item,
  index,
  onRemove,
  onRetry,
  onMakeCover,
}: {
  item: PhotoItem;
  index: number;
  onRemove: () => void;
  onRetry: () => void;
  onMakeCover: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: item.status !== 'done',
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  const src = item.url ?? item.preview ?? '';

  return (
    <div ref={setNodeRef} style={style} className="relative group touch-none" {...attributes} {...listeners}>
      <div className={`aspect-square rounded-lg overflow-hidden bg-muted ${isDragging ? 'ring-2 ring-primary' : ''}`}>
        {src ? <img src={src} alt={`Property photo ${index + 1}`} className="w-full h-full object-cover" /> : null}
        {item.status === 'uploading' && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 text-white text-xs">
            <Loader2 className="h-6 w-6 animate-spin" />
            Uploading…
          </div>
        )}
        {item.status === 'error' && (
          <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-2 text-white text-xs p-2 text-center">
            Upload failed
            <Button type="button" size="sm" variant="secondary" onClick={onRetry} className="h-7 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </div>
        )}
      </div>

      {index === 0 && item.status === 'done' && (
        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
          <Star className="h-3 w-3" /> Cover
        </div>
      )}

      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="absolute top-2 right-2 h-7 w-7 p-0 shadow-md"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="h-4 w-4" />
      </Button>

      {index !== 0 && item.status === 'done' && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute bottom-2 left-2 h-7 text-[11px] px-2 shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            onMakeCover();
          }}
        >
          <Star className="h-3 w-3 mr-1" /> Make cover
        </Button>
      )}
    </div>
  );
}

export default function PhotoUploader({ userId, images, onImagesChange }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [items, setItems] = useState<PhotoItem[]>(
    images.map((url) => ({ id: url, url, status: 'done' as const }))
  );
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Safety net: release any remaining blob previews on unmount.
  React.useEffect(
    () => () => {
      itemsRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
    },
    []
  );

  const emit = (next: PhotoItem[]) => {
    // Update the ref synchronously so concurrent async completions (which all
    // read itemsRef.current after their awaits) compose instead of clobbering
    // each other's just-committed state before React re-renders.
    itemsRef.current = next;
    setItems(next);
    onImagesChange(next.filter((i) => i.status === 'done' && i.url).map((i) => i.url!));
  };

  const uploadItem = async (id: string, file: File) => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    let error: unknown;
    try {
      ({ error } = await supabase.storage.from('property-images').upload(path, file));
    } catch (thrown) {
      // Treat an unexpected throw (e.g. network failure) like an upload error
      // so the tile never spins forever.
      error = thrown;
    }
    const current = itemsRef.current;
    const item = current.find((i) => i.id === id);
    if (!item) return; // removed while uploading
    if (error) {
      emit(current.map((i) => (i.id === id ? { ...i, status: 'error' } : i)));
      return;
    }
    const { data } = supabase.storage.from('property-images').getPublicUrl(path);
    emit(
      current.map((i) =>
        i.id === id ? { ...i, url: data.publicUrl, preview: undefined, status: 'done' } : i
      )
    );
    // The remote URL now backs the tile; release the local blob preview.
    if (item.preview) URL.revokeObjectURL(item.preview);
  };

  const addFiles = (files: File[]) => {
    const rejected = files.filter((f) => !ACCEPTED_TYPES.includes(f.type) || f.size > MAX_IMAGE_BYTES);
    let accepted = files.filter((f) => ACCEPTED_TYPES.includes(f.type) && f.size <= MAX_IMAGE_BYTES);
    if (rejected.length > 0) {
      toast({
        variant: 'destructive',
        title: `${rejected.length} photo${rejected.length > 1 ? 's' : ''} skipped`,
        description: 'Photos must be JPG, PNG or WebP and no larger than 10MB each.',
      });
    }
    const room = MAX_IMAGES - itemsRef.current.length;
    if (accepted.length > room) {
      toast({ title: 'Photo limit reached', description: `Only the first ${MAX_IMAGES} photos are kept.` });
      accepted = accepted.slice(0, Math.max(0, room));
    }
    if (accepted.length === 0) return;
    const newItems: PhotoItem[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: 'uploading' as const,
    }));
    emit([...itemsRef.current, ...newItems]);
    newItems.forEach((item) => void uploadItem(item.id, item.file!));
  };

  const removeItem = (id: string) => {
    const item = itemsRef.current.find((i) => i.id === id);
    emit(itemsRef.current.filter((i) => i.id !== id));
    if (item?.preview) URL.revokeObjectURL(item.preview);
    // Best-effort storage cleanup for uploaded photos.
    if (item?.url) {
      const path = storagePathFromUrl(item.url);
      if (path) void supabase.storage.from('property-images').remove([path]);
    }
  };

  const retryItem = (id: string) => {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item?.file) return;
    emit(itemsRef.current.map((i) => (i.id === id ? { ...i, status: 'uploading' } : i)));
    void uploadItem(id, item.file);
  };

  const makeCover = (id: string) => {
    const idx = itemsRef.current.findIndex((i) => i.id === id);
    if (idx <= 0) return;
    emit(arrayMove(itemsRef.current, idx, 0));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  const doneCount = items.filter((i) => i.status === 'done').length;
  const progressPct = Math.min(100, (doneCount / RECOMMENDED_PHOTOS) * 100);

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className={`font-medium ${doneCount < MIN_PHOTOS ? 'text-amber-600' : 'text-green-600'}`}>
            {doneCount} of {RECOMMENDED_PHOTOS} recommended photos
          </span>
          <span className="text-muted-foreground">
            {MIN_PHOTOS} minimum · {RECOMMENDED_PHOTOS}+ recommended
          </span>
        </div>
        <Progress value={progressPct} className="h-2" />
        {doneCount < MIN_PHOTOS && (
          <p className="text-xs text-amber-600">
            Add {MIN_PHOTOS - doneCount} more photo{MIN_PHOTOS - doneCount === 1 ? '' : 's'} before you can publish.
          </p>
        )}
      </div>

      {/* Upload zone */}
      <div className="border-2 border-dashed rounded-xl p-6 text-center space-y-3">
        <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
          <Camera className="h-7 w-7 text-primary" />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            if (e.target.files) addFiles(Array.from(e.target.files));
            e.target.value = '';
          }}
          className="sr-only"
          id="image-upload"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2"
          disabled={items.length >= MAX_IMAGES}
        >
          <Upload className="h-4 w-4" />
          {items.length === 0 ? 'Choose Photos' : 'Add More Photos'}
        </Button>
        <p className="text-xs text-muted-foreground">JPG, PNG or WebP · max 10MB each · up to {MAX_IMAGES} photos</p>
      </div>

      {/* Sortable grid */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your photos ({items.length}/{MAX_IMAGES})</h3>
            <p className="text-sm text-muted-foreground">Drag to reorder — first photo is your cover</p>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!over || active.id === over.id) return;
              const from = itemsRef.current.findIndex((i) => i.id === active.id);
              const to = itemsRef.current.findIndex((i) => i.id === over.id);
              if (from !== -1 && to !== -1) emit(arrayMove(itemsRef.current, from, to));
            }}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((item, index) => (
                  <SortableTile
                    key={item.id}
                    item={item}
                    index={index}
                    onRemove={() => removeItem(item.id)}
                    onRetry={() => retryItem(item.id)}
                    onMakeCover={() => makeCover(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
