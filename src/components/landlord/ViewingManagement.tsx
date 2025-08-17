import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  User, 
  Send, 
  Eye, 
  MapPin,
  Phone,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useViewings } from '@/hooks/useViewings';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ViewingManagementProps {
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
}

const ViewingManagement: React.FC<ViewingManagementProps> = ({
  propertyId,
  propertyTitle,
  propertyLocation
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    viewings, 
    loading, 
    confirmViewing, 
    sendApplication, 
    fetchViewings 
  } = useViewings(propertyId);

  const [selectedViewing, setSelectedViewing] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchViewings();
    }
  }, [user]);

  const getViewingStatusInfo = (viewing: any) => {
    if (viewing.status === 'requested') {
      return {
        status: 'requested',
        label: 'Requested',
        color: 'bg-blue-100 text-blue-800',
        icon: Clock,
        actions: ['schedule']
      };
    }

    if (viewing.status === 'scheduled') {
      return {
        status: 'scheduled',
        label: 'Scheduled',
        color: 'bg-purple-100 text-purple-800',
        icon: Calendar,
        actions: ['complete']
      };
    }

    if (viewing.status === 'completed' && !viewing.viewing_confirmed) {
      return {
        status: 'completed',
        label: 'Awaiting Confirmation',
        color: 'bg-orange-100 text-orange-800',
        icon: AlertCircle,
        actions: ['confirm']
      };
    }

    if (viewing.viewing_confirmed && !viewing.application_sent) {
      return {
        status: 'confirmed',
        label: 'Confirmed - Ready to Send App',
        color: 'bg-yellow-100 text-yellow-800',
        icon: FileText,
        actions: ['send-application']
      };
    }

    if (viewing.application_sent) {
      return {
        status: 'application-sent',
        label: 'Application Sent',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
        actions: []
      };
    }

    return {
      status: 'unknown',
      label: 'Unknown Status',
      color: 'bg-gray-100 text-gray-800',
      icon: AlertCircle,
      actions: []
    };
  };

  const handleConfirmViewing = async (viewingId: string) => {
    const success = await confirmViewing(viewingId);
    if (success) {
      toast({
        title: "Viewing Confirmed",
        description: "The viewing has been confirmed. You can now send the application to the tenant."
      });
    }
  };

  const handleSendApplication = async (viewingId: string) => {
    const success = await sendApplication(viewingId);
    if (success) {
      toast({
        title: "Application Sent",
        description: "The rental application has been sent to the tenant. They can now submit their application."
      });
    }
  };

  const pendingConfirmations = viewings.filter(v => 
    v.status === 'completed' && !v.viewing_confirmed
  );

  const readyToSend = viewings.filter(v => 
    v.viewing_confirmed && !v.application_sent
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Viewing Management</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {propertyLocation}
          </div>
        </div>
        <div className="flex gap-2">
          {pendingConfirmations.length > 0 && (
            <Badge variant="outline" className="bg-orange-100 text-orange-800">
              {pendingConfirmations.length} pending confirmation
            </Badge>
          )}
          {readyToSend.length > 0 && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
              {readyToSend.length} ready to send
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All Viewings ({viewings.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingConfirmations.length})
          </TabsTrigger>
          <TabsTrigger value="ready">
            Ready ({readyToSend.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({viewings.filter(v => v.application_sent).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {viewings.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No viewings scheduled yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            viewings.map((viewing) => {
              const statusInfo = getViewingStatusInfo(viewing);
              
              return (
                <Card key={viewing.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            Viewing Request
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {viewing.scheduled_date ? 
                              `Scheduled: ${format(new Date(viewing.scheduled_date), 'PPP p')}` :
                              `Requested: ${format(new Date(viewing.created_at), 'PPP')}`
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <statusInfo.icon className="h-4 w-4" />
                        <Badge className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      {viewing.notes && (
                        <div>
                          <span className="text-sm text-muted-foreground">Notes:</span>
                          <p className="text-sm mt-1">{viewing.notes}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedViewing(viewing)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Viewing Details</DialogTitle>
                            </DialogHeader>
                            {selectedViewing && (
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Viewing Information</h4>
                                  <div className="space-y-2 text-sm">
                                    <p><span className="text-muted-foreground">Status:</span> {statusInfo.label}</p>
                                    <p><span className="text-muted-foreground">Requested:</span> {format(new Date(selectedViewing.created_at), 'PPP p')}</p>
                                    {selectedViewing.scheduled_date && (
                                      <p><span className="text-muted-foreground">Scheduled:</span> {format(new Date(selectedViewing.scheduled_date), 'PPP p')}</p>
                                    )}
                                    {selectedViewing.completed_at && (
                                      <p><span className="text-muted-foreground">Completed:</span> {format(new Date(selectedViewing.completed_at), 'PPP p')}</p>
                                    )}
                                  </div>
                                </div>
                                {selectedViewing.notes && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Notes</h4>
                                    <p className="text-sm">{selectedViewing.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {statusInfo.actions.includes('confirm') && (
                          <Button 
                            size="sm"
                            onClick={() => handleConfirmViewing(viewing.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirm Viewing
                          </Button>
                        )}

                        {statusInfo.actions.includes('send-application') && (
                          <Button 
                            size="sm"
                            onClick={() => handleSendApplication(viewing.id)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Application
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingConfirmations.map((viewing) => {
            const statusInfo = getViewingStatusInfo(viewing);
            
            return (
              <Card key={viewing.id} className="border-orange-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <div>
                        <CardTitle className="text-base">Viewing Needs Confirmation</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Completed: {format(new Date(viewing.completed_at!), 'PPP p')}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleConfirmViewing(viewing.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Viewing
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
          {pendingConfirmations.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No viewings pending confirmation</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ready" className="space-y-4">
          {readyToSend.map((viewing) => (
            <Card key={viewing.id} className="border-yellow-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-yellow-600" />
                    <div>
                      <CardTitle className="text-base">Ready to Send Application</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Viewing confirmed - can now send application
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => handleSendApplication(viewing.id)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Application
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
          {readyToSend.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Send className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No applications ready to send</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {viewings.filter(v => v.application_sent).map((viewing) => (
            <Card key={viewing.id} className="border-green-200">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <CardTitle className="text-base">Application Sent</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Tenant can now submit their application
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ViewingManagement;