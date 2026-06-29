import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mzanzihomes/ui/components/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@mzanzihomes/ui/components/dialog';
import { Calendar, CheckCircle, Clock, User, Mail, Phone, Building, MapPin, FileText, Download } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { downloadFileFromUrl } from '@mzanzihomes/common/lib/download';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { useViewings } from '@mzanzihomes/features/viewing'; // ponytail: landlord component pulls viewing data; retire when it moves to a slice
import { useLandlordApplications, type ApplicationWithTenant } from '@/hooks/useLandlordApplications';
import { ViewingWorkflow } from '@mzanzihomes/features/viewing';
import { format } from 'date-fns';

interface ApplicationsWithViewingsProps {
  propertyId: string;
  propertyTitle: string;
}

const ApplicationsWithViewings: React.FC<ApplicationsWithViewingsProps> = ({
  propertyId,
  propertyTitle
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { applications, updateApplicationStatus, loading } = useLandlordApplications(propertyId);
  const { viewings } = useViewings(propertyId);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithTenant | null>(null);

  const handleDownloadDocument = async (documentId: string, fileName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-document-download-url', {
        body: { documentId }
      });
      
      if (error) throw error;
      if (data?.signedUrl) {
        await downloadFileFromUrl(data.signedUrl, fileName);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Download failed',
        description: 'Could not download the document. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getApplicationStatus = (application: ApplicationWithTenant) => {
    const hasCompletedViewing = viewings.some(v => 
      v.tenant_id === application.tenant_id && 
      v.status === 'completed' && 
      v.completed_at
    );

    if (!hasCompletedViewing && application.status === 'pending') {
      return { status: 'viewing_required', label: 'Viewing Required', color: 'bg-yellow-100 text-yellow-800' };
    }

    switch (application.status) {
      case 'pending':
        return { status: 'pending', label: 'Pending Review', color: 'bg-blue-100 text-blue-800' };
      case 'accepted':
        return { status: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-800' };
      case 'declined':
        return { status: 'declined', label: 'Declined', color: 'bg-red-100 text-red-800' };
      default:
        return { status: 'unknown', label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const canSendApplication = (tenantId: string) => {
    return viewings.some(v => 
      v.tenant_id === tenantId && 
      v.status === 'completed' && 
      v.completed_at
    );
  };

  const handleAcceptApplication = async (applicationId: string) => {
    const ok = await updateApplicationStatus(applicationId, 'accepted');
    if (ok) {
      // Optimistically update local state to show Generate Lease button
      // (Final state will be synced by the hook's refetch.)
      // No setState here since applications come from the hook; rely on refetch.
    }
  };

  const handleDeclineApplication = async (applicationId: string) => {
    await updateApplicationStatus(applicationId, 'declined');
  };

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
        <h3 className="text-lg font-semibold">Property Applications & Viewings</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building className="h-4 w-4" />
          {propertyTitle}
        </div>
      </div>

      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="applications">
            Applications ({applications.length})
          </TabsTrigger>
          <TabsTrigger value="viewings">
            Viewings ({viewings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          {applications.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Mail className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No applications received yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            applications.map((application) => {
              const statusInfo = getApplicationStatus(application);
              const hasCompletedViewing = canSendApplication(application.tenant_id);

              return (
                <Card key={application.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {application.screening_profile?.first_name} {application.screening_profile?.last_name} 
                            {application.tenant_profile?.display_name && 
                              ` (${application.tenant_profile.display_name})`
                            }
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Applied {format(new Date(application.created_at), 'PPP')}
                          </p>
                        </div>
                      </div>
                      <Badge className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      {/* Viewing Status */}
                      <div className="flex items-center gap-2 text-sm">
                        {hasCompletedViewing ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">Viewing completed</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span className="text-yellow-600">Viewing required before application review</span>
                          </>
                        )}
                      </div>

                      {/* Application Details */}
                      {application.screening_details && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Employment:</span>
                            <div className="font-medium">{application.screening_details.employment_status}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Monthly Income:</span>
                            <div className="font-medium">
                              R{application.screening_details.net_monthly_income?.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedApplication(application)}
                            >
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Application Details</DialogTitle>
                            </DialogHeader>
                            {selectedApplication && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold mb-2">Personal Information</h4>
                                    <div className="space-y-1 text-sm">
                                      <p><span className="text-muted-foreground">Name:</span> {selectedApplication.screening_details?.full_name}</p>
                                      <p><span className="text-muted-foreground">ID Number:</span> {selectedApplication.screening_details?.id_number}</p>
                                      <p><span className="text-muted-foreground">Phone:</span> {selectedApplication.screening_details?.phone}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold mb-2">Employment</h4>
                                    <div className="space-y-1 text-sm">
                                      <p><span className="text-muted-foreground">Status:</span> {selectedApplication.screening_details?.employment_status}</p>
                                      <p><span className="text-muted-foreground">Job Title:</span> {selectedApplication.screening_details?.job_title}</p>
                                      <p><span className="text-muted-foreground">Company:</span> {selectedApplication.screening_details?.company_name}</p>
                                      <p><span className="text-muted-foreground">Income:</span> R{selectedApplication.screening_details?.net_monthly_income?.toLocaleString()}</p>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Current Address</h4>
                                  <p className="text-sm">{selectedApplication.screening_details?.current_address}</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Reason for Moving</h4>
                                  <p className="text-sm">{selectedApplication.screening_details?.reason_for_moving}</p>
                                </div>

                                {/* Documents Section */}
                                {selectedApplication?.documents && selectedApplication.documents.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Submitted Documents</h4>
                                    <div className="space-y-2">
                                      {selectedApplication.documents.map((doc: any) => {
                                        const fileName = doc.file_path?.split('/').pop() || 'Document';
                                        const docTypeLabel = doc.document_type === 'EXPERIAN_CREDIT_REPORT' 
                                          ? 'Credit Report' 
                                          : doc.document_type === 'id' 
                                            ? 'ID Document' 
                                            : 'Income Document';
                                        
                                        return (
                                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-2">
                                              <FileText className="h-4 w-4 text-muted-foreground" />
                                              <span className="text-sm truncate max-w-[200px]">{fileName}</span>
                                              <Badge variant="outline" className="text-xs">
                                                {docTypeLabel}
                                              </Badge>
                                            </div>
                                            <Button 
                                              variant="outline" 
                                              size="sm"
                                              onClick={() => handleDownloadDocument(doc.id, fileName)}
                                            >
                                              <Download className="h-4 w-4 mr-1" />
                                              Download
                                            </Button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {/* Accept/Decline buttons for pending applications */}
                        {application.status === 'pending' && (
                          <>
                            {!hasCompletedViewing && (
                              <span className="text-xs text-yellow-600">Note: Viewing not completed</span>
                            )}
                            <Button 
                              size="sm"
                              onClick={() => handleAcceptApplication(application.id)}
                            >
                              Accept
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeclineApplication(application.id)}
                            >
                              Decline
                            </Button>
                          </>
                        )}

                        {/* After acceptance: allow generating lease */}
                        {application.status === 'accepted' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const url = `/lease/builder?tenantId=${encodeURIComponent(application.tenant_id)}&propertyId=${encodeURIComponent(application.property_id)}`;
                              navigate(url);
                            }}
                          >
                            Generate Lease
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

        <TabsContent value="viewings">
          <ViewingWorkflow
            propertyId={propertyId}
            propertyTitle={propertyTitle}
            onViewingCompleted={() => {
              // This will refresh the applications list when viewing is completed
              window.location.reload();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApplicationsWithViewings;