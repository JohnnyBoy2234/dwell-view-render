import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { X, Trash2, Camera } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MultiPhotoCapture } from '@/components/mobile/MultiPhotoCapture';
import { PhotoGallery } from '@/components/inspection/PhotoGallery';
import { PhotoLightbox } from '@/components/inspection/PhotoLightbox';

interface InventoryStartPanelProps {
  propertyId?: string;
}

interface Photo {
  id: string;
  file: File;
  previewUrl: string;
}

interface Note {
  id: string;
  audioUrl: string;
  createdAt: number;
  photos: Photo[];
  audioBlob?: Blob;
  text?: string;
  saved?: boolean;
  savingInProgress?: boolean;
}

function useAnalytics() {
  const track = (event: string) => {
    console.log('Analytics event:', event);
  };
  return { track };
}

export function InventoryStartPanel({ propertyId }: InventoryStartPanelProps) {
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { user } = useAuth();

  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuickNoteId, setPendingQuickNoteId] = useState<string | null>(null);
  const quickPhotoInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const webpSupportedRef = useRef<boolean | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxNoteId, setLightboxNoteId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const deepLink = propertyId
    ? `https://app.swiftrent.co.za/inventory/start?propertyId=${propertyId}`
    : '';

  useEffect(() => {
    track('inventory_instructions_viewed');
    track('inventory_qr_rendered');
    // Suppress noisy extension errors like:
    // "A listener indicated an asynchronous response ..."
    const onUnhandled = (e: PromiseRejectionEvent) => {
      const msg = (e?.reason && (e.reason.message || String(e.reason))) || '';
      if (typeof msg === 'string' && msg.includes('A listener indicated an asynchronous response')) {
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandled);
    };
  }, [track]);

  // Detect WebP support (older iOS Safari doesn't support it)
  useEffect(() => {
    if (webpSupportedRef.current !== null) return;
    try {
      const img = new Image();
      img.onload = () => {
        webpSupportedRef.current = img.width > 0 && img.height > 0;
      };
      img.onerror = () => {
        webpSupportedRef.current = false;
      };
      img.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v89WAAA';
    } catch {
      webpSupportedRef.current = false;
    }
  }, []);

  const startRecording = async () => {
    if (!navigator.mediaDevices || typeof window.MediaRecorder === 'undefined') {
      setError('Browser does not support audio recording');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        const newNote: Note = {
          id: crypto.randomUUID(),
          audioUrl,
          createdAt: Date.now(),
          photos: [],
          audioBlob: blob,
          saved: false,
        };
        setNotes((prev) => [...prev, newNote]);
        setHasUnsavedChanges(true);
        track('inventory_voice_note_saved');
        toast({ title: 'Voice note recorded' });
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setError(null);
      track('inventory_voice_note_started');
    } catch (err) {
      console.error(err);
      setError('Microphone permission denied');
    }
  };

  const uploadToInventoryBucket = async (path: string, file: File | Blob, contentType?: string): Promise<string> => {
    // Use private KYC bucket with user-based RLS; store under inventory/{userId}/...
    // This avoids landlord-only policies on property-images.
    const bucket = 'kyc-uploads';
    const finalPath = `inventory/${user!.id}/${path}`;
    console.log('Uploading to bucket:', bucket, 'path:', finalPath, 'contentType:', contentType);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(finalPath, file as any, {
        cacheControl: '3600',
        upsert: false,
        contentType,
      });
    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }
    console.log('Storage upload successful:', data.path);
    // Return storage path for secure access later
    return data.path;
  };

  const handleSave = async () => {
    if (!user) {
      toast({ title: 'Please sign in to save', variant: 'destructive' });
      return;
    }
    if (!propertyId) {
      toast({ title: 'Missing property', variant: 'destructive' });
      return;
    }
    const unsavedNotes = notes.filter(note => !note.saved);
    if (unsavedNotes.length === 0) {
      toast({ title: 'Nothing to save', description: 'All notes are already saved.' });
      return;
    }

    setSaving(true);
    try {
      // Fetch landlord for the property
      const { data: prop, error: propErr } = await supabase
        .from('properties')
        .select('landlord_id')
        .eq('id', propertyId)
        .maybeSingle();
      if (propErr) throw propErr;
      if (!prop) throw new Error('Property not found');

      // Find or create inventory record for this property and tenant
      const { data: existingRecords, error: findErr } = await supabase
        .from('inventory_records' as any)
        .select('id, photos_count, voice_notes_count, rooms_recorded')
        .eq('property_id', propertyId)
        .eq('tenant_id', user.id)
        .limit(1);
      if (findErr) throw findErr;

      let recordId: string;
      if (!existingRecords || existingRecords.length === 0) {
        const { data: created, error: insertErr } = await supabase
          .from('inventory_records' as any)
          .insert({
            property_id: propertyId,
            tenant_id: user.id,
            landlord_id: prop.landlord_id,
            country: 'South Africa',
            status: 'in_progress',
          })
          .select('id')
          .single();
        if (insertErr) throw insertErr;
        recordId = (created as any).id;
      } else {
        recordId = (existingRecords[0] as any).id;
      }

      // Mark unsaved notes as saving in progress
      setNotes(prev => prev.map(note => 
        !note.saved ? { ...note, savingInProgress: true } : note
      ));

      // Upload all media and build items (only for unsaved notes)
      const itemsPayload: Array<{
        inventory_record_id: string;
        room_name: string;
        item_name: string;
        condition: string;
        description?: string;
        photos: string[];
        voice_note_url?: string;
      }> = [];

      for (const [index, note] of unsavedNotes.entries()) {
        const noteId = note.id;
        const uploadedPhotoPaths: string[] = [];
        for (const photo of note.photos) {
          const file = photo.file;
          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
          const filename = `${crypto.randomUUID()}.${ext}`;
          const path = `${propertyId}/${recordId}/${noteId}/${filename}`;
          console.log('Uploading photo:', path, 'Size:', file.size);
          const storagePath = await uploadToInventoryBucket(path, file, file.type);
          console.log('Photo uploaded to:', storagePath);
          uploadedPhotoPaths.push(storagePath);
        }

        let audioPath: string | undefined;
        if (note.audioBlob && note.audioBlob.size > 0) {
          const filename = `${crypto.randomUUID()}.webm`;
          const path = `${propertyId}/${recordId}/${noteId}/${filename}`;
          console.log('Uploading voice note:', path, 'Size:', note.audioBlob.size);
          audioPath = await uploadToInventoryBucket(path, note.audioBlob, 'audio/webm');
          console.log('Voice note uploaded to:', audioPath);
        }

        itemsPayload.push({
          inventory_record_id: recordId,
          room_name: 'General',
          item_name: `Note ${index + 1}`,
          condition: 'good',
          description: note.text || undefined,
          photos: uploadedPhotoPaths,
          voice_note_url: audioPath,
        });
      }

      if (itemsPayload.length > 0) {
        console.log('Inserting inventory items:', itemsPayload);
        const { error: itemsErr } = await supabase.from('inventory_items' as any).insert(itemsPayload);
        if (itemsErr) {
          console.error('Failed to insert inventory items:', itemsErr);
          throw itemsErr;
        }
        console.log('Successfully inserted inventory items');
      }

      // Update counts on the record (count all notes, not just newly saved ones)
      const photosCount = notes.reduce((acc, n) => acc + n.photos.length, 0);
      const voiceCount = notes.filter(n => n.audioBlob && n.audioBlob.size > 0).length;
      console.log('Updating inventory record counts:', { photosCount, voiceCount, notesLength: notes.length });
      
      const { error: updErr } = await supabase
        .from('inventory_records' as any)
        .update({
          rooms_recorded: notes.length,
          photos_count: photosCount,
          voice_notes_count: voiceCount,
          status: 'in_progress',
        })
        .eq('id', recordId);
      if (updErr) throw updErr;

      // Mark the unsaved notes as saved
      setNotes(prev => prev.map(note => 
        !note.saved ? { ...note, saved: true, savingInProgress: false } : note
      ));
      setHasUnsavedChanges(false);

      toast({ 
        title: 'Inventory saved', 
        description: `${unsavedNotes.length} note(s) saved at ${new Date().toLocaleString()}` 
      });
    } catch (e: any) {
      console.error('Save inventory failed:', e);
      // Reset saving state for failed notes
      setNotes(prev => prev.map(note => 
        note.savingInProgress ? { ...note, savingInProgress: false } : note
      ));
      toast({ title: 'Failed to save inventory', description: e.message || String(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    mediaRecorder?.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  const readAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const convertToJpegDataUrl = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const jpegUrl = canvas.toDataURL('image/jpeg', 0.9);
          resolve(jpegUrl);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Image decode failed'));
      img.src = dataUrl;
    });
  };

  const handleAddPhotos = async (noteId: string, files: FileList | null) => {
    if (!files) return;
    const newPhotos: Photo[] = [];
    for (const file of Array.from(files)) {
      const name = (file.name || '').toLowerCase();
      const ext = name.split('.').pop() || '';
      const contentType = (file.type || '').toLowerCase();
      const isHeic = contentType.includes('heic') || ext === 'heic' || ext === 'heif';
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
      const isAllowedType =
        allowedTypes.includes(contentType) ||
        ((contentType === '' || contentType === 'application/octet-stream') && allowedExts.includes(ext));

      if (isHeic || !isAllowedType) {
        toast({
          title: 'Unsupported image format',
          description: 'Please upload JPEG, PNG, or WebP images. HEIC is not supported.',
          variant: 'destructive',
        });
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File too large', variant: 'destructive' });
        continue;
      }
      let previewUrl = '';
      try {
        // Use Data URL for broader compatibility across mobile browsers
        previewUrl = await readAsDataUrl(file);
        if ((contentType === 'image/webp' || ext === 'webp') && webpSupportedRef.current === false) {
          // Convert to JPEG preview if WebP unsupported
          previewUrl = await convertToJpegDataUrl(previewUrl);
        }
      } catch {
        // Fallback to object URL if FileReader fails
        try {
          previewUrl = URL.createObjectURL(file);
        } catch {}
      }
      if (!previewUrl) {
        toast({ title: 'Preview failed', description: 'Could not generate image preview', variant: 'destructive' });
        continue;
      }
      newPhotos.push({ id: crypto.randomUUID(), file, previewUrl });
      track('inventory_photo_attached');
    }
    if (newPhotos.length) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, photos: [...n.photos, ...newPhotos], saved: false } : n
        )
      );
      setHasUnsavedChanges(true);
      toast({ title: 'Photo attached' });
    }
  };

  const createEmptyNote = (): string => {
    const id = crypto.randomUUID();
    const newNote: Note = { id, audioUrl: '', createdAt: Date.now(), photos: [], saved: false };
    setNotes((prev) => [newNote, ...prev]);
    setHasUnsavedChanges(true);
    return id;
  };

  const triggerQuickPhotoCapture = () => {
    const id = createEmptyNote();
    setPendingQuickNoteId(id);
    quickPhotoInputRef.current?.click();
  };

  const deleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    const remainingUnsaved = notes.filter(n => n.id !== noteId && !n.saved);
    setHasUnsavedChanges(remainingUnsaved.length > 0);
    toast({ title: 'Note deleted' });
  };

  const deletePhoto = (noteId: string, photoId: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, photos: n.photos.filter((p) => p.id !== photoId), saved: false }
          : n
      )
    );
    setHasUnsavedChanges(true);
    toast({ title: 'Photo removed' });
  };

  const clearAllNotes = () => {
    setNotes([]);
    setHasUnsavedChanges(false);
    toast({ title: 'All notes cleared' });
  };

  const handleViewPhoto = (noteId: string, photoIndex: number) => {
    setLightboxNoteId(noteId);
    setLightboxIndex(photoIndex);
    setLightboxOpen(true);
  };

  const getCurrentLightboxPhotos = () => {
    if (!lightboxNoteId) return [];
    const note = notes.find(n => n.id === lightboxNoteId);
    return note?.photos || [];
  };

  const handleLightboxNext = () => {
    const photos = getCurrentLightboxPhotos();
    if (lightboxIndex < photos.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const handleLightboxPrevious = () => {
    if (lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  if (!propertyId) {
    return (
      <Card>
        <CardContent>
          <p className="text-destructive">Property ID is missing.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}>
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="flex-1 bg-gradient-to-br from-white to-earth-light/40 border border-ocean-blue/20 shadow-medium rounded-2xl">
          <CardHeader>
            <CardTitle>How to Capture Your Property Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ol className="list-decimal ml-4 space-y-2 text-sm">
              <li>Scan the QR or tap Open on my phone to continue on mobile.</li>
              <li>For each room, record a voice note describing items and condition.</li>
              <li>Attach photos of items/defects to the voice note.</li>
              <li>Save and move to the next room; submit later for sign-off.</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Voice notes are stored locally for now; no server upload yet.
            </p>
          </CardContent>
        </Card>
        <Card className="w-full md:w-1/3 flex flex-col items-center justify-center bg-gradient-to-br from-white to-earth-light/40 border border-ocean-blue/20 shadow-medium rounded-2xl">
          <CardContent className="flex flex-col items-center gap-4 p-6">
            {!isMobile && <QRCode value={deepLink} size={160} />}
            {!isMobile ? (
              <Button
                onClick={() => {
                  track('inventory_qr_clicked');
                  window.open(deepLink, '_blank');
                }}
              >
                Open on my phone
              </Button>
            ) : (
              <Button
                onClick={() => {
                  track('inventory_quick_photo');
                  triggerQuickPhotoCapture();
                }}
              >
                Add quick photo note
              </Button>
            )}
            <p className="text-center text-sm text-muted-foreground">
              {isMobile ? 'Capture a photo note immediately.' : 'Scan with your camera or tap to continue on mobile.'}
            </p>
            {/* hidden input to trigger camera on mobile */}
            <input
              ref={quickPhotoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (!pendingQuickNoteId) return;
                handleAddPhotos(pendingQuickNoteId, e.target.files);
                setPendingQuickNoteId(null);
                if (e.target) (e.target as HTMLInputElement).value = '';
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Voice Notes</h3>
        <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={recording ? stopRecording : startRecording}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          {recording ? 'Stop Recording' : 'Start Recording'}
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={saving || !hasUnsavedChanges}
          className={hasUnsavedChanges ? 'bg-primary' : ''}
        >
          {saving ? 'Saving…' : hasUnsavedChanges ? `Save (${notes.filter(n => !n.saved).length})` : 'All Saved'}
        </Button>
        {notes.length > 0 && (
          <Button 
            variant="outline" 
            onClick={clearAllNotes}
            className="text-destructive hover:text-destructive"
          >
            Clear All
          </Button>
        )}
        </div>
        {error && <p className="text-destructive mt-2">{error}</p>}
        <div className="mt-4 space-y-4">
          {notes.map((note) => (
            <Card key={note.id} className={`p-4 space-y-3 ${
              note.saved ? 'bg-success-green/5 border-success-green/20' : 
              note.savingInProgress ? 'bg-primary/5 border-primary/20' : 
              'bg-background'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  {note.audioUrl && <audio controls src={note.audioUrl} className="flex-1" />}
                  {!note.audioUrl && <span className="text-muted-foreground italic">Photo-only note</span>}
                  {note.saved && <span className="text-xs text-success-green font-medium">✓ Saved</span>}
                  {note.savingInProgress && <span className="text-xs text-primary font-medium">💾 Saving...</span>}
                  {!note.saved && !note.savingInProgress && <span className="text-xs text-orange-500 font-medium">• Unsaved</span>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteNote(note.id)}
                  aria-label="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Multi-photo capture component */}
              <MultiPhotoCapture
                onPhotosSelected={(files) => {
                  const fileList = {
                    length: files.length,
                    item: (index: number) => files[index] || null,
                    [Symbol.iterator]: function* () {
                      for (let i = 0; i < files.length; i++) {
                        yield files[i];
                      }
                    }
                  } as FileList;
                  handleAddPhotos(note.id, fileList);
                }}
                maxPhotos={10}
              />

              {/* Photo gallery */}
              {note.photos.length > 0 && (
                <PhotoGallery
                  photos={note.photos}
                  onDelete={(photoId) => deletePhoto(note.id, photoId)}
                  onView={(index) => handleViewPhoto(note.id, index)}
                />
              )}

              <Textarea
                placeholder="Add a note or description about this room/item (optional)"
                value={note.text || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setNotes((prev) => prev.map((n) => 
                    n.id === note.id ? { ...n, text: value, saved: false } : n
                  ));
                  setHasUnsavedChanges(true);
                }}
              />
            </Card>
          ))}
        </div>
      </div>

      {/* Photo Lightbox */}
      <PhotoLightbox
        photos={getCurrentLightboxPhotos()}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNext={handleLightboxNext}
        onPrevious={handleLightboxPrevious}
      />
    </div>
  );
}

export default InventoryStartPanel;
