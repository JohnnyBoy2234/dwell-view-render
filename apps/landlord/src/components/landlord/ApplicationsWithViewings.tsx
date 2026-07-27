import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { RecordCard } from '@mzanzihomes/ui/components/RecordCard';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mzanzihomes/ui/components/tabs';
import { Mail, Building, MessageCircle } from 'lucide-react';
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
  const { applications, loading } = useLandlordApplications(propertyId);
  const { viewings } = useViewings(propertyId);

  // One-word badge; the viewing requirement shows on its own status line
  const getApplicationStatus = (application: ApplicationWithTenant) => {
    switch (application.status) {
      case 'pending':
        return { status: 'pending', label: 'Submitted', color: 'bg-blue-100 text-blue-800' };
      case 'more_info_requested':
        return { status: 'more_info_requested', label: 'Awaiting info', color: 'bg-amber-100 text-amber-800' };
      case 'accepted':
        return { status: 'accepted', label: 'Approved', color: 'bg-green-100 text-green-800' };
      case 'declined':
        return { status: 'declined', label: 'Declined', color: 'bg-red-100 text-red-800' };
      case 'withdrawn':
        return { status: 'withdrawn', label: 'Withdrawn', color: 'bg-gray-100 text-gray-800' };
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

  const applicantCount = applications.length + visibleProspects.length;

  return (
    <Card className="overflow-hidden rounded-2xl border border-black/[0.07] shadow-sm">
      {/* Property identity band — each property gets its own clearly bounded,
          colored section instead of headings floating in a shared column. */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-orange-500 to-orange-400 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2 min-w-0 text-white">
          <Building className="h-4 w-4 flex-shrink-0" />
          <h3 className="font-semibold truncate">{propertyTitle}</h3>
        </div>
        <Badge className="bg-white/20 text-white border-0 flex-shrink-0 hover:bg-white/20">
          {applicantCount} applicant{applicantCount === 1 ? '' : 's'}
        </Badge>
      </div>

      <CardContent className="p-4 sm:p-6">
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
                      {/* All review actions (documents, consent, request-info,
                          decision, notes, audit trail) live on the review page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/application/${application.id}`)}
                      >
                        Review Application
                      </Button>

                      {/* After acceptance: allow generating lease (a separate
                          workflow the landlord starts deliberately) */}
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
      </CardContent>
    </Card>
  );
};

export default ApplicationsWithViewings;