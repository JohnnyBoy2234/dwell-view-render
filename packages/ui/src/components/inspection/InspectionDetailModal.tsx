import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@mzanzihomes/ui/components/dialog';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { ScrollArea } from '@mzanzihomes/ui/components/scroll-area';
import { supabase } from '@mzanzihomes/supabase/client';
import { 
  MapPin, 
  Calendar, 
  Camera, 
  Mic, 
  FileText, 
  Download,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Play,
  Pause
} from 'lucide-react';
import { InventoryRecordWithDetails } from '@mzanzihomes/common/types/inventory';

interface PhotoViewerProps {
  photoPath: string;
}

function PhotoViewer({ photoPath }: PhotoViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleViewPhoto = async () => {
    if (imageUrl) return;
    
    setLoading(true);
    try {
      const { data } = await supabase.storage
        .from('kyc-uploads')
        .createSignedUrl(photoPath, 60);
      
      if (data?.signedUrl) {
        setImageUrl(data.signedUrl);
      }
    } catch (error) {
      console.error('Error loading photo:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer border hover:border-primary transition-colors"
      onClick={handleViewPhoto}
    >
      {loading ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : imageUrl ? (
        <img 
          src={imageUrl} 
          alt="Inspection item" 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <Camera className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}

interface VoiceNotePlayerProps {
  voiceNoteUrl: string;
}

function VoiceNotePlayer({ voiceNoteUrl }: VoiceNotePlayerProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handleLoadAudio = async () => {
    if (audioUrl) {
      if (audio) {
        if (playing) {
          audio.pause();
          setPlaying(false);
        } else {
          audio.play();
          setPlaying(true);
        }
      }
      return;
    }
    
    setLoading(true);
    try {
      const { data } = await supabase.storage
        .from('kyc-uploads')
        .createSignedUrl(voiceNoteUrl, 60);
      
      if (data?.signedUrl) {
        setAudioUrl(data.signedUrl);
        const newAudio = new Audio(data.signedUrl);
        newAudio.onended = () => setPlaying(false);
        setAudio(newAudio);
        newAudio.play();
        setPlaying(true);
      }
    } catch (error) {
      console.error('Error loading voice note:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLoadAudio}
      disabled={loading}
      className="flex items-center gap-2"
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      ) : playing ? (
        <Pause className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      {loading ? 'Loading...' : playing ? 'Pause' : 'Play Voice Note'}
    </Button>
  );
}

interface InspectionDetailModalProps {
  record: InventoryRecordWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadReport: (recordId: string) => void;
}

export function InspectionDetailModal({ 
  record, 
  isOpen, 
  onClose, 
  onDownloadReport 
}: InspectionDetailModalProps) {
  if (!record) return null;

  const getStatusIcon = (status: string, approved: boolean) => {
    if (status === 'completed' && approved) {
      return <CheckCircle className="h-4 w-4 text-success-green" />;
    } else if (status === 'completed') {
      return <Clock className="h-4 w-4 text-earth-warm" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-ocean-blue" />;
    }
  };

  const getStatusBadge = (status: string, approved: boolean) => {
    if (status === 'completed' && approved) {
      return <Badge className="bg-success-green text-white">Approved</Badge>;
    } else if (status === 'completed') {
      return <Badge variant="secondary">Awaiting Approval</Badge>;
    } else {
      return <Badge variant="outline">In Progress</Badge>;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-success-green';
      case 'good': return 'text-ocean-blue';
      case 'fair': return 'text-earth-warm';
      case 'poor': return 'text-orange-600';
      case 'damaged': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(record.status, record.landlord_approved)}
            Inspection Record Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Header Information */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{record.property?.title || 'Property'}</CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{record.property?.location || 'Location not available'}</span>
                    </div>
                  </div>
                  {getStatusBadge(record.status, record.landlord_approved)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-ocean-blue">{record.rooms_recorded}</div>
                    <div className="text-sm text-muted-foreground">Rooms</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success-green">{record.photos_count}</div>
                    <div className="text-sm text-muted-foreground">Photos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-earth-warm">{record.voice_notes_count}</div>
                    <div className="text-sm text-muted-foreground">Voice Notes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-muted-foreground">{record.country}</div>
                    <div className="text-sm text-muted-foreground">Country</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Created:</strong> {new Date(record.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {record.completed_at && (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-success-green" />
                      <span className="text-sm">
                        <strong>Completed:</strong> {new Date(record.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {record.approved_at && (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-success-green" />
                      <span className="text-sm">
                        <strong>Approved:</strong> {new Date(record.approved_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Inspection Items */}
            {record.items && record.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Inspection Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {record.items.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{item.room_name} - {item.item_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={getConditionColor(item.condition)}
                          >
                            {item.condition}
                          </Badge>
                        </div>
                        
                        {item.description && (
                          <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                        )}
                        
                        {/* Photos Section */}
                        {item.photos && item.photos.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Camera className="h-4 w-4" />
                              Photos ({item.photos.length})
                            </h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {item.photos.map((photoPath, idx) => (
                                <PhotoViewer key={idx} photoPath={photoPath} />
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Voice Note Section */}
                        {item.voice_note_url && (
                          <div className="mb-3">
                            <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Mic className="h-4 w-4" />
                              Voice Note
                            </h5>
                            <VoiceNotePlayer voiceNoteUrl={item.voice_note_url} />
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                          {item.photos.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Camera className="h-4 w-4" />
                              <span>{item.photos.length} photos</span>
                            </div>
                          )}
                          {item.voice_note_url && (
                            <div className="flex items-center gap-1">
                              <Mic className="h-4 w-4" />
                              <span>Voice note</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reports */}
            {record.reports && record.reports.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Generated Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {record.reports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium capitalize">{report.report_type.replace('_', ' ')} Report</span>
                          <span className="text-sm text-muted-foreground">
                            - {new Date(report.generated_at).toLocaleDateString()}
                          </span>
                        </div>
                        {report.pdf_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(report.pdf_url, '_blank')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Record ID: {record.id}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            <Button 
              onClick={() => onDownloadReport(record.id)}
              className="bg-ocean-blue hover:bg-ocean-blue-dark"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
