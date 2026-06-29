// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { 
  Users, 
  Mail, 
  Link, 
  Eye, 
  Check, 
  X, 
  Calendar,
  User,
  FileText,
  Building
} from 'lucide-react';
import { useLandlordApplications, ApplicationWithTenant } from '@/hooks/useLandlordApplications';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { downloadFileFromUrl } from '@mzanzihomes/common/lib/download';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import TenantBadgeInline from './TenantBadgeInline';
import { SuccessDialog } from '@/components/ui/SuccessDialog';

interface ApplicationsTabProps {
  propertyId: string;
  propertyTitle?: string;
  propertyLocation?: string;
  onStartLease?: (tenantId: string, tenantName: string) => void;
}

export function ApplicationsTab({ propertyId, propertyTitle, propertyLocation, onStartLease }: ApplicationsTabProps) {
  const { applications, loading, updateApplicationStatus } = useLandlordApplications(propertyId);
  const { toast } = useToast();
  const { user } = useAuth();
  const [emailForInvite, setEmailForInvite] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithTenant | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [invitesByTenant, setInvitesByTenant] = useState<Record<string, any>>({});
  const [requests, setRequests] = useState<ApplicationWithTenant[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [approvedTenantName, setApprovedTenantName] = useState('');

  const fetchLeads = async () => {
    if (!user || !propertyId) return;
    // Fetch conversations for this property where current user is landlord
    const { data: convs, error } = await supabase
      .from('conversations')
      .select('id, tenant_id, last_message_at, property_id, landlord_id')
      .filter('property_id', 'eq', propertyId)
      .filter('landlord_id', 'eq', user.id)
      .order('last_message_at', { ascending: false });
    if (error) {
      console.warn('Failed to fetch leads', error);
      return;
    }
    const tenantIds = Array.from(new Set(((convs as any) || []).map((c: any) => c.tenant_id)));
    const { data: profiles } = await (supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', tenantIds as any) as any);
    const profileMap = new Map<string, any>();
    ((profiles as any) || []).forEach((p: any) => profileMap.set(p.user_id, p));
    setLeads(((convs as any) || []).map((c: any) => ({ ...c, tenant_profile: profileMap.get(c.tenant_id) })));

    const { data: invites } = await supabase
      .from('application_invites')
      .select('*')
      .filter('property_id', 'eq', propertyId)
      .filter('landlord_id', 'eq', user.id);
    const map: Record<string, any> = {};
    ((invites as any) || []).forEach((i: any) => { map[i.tenant_id] = i; });
    setInvitesByTenant(map);
    // Fetch application requests for this property
    const { data: reqs } = await supabase
      .from('applications')
      .select('*')
      .filter('property_id', 'eq', propertyId)
      .filter('landlord_id', 'eq', user.id)
      .filter('status', 'eq', 'requested')
      .order('created_at', { ascending: false });
    const withProfiles = await Promise.all(
      ((reqs as any) || []).map(async (app: any) => {
        const { data: tenantProfile } = await supabase
          .from('profiles')
          .select('display_name, user_id')
          .filter('user_id', 'eq', app.tenant_id)
          .maybeSingle();
        const { data: property } = await supabase
          .from('properties')
          .select('id, title, location, images')
          .filter('id', 'eq', app.property_id)
          .maybeSingle();
        return { ...app, tenant_profile: tenantProfile || undefined, properties: property || undefined } as ApplicationWithTenant;
      })
    );
    setRequests(withProfiles);
  };

  const handleInvite = async (tenantId: string, conversationId?: string) => {
    if (!user) return;
    try {
      const token = crypto.randomUUID();
      const { data, error } = await (supabase
        .from('application_invites')
        .insert({
          token,
          property_id: propertyId,
          landlord_id: user.id,
          tenant_id: tenantId,
          conversation_id: conversationId,
          status: 'invited'
        } as any)
        .select('*')
        .single() as any);
      if (error) throw error;

      const link = `${window.location.origin}/apply/invite/${token}`;
      if (conversationId) {
        await (supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: `You've been invited to apply for this property. Click here to start: ${link}`,
          message_type: 'text'
        } as any) as any);
      }

      toast({ title: 'Invite sent', description: 'We notified the tenant with an application link.' });
      await fetchLeads();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to send invite', description: e.message });
    }
  };

  const approveRequest = async (application: ApplicationWithTenant) => {
    if (!user) return;
    try {
      // Create invite token and message
      const token = crypto.randomUUID();
      await (supabase.from('application_invites').insert({
        token,
        property_id: application.property_id,
        landlord_id: user.id,
        tenant_id: application.tenant_id,
        status: 'invited'
      } as any) as any);
      const link = `${window.location.origin}/apply/invite/${token}`;
      // Optional: message via conversations if exists
      const { data: conv } = await (supabase
        .from('conversations')
        .select('id')
        .eq('property_id', application.property_id as any)
        .eq('landlord_id', user.id as any)
        .eq('tenant_id', application.tenant_id as any)
        .maybeSingle() as any);
      if ((conv as any)?.id) {
        await (supabase.from('messages').insert({
          conversation_id: (conv as any).id,
          sender_id: user.id,
          content: `You've been invited to apply for this property. Click here to start: ${link}`,
          message_type: 'text'
        } as any) as any);
      }
      // Update application to pending
      await (supabase
        .from('applications')
        .update({ status: 'pending' } as any)
        .eq('id', application.id as any) as any);
      toast({ title: 'Request approved', description: 'Invitation sent to tenant.' });
      fetchLeads();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Approval failed', description: e.message });
    }
  };

  const declineRequest = async (applicationId: string) => {
    try {
      await (supabase
        .from('applications')
        .update({ status: 'declined' } as any)
        .eq('id', applicationId as any) as any);
      toast({ title: 'Request declined' });
      fetchLeads();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Decline failed', description: e.message });
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [user, propertyId]);

  const handleAcceptApplication = async (application: ApplicationWithTenant) => {
    const success = await updateApplicationStatus(application.id, 'accepted');
    if (success) {
      const tenantName = application.screening_profile 
        ? `${application.screening_profile.first_name} ${application.screening_profile.last_name}`
        : application.tenant_profile?.display_name || 'Tenant';
      
      setApprovedTenantName(tenantName);
      setShowSuccessDialog(true);
    }
  };

  const handleSuccessDialogAction = (createLease: boolean) => {
    setShowSuccessDialog(false);
    if (createLease && selectedApplication) {
      const tenantName = selectedApplication.screening_profile 
        ? `${selectedApplication.screening_profile.first_name} ${selectedApplication.screening_profile.last_name}`
        : selectedApplication.tenant_profile?.display_name || 'Tenant';
      onStartLease(selectedApplication.tenant_id, tenantName);
    }
  };

  const handleDeclineApplication = async (applicationId: string) => {
    await updateApplicationStatus(applicationId, 'declined');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'accepted':
        return 'default';
      case 'declined':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleDownloadDocument = async (documentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('landlord-get-document-url', {
        body: { document_id: documentId }
      });
      if (error || !data?.url) throw error || new Error('No download URL');
      await downloadFileFromUrl(data.url, `document-${documentId}`);
    } catch (e: any) {
      toast({ title: 'Download failed', description: e.message || 'Unable to get download link', variant: 'destructive' });
    }
  };

  const renderApplicationDetails = (application: ApplicationWithTenant) => {
    if (!application.screening_profile && !application.screening_details) {
      return (
        <div className="text-center py-4">
          <p className="text-muted-foreground">Screening information not available</p>
        </div>
      );
    }

    const screeningDetails = application.screening_details;
    const screeningProfile = application.screening_profile;

    return (
      <div className="space-y-6">
        {/* Basic Information */}
        <div>
          <h4 className="font-medium mb-3">Personal Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <p>{screeningDetails?.full_name || (screeningProfile ? `${screeningProfile.first_name} ${screeningProfile.last_name}` : 'N/A')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              <p>{screeningDetails?.phone || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">ID Number</label>
              <p>{screeningDetails?.id_number || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Application Date</label>
              <p>{format(new Date(application.created_at), 'MMM dd, yyyy')}</p>
            </div>
          </div>
        </div>

        {/* Employment Information */}
        {screeningDetails && (
          <div>
            <h4 className="font-medium mb-3">Employment & Income</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Employment Status</label>
                <p className="capitalize">{screeningDetails.employment_status || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Job Title</label>
                <p>{screeningDetails.job_title || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company</label>
                <p>{screeningDetails.company_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Monthly Income</label>
                <p>R{screeningDetails.net_monthly_income ? screeningDetails.net_monthly_income.toLocaleString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Housing Information */}
        {screeningDetails && (
          <div>
            <h4 className="font-medium mb-3">Housing History</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Address</label>
                <p>{screeningDetails.current_address || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Reason for Moving</label>
                <p>{screeningDetails.reason_for_moving || 'N/A'}</p>
              </div>
              {screeningDetails.previous_landlord_name && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Previous Landlord</label>
                    <p>{screeningDetails.previous_landlord_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Landlord Contact</label>
                    <p>{screeningDetails.previous_landlord_contact || 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents */}
        {application.documents && application.documents.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Documents</h4>
            <div className="grid gap-2">
              {application.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[160px] sm:max-w-[200px]">{doc.file_path.split('/').pop()}</span>
                    <Badge variant="outline" className="text-xs">
                      {doc.document_type === 'EXPERIAN_CREDIT_REPORT' ? 'Experian Credit Report' : 
                       doc.document_type === 'id' ? 'ID Document' : 'Income Document'}
                    </Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownloadDocument(doc.id)}
                  >
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Screening Status</label>
              <Badge variant={screeningProfile?.is_complete ? 'default' : 'secondary'} className="ml-2">
                {screeningProfile?.is_complete ? 'Complete' : 'Incomplete'}
              </Badge>
            </div>
            {screeningDetails?.consent_given && (
              <Badge variant="outline">
                Background Check Consent Given
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Requests */}
      <Card className="transform transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
        <CardHeader>
          <CardTitle>Application Requests</CardTitle>
          <CardDescription>Approve requests to send an application to the tenant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-sm text-muted-foreground">No requests yet.</div>
          ) : (
            <div className="grid gap-3">
              {requests.map((req) => (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-3">
                  <div className="flex-1 min-w-0">
                    <TenantBadgeInline 
                      tenantId={req.tenant_id}
                      tenantName={req.tenant_profile?.display_name || 'Tenant'}
                      size="sm"
                    />
                    <div className="text-xs text-muted-foreground truncate">{req.properties?.title}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => approveRequest(req)}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => declineRequest(req.id)}>Decline</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Leads / Inquiries */}
      <Card className="transform transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>Tenants you've chatted with about this property</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {leads.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No leads yet. Conversations will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {leads.map((lead) => (
                <div key={lead.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{lead.tenant_profile?.display_name || 'Tenant'}</div>
                    <div className="text-xs text-muted-foreground">
                      Last message {lead.last_message_at ? format(new Date(lead.last_message_at), 'MMM dd, yyyy') : 'N/A'}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
                    {invitesByTenant[lead.tenant_id]?.status === 'invited' ? (
                      <Badge variant="secondary" className="text-center">Invited to Apply</Badge>
                    ) : invitesByTenant[lead.tenant_id]?.status === 'used' ? (
                      <Badge className="text-center">Application Submitted</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleInvite(lead.tenant_id, lead.id)} className="w-full sm:w-auto">
                        Invite to Apply
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => window.open(`/messages?c=${lead.id}`, '_self')} className="w-full sm:w-auto">
                      <Eye className="h-4 w-4 mr-2" /> View Chat
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applications List */}
      <Card className="transform transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            Applications can only be submitted after viewing confirmation and landlord approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {applications.length === 0 ? (
            <>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No applications yet</h3>
                <p className="text-muted-foreground mb-6">
                  Applications will appear here after you send them to tenants who have completed viewings
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-blue-600" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 mb-1">New Workflow Process:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-700">
                      <li>Tenants schedule viewings through the property page</li>
                      <li>After viewings are completed, confirm them in the schedule</li>
                      <li>Send applications to confirmed viewers</li>
                      <li>Review and approve applications here</li>
                    </ol>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {applications.length} Application{applications.length > 1 ? 's' : ''}
                </h3>
              </div>

              <div className="grid gap-4">
                {applications.map((application) => {
                  const tenantName = application.screening_profile 
                    ? `${application.screening_profile.first_name} ${application.screening_profile.last_name}`
                    : application.tenant_profile?.display_name || 'Unknown Tenant';

                  return (
                    <Card key={application.id} className="border-l-4 border-l-primary/20 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-primary/10 p-3 rounded-lg">
                              <User className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <TenantBadgeInline 
                                tenantId={application.tenant_id}
                                tenantName={tenantName}
                                size="sm"
                              />
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">Applied {format(new Date(application.created_at), 'MMM dd, yyyy')}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={getStatusBadgeVariant(application.status)}>
                              {application.status.toUpperCase()}
                            </Badge>
                            {application.screening_profile?.is_complete && (
                              <Badge variant="outline">
                                <FileText className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Screening Complete</span>
                                <span className="sm:hidden">Complete</span>
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedApplication(application)}
                                    className="w-full sm:w-auto justify-center"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
                                  <DialogHeader>
                                    <DialogTitle className="text-left">Application Details - {tenantName}</DialogTitle>
                                    <DialogDescription className="text-left">
                                      Review the complete application and screening information
                                    </DialogDescription>
                                  </DialogHeader>
                                  {selectedApplication && renderApplicationDetails(selectedApplication)}
                                </DialogContent>
                              </Dialog>

                              {application.status === 'pending' && (
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Button 
                                    onClick={() => handleAcceptApplication(application)}
                                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto justify-center"
                                    size="sm"
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">Accept & Start Lease</span>
                                    <span className="sm:hidden">Accept</span>
                                  </Button>
                                  <Button
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleDeclineApplication(application.id)}
                                    className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto justify-center"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Decline
                                  </Button>
                                </div>
                              )}
                              
                              {application.status === 'accepted' && (
                                <Button 
                                  onClick={() => {
                                    const tenantName = application.screening_profile 
                                      ? `${application.screening_profile.first_name} ${application.screening_profile.last_name}`
                                      : application.tenant_profile?.display_name || 'Tenant';
                                    onStartLease(application.tenant_id, tenantName);
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto justify-center"
                                  size="sm"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  <span className="hidden sm:inline">Create Lease</span>
                                  <span className="sm:hidden">Lease</span>
                                </Button>
                              )}

                              {application.status === 'declined' && (
                                <Badge variant="destructive" className="w-full sm:w-auto text-center">
                                  Application Declined
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <SuccessDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        icon="check"
        title="Application Approved!"
        subtitle={`You've approved ${approvedTenantName}'s application.`}
        nextSteps={[
          { title: "Create lease contract", description: "Set up the rental agreement with terms and conditions" },
          { title: "Send for signature", description: "Both parties will sign electronically" },
          { title: "Collect deposit", description: "Secure the tenancy with a deposit payment" }
        ]}
        primaryAction={{
          label: "Create Lease Now",
          onClick: () => {
            const app = applications.find(a => 
              (a.screening_profile?.first_name + ' ' + a.screening_profile?.last_name === approvedTenantName) ||
              a.tenant_profile?.display_name === approvedTenantName
            );
            if (app) {
              setShowSuccessDialog(false);
              onStartLease(app.tenant_id, approvedTenantName);
            }
          }
        }}
        secondaryAction={{
          label: "Do This Later",
          onClick: () => setShowSuccessDialog(false)
        }}
        showConfetti={true}
      />
    </div>
  );
}