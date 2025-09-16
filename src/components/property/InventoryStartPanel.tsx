import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { X, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
        };
        setNotes((prev) => [...prev, newNote]);
        track('inventory_voice_note_saved');
        toast({ title: 'Voice note saved' });
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
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(finalPath, file as any, {
        cacheControl: '3600',
        upsert: false,
        contentType,
      });
    if (error) throw error;
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
    if (notes.length === 0) {
      toast({ title: 'Nothing to save', description: 'Add a voice note or photos first.' });
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
        .from('inventory_records')
        .select('id, photos_count, voice_notes_count, rooms_recorded')
        .eq('property_id', propertyId)
        .eq('tenant_id', user.id)
        .limit(1);
      if (findErr) throw findErr;

      let recordId: string;
      if (!existingRecords || existingRecords.length === 0) {
        const { data: created, error: insertErr } = await supabase
          .from('inventory_records')
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
        recordId = created.id;
      } else {
        recordId = existingRecords[0].id as string;
      }

      // Upload all media and build items
      const itemsPayload: Array<{
        inventory_record_id: string;
        room_name: string;
        item_name: string;
        condition: string;
        description?: string;
        photos: string[];
        voice_note_url?: string;
      }> = [];

      for (const [index, note] of notes.entries()) {
        const noteId = note.id;
        const uploadedPhotoPaths: string[] = [];
        for (const photo of note.photos) {
          const file = photo.file;
          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
          const filename = `${crypto.randomUUID()}.${ext}`;
          const path = `${propertyId}/${recordId}/${noteId}/${filename}`;
          const storagePath = await uploadToInventoryBucket(path, file, file.type);
          uploadedPhotoPaths.push(storagePath);
        }

        let audioPath: string | undefined;
        if (note.audioBlob && note.audioBlob.size > 0) {
          const filename = `${crypto.randomUUID()}.webm`;
          const path = `${propertyId}/${recordId}/${noteId}/${filename}`;
          audioPath = await uploadToInventoryBucket(path, note.audioBlob, 'audio/webm');
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
        const { error: itemsErr } = await supabase.from('inventory_items').insert(itemsPayload);
        if (itemsErr) throw itemsErr;
      }

      // Update counts on the record
      const photosCount = notes.reduce((acc, n) => acc + n.photos.length, 0);
      const voiceCount = notes.reduce((acc, n) => acc + (n.audioBlob && n.audioBlob.size > 0 ? 1 : 0), 0);
      const { error: updErr } = await supabase
        .from('inventory_records')
        .update({
          rooms_recorded: notes.length,
          photos_count: photosCount,
          voice_notes_count: voiceCount,
          status: 'in_progress',
        })
        .eq('id', recordId);
      if (updErr) throw updErr;

      toast({ title: 'Inventory saved', description: new Date().toLocaleString() });
      setNotes([]);
    } catch (e: any) {
      console.error('Save inventory failed:', e);
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
          n.id === noteId ? { ...n, photos: [...n.photos, ...newPhotos] } : n
        )
      );
      toast({ title: 'Photo attached' });
    }
  };

  const createEmptyNote = (): string => {
    const id = crypto.randomUUID();
    const newNote: Note = { id, audioUrl: '', createdAt: Date.now(), photos: [] };
    setNotes((prev) => [newNote, ...prev]);
    return id;
  };

  const triggerQuickPhotoCapture = () => {
    const id = createEmptyNote();
    setPendingQuickNoteId(id);
    quickPhotoInputRef.current?.click();
  };

  const deleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    toast({ title: 'Note deleted' });
  };

  const deletePhoto = (noteId: string, photoId: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, photos: n.photos.filter((p) => p.id !== photoId) }
          : n
      )
    );
    toast({ title: 'Photo removed' });
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
        <div className="flex items-center gap-2">
        <Button
          onClick={recording ? stopRecording : startRecording}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          {recording ? 'Stop Recording' : 'Start Recording'}
        </Button>
        <Button onClick={handleSave} disabled={saving || notes.length === 0}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        </div>
        {error && <p className="text-destructive mt-2">{error}</p>}
        <div className="mt-4 space-y-4">
          {notes.map((note) => (
            <Card key={note.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <audio controls src={note.audioUrl} className="flex-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteNote(note.id)}
                  aria-label="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {note.photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {note.photos.map((photo) => (
                    <div key={photo.id} className="relative">
                      <img
                        src={photo.previewUrl}
                        alt="Note attachment"
                        className="h-20 w-20 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => deletePhoto(note.id, photo.id)}
                        aria-label="Delete photo"
                        className="absolute -top-2 -right-2 bg-background rounded-full p-1 shadow-md"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Textarea
                placeholder="Add a note or description about this room/item (optional)"
                value={note.text || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, text: value } : n));
                }}
              />
              <Input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                aria-label="Attach photos"
                onChange={(e) => {
                  handleAddPhotos(note.id, e.target.files);
                  e.target.value = '';
                }}
              />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default InventoryStartPanel;
