import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { X, Trash2 } from 'lucide-react';

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

  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);

  const deepLink = propertyId
    ? `https://app.swiftrent.co.za/inventory/start?propertyId=${propertyId}`
    : '';

  useEffect(() => {
    track('inventory_instructions_viewed');
    track('inventory_qr_rendered');
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

  const stopRecording = () => {
    mediaRecorder?.stop();
    mediaRecorder?.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  const handleAddPhotos = (noteId: string, files: FileList | null) => {
    if (!files) return;
    const newPhotos: Photo[] = [];
    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File too large', variant: 'destructive' });
        return;
      }
      newPhotos.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
      track('inventory_photo_attached');
    });
    if (newPhotos.length) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, photos: [...n.photos, ...newPhotos] } : n
        )
      );
      toast({ title: 'Photo attached' });
    }
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
    <div className="space-y-6">
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
            <QRCode value={deepLink} size={160} />
            <Button
              onClick={() => {
                track('inventory_qr_clicked');
                window.open(deepLink, '_blank');
              }}
            >
              Open on my phone
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Scan with your camera or tap to continue on mobile.
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Voice Notes</h3>
        <Button
          onClick={recording ? stopRecording : startRecording}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          {recording ? 'Stop Recording' : 'Start Recording'}
        </Button>
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
              <Input
                type="file"
                multiple
                accept="image/*"
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
