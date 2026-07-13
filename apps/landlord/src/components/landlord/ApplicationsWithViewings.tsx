import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { RecordCard } from '@mzanzihomes/ui/components/RecordCard';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mzanzihomes/ui/components/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@mzanzihomes/ui/components/dialog';
import { Mail, Building, FileText, Download, MessageCircle } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { downloadFileFromUrl } from '@mzanzihomes/common/lib/download';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { useViewings } from '@mzanzihomes/features/viewing';
import { useLandlordApplications, type ApplicationWithTenant } from '@mzanzihomes/features/application';
import { ViewingWorkflow } from '@mzanzihomes/features/viewing';
const shortDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

// A tenant who chatted about the property but hasn't submitted an application
// yet. Rendered in the same list as applications so each tenant has one card
// that walks the whole pipeline: Send Application → Awaiting submission →
// Accept/Decline → Generate Lease.
export interface ProspectLead {
  conversation_id: string;
  tenant_id: string;
  property_id: string;
  tenant_name: string;
  last_message_at?: string;
  invited: boolean;
}

interface ApplicationsWithViewingsProps {
  propertyId: string;
  propertyTitle: string;
  prospects?: ProspectLead[];
  onSendApplication?: (tenantId: string, propertyId: string, conversationId?: string) => void;
}

const ApplicationsWithViewings: React.FC<ApplicationsWithViewingsProps> = ({
  propertyId,
  propertyTitle,
  prospects,
  onSendApplication
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

  // One-word badge; the viewing requirement shows on its own status line
  const getApplicationStatus = (application: ApplicationWithTenant) => {
    switch (application.status) {
      case 'pending':
        return { status: 'pending', label: 'Pending', color: 'bg-blue-100 text-blue-800' };
      case 'accepted':
        return { status: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-800' };
      case 'declined':
        return { status: 'declined', label: 'Declined', color: 'bg-red-100 text-red-800' };
      default:
        return { status: 'unknown', label: application.status, color: 'bg-gray-100 text-gray-800' };
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

  // Once a tenant submits, their application card takes over from the
  // prospect card — never show both for the same tenant.
  const visibleProspects = (prospects || []).filter(
    (lead) => !applications.some((a) => a.tenant_id === lead.tenant_id)
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
        <h3 className="text-lg font-semibold">Property Applications & Viewings</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building className="h-4 w-4" />
          {propertyTitle}
        </div>
      </div>

      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="applications">
            Applications ({applications.length + visibleProspects.length})
          </TabsTrigger>
          <TabsTrigger value="viewings">
            Viewings ({viewings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          {applications.length === 0 && visibleProspects.length === 0 ? (
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
                <RecordCard
                  key={application.id}
                  title={[application.screening_profile?.first_name, application.screening_profile?.last_name]
                    .filter(Boolean)
                    .join(' ') || application.tenant_profile?.display_name || 'Applicant'}
                  dateLine={`Applied ${shortDate(application.created_at)}`}
                  badge={{ label: statusInfo.label, className: statusInfo.color }}
                  details={[{ label: 'Viewing', value: hasCompletedViewing ? 'Completed' : 'Required' }]}
                  actions={
                    <>
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
                          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Application Details</DialogTitle>
                            </DialogHeader>
                            {selectedApplication && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                      {selectedApplication.documents.map((doc) => {
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
                    </>
                  }
                />
              );
            })
          )}

          {/* Tenants still before the application stage: chat leads and sent invites */}
          {visibleProspects.map((lead) => {
            const hasCompletedViewing = canSendApplication(lead.tenant_id);
            return (
              <RecordCard
                key={`lead-${lead.conversation_id}`}
                title={lead.tenant_name}
                dateLine={lead.last_message_at ? `Last chat ${shortDate(lead.last_message_at)}` : 'No messages yet'}
                badge={
                  lead.invited
                    ? { label: 'Awaiting submission', className: 'bg-amber-100 text-amber-800' }
                    : { label: 'Lead', className: 'bg-gray-100 text-gray-800' }
                }
                details={[{ label: 'Viewing', value: hasCompletedViewing ? 'Completed' : 'Required' }]}
                actions={
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/messages?c=${lead.conversation_id}`)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      View Chat
                    </Button>
                    {!lead.invited && onSendApplication && (
                      <Button
                        size="sm"
                        onClick={() => onSendApplication(lead.tenant_id, propertyId, lead.conversation_id)}
                      >
                        Send Application
                      </Button>
                    )}
                  </>
                }
              />
            );
          })}
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