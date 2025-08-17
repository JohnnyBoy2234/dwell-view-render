import React, { useState } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, User, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useViewings, type ViewingWithDetails } from '@/hooks/useViewings';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface ViewingWorkflowProps {
  propertyId: string;
  propertyTitle: string;
  conversationId?: string;
  tenantId?: string;
  onViewingCompleted?: () => void;
}

const ViewingWorkflow: React.FC<ViewingWorkflowProps> = ({
  propertyId,
  propertyTitle,
  conversationId,
  tenantId,
  onViewingCompleted
}) => {
  const { user } = useAuth();
  const { viewings, createViewing, updateViewingStatus, scheduleViewing } = useViewings(propertyId, conversationId);
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedViewingId, setSelectedViewingId] = useState<string>('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested': return <Clock className="h-4 w-4" />;
      case 'scheduled': return <Calendar className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const handleCreateViewing = async () => {
    if (!tenantId) return;

    await createViewing({
      property_id: propertyId,
      tenant_id: tenantId,
      conversation_id: conversationId,
      notes: 'Viewing requested via message'
    });
  };

  const handleScheduleViewing = async () => {
    if (!selectedViewingId || !scheduledDate) return;

    const success = await scheduleViewing(selectedViewingId, scheduledDate);
    if (success) {
      setShowScheduleDialog(false);
      setScheduledDate('');
      setSelectedViewingId('');
    }
  };

  const handleCompleteViewing = async () => {
    if (!selectedViewingId) return;

    const success = await updateViewingStatus(selectedViewingId, 'completed', notes);
    if (success) {
      setShowCompleteDialog(false);
      setNotes('');
      setSelectedViewingId('');
      onViewingCompleted?.();
    }
  };

  const relevantViewings = viewings.filter(v => 
    (!tenantId || v.tenant_id === tenantId) && v.property_id === propertyId
  );

  const hasCompletedViewing = relevantViewings.some(v => v.status === 'completed');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Property Viewings</h3>
        {user?.id && tenantId && user.id !== tenantId && relevantViewings.length === 0 && (
          <Button onClick={handleCreateViewing} size="sm">
            Schedule Viewing
          </Button>
        )}
      </div>

      {relevantViewings.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No viewings scheduled for this property</p>
              {tenantId && user?.id !== tenantId && (
                <p className="text-sm mt-2">Create a viewing request to get started</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {relevantViewings.map((viewing) => (
            <Card key={viewing.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(viewing.status)}
                    <CardTitle className="text-base">{propertyTitle}</CardTitle>
                  </div>
                  <Badge className={getStatusColor(viewing.status)}>
                    {viewing.status.charAt(0).toUpperCase() + viewing.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {viewing.scheduled_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Scheduled: {format(new Date(viewing.scheduled_date), 'PPP p')}
                      </span>
                    </div>
                  )}
                  
                  {viewing.notes && (
                    <p className="text-sm bg-muted p-3 rounded">{viewing.notes}</p>
                  )}

                  {viewing.completed_at && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>
                        Completed: {format(new Date(viewing.completed_at), 'PPP p')}
                      </span>
                    </div>
                  )}

                  {/* Landlord actions */}
                  {user?.id === viewing.landlord_id && viewing.status !== 'cancelled' && viewing.status !== 'completed' && (
                    <div className="flex gap-2 pt-2">
                      {viewing.status === 'requested' && (
                        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedViewingId(viewing.id)}
                            >
                              Schedule
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Schedule Viewing</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="scheduled-date">Date & Time</Label>
                                <Input
                                  id="scheduled-date"
                                  type="datetime-local"
                                  value={scheduledDate}
                                  onChange={(e) => setScheduledDate(e.target.value)}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={handleScheduleViewing}>
                                  Schedule Viewing
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => setShowScheduleDialog(false)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      {viewing.status === 'scheduled' && (
                        <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm"
                              onClick={() => setSelectedViewingId(viewing.id)}
                            >
                              Mark as Completed
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Complete Viewing</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="completion-notes">Notes (optional)</Label>
                                <Textarea
                                  id="completion-notes"
                                  placeholder="Add any notes about the viewing..."
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={handleCompleteViewing}>
                                  Complete Viewing
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => setShowCompleteDialog(false)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => updateViewingStatus(viewing.id, 'cancelled')}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Application status indicator */}
      {tenantId && user?.id === tenantId && (
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${hasCompletedViewing ? 'bg-green-100' : 'bg-yellow-100'}`}>
                {hasCompletedViewing ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-600" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {hasCompletedViewing 
                    ? 'Viewing Completed - Application Available' 
                    : 'Application Pending Viewing Completion'
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {hasCompletedViewing 
                    ? 'You can now access and submit the rental application for this property.'
                    : 'The rental application will become available after the landlord confirms your viewing is completed.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ViewingWorkflow;