import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Calendar, 
  User, 
  Home, 
  Camera, 
  Mic, 
  FileText, 
  Download,
  X,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { InventoryRecordWithDetails } from '@/types/inventory';

interface InventoryDetailModalProps {
  record: InventoryRecordWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadReport: (recordId: string) => void;
}

export function InventoryDetailModal({ 
  record, 
  isOpen, 
  onClose, 
  onDownloadReport 
}: InventoryDetailModalProps) {
  if (!record) return null;

  const getStatusIcon = (status: string, approved: boolean) => {
    if (status === 'completed' && approved) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (status === 'completed') {
      return <Clock className="h-4 w-4 text-yellow-600" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: string, approved: boolean) => {
    if (status === 'completed' && approved) {
      return <Badge className="bg-green-600 text-white">Approved</Badge>;
    } else if (status === 'completed') {
      return <Badge variant="secondary">Awaiting Approval</Badge>;
    } else {
      return <Badge variant="outline">In Progress</Badge>;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-orange-600';
      case 'damaged': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(record.status, record.landlord_approved)}
            Inventory Record Details
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
                    <div className="text-2xl font-bold text-blue-600">{record.rooms_recorded}</div>
                    <div className="text-sm text-muted-foreground">Rooms</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{record.photos_count}</div>
                    <div className="text-sm text-muted-foreground">Photos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{record.voice_notes_count}</div>
                    <div className="text-sm text-muted-foreground">Voice Notes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{record.country}</div>
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
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        <strong>Completed:</strong> {new Date(record.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {record.approved_at && (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        <strong>Approved:</strong> {new Date(record.approved_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Inventory Items */}
            {record.items && record.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Inventory Items</CardTitle>
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
                          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm">
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
              className="bg-blue-600 hover:bg-blue-700"
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
