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

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ApplicationsTabProps {
  propertyId: string;
  propertyTitle?: string;
  propertyLocation?: string;
  onStartLease: (tenantId: string, tenantName: string) => void;
}

export function ApplicationsTab({ propertyId, propertyTitle, propertyLocation, onStartLease }: ApplicationsTabProps) {
  const { applications, loading, updateApplicationStatus } = useLandlordApplications(propertyId);
  const { toast } = useToast();
  const { user } = useAuth();
  const [emailForInvite, setEmailForInvite] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithTenant | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [invitesByTenant, setInvitesByTenant] = useState<Record<string, any>>({});

  const fetchLeads = async () => {
    if (!user || !propertyId) return;
    // Fetch conversations for this property where current user is landlord
    const { data: convs, error } = await supabase
      .from('conversations')
      .select('id, tenant_id, last_message_at, property_id, landlord_id')
      .eq('property_id', propertyId)
      .eq('landlord_id', user.id)
      .order('last_message_at', { ascending: false });
    if (error) {
      console.warn('Failed to fetch leads', error);
      return;
    }
    const tenantIds = Array.from(new Set((convs || []).map(c => c.tenant_id)));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', tenantIds);
    const profileMap = new Map<string, any>();
    (profiles || []).forEach(p => profileMap.set(p.user_id, p));
    setLeads((convs || []).map(c => ({ ...c, tenant_profile: profileMap.get(c.tenant_id) })));

    const { data: invites } = await supabase
      .from('application_invites')
      .select('*')
      .eq('property_id', propertyId)
      .eq('landlord_id', user.id);
    const map: Record<string, any> = {};
    (invites || []).forEach(i => { map[i.tenant_id] = i; });
    setInvitesByTenant(map);
  };

  const handleInvite = async (tenantId: string, conversationId?: string) => {
    if (!user) return;
    try {
      const token = crypto.randomUUID();
      const { data, error } = await supabase
        .from('application_invites')
        .insert({
          token,
          property_id: propertyId,
          landlord_id: user.id,
          tenant_id: tenantId,
          conversation_id: conversationId,
          status: 'invited'
        })
        .select('*')
        .single();
      if (error) throw error;

      const link = `${window.location.origin}/apply/invite/${token}`;
      if (conversationId) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: `You've been invited to apply for this property. Click here to start: ${link}`,
          message_type: 'text'
        });
      }

      toast({ title: 'Invite sent', description: 'We notified the tenant with an application link.' });
      await fetchLeads();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to send invite', description: e.message });
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
      
      onStartLease(application.tenant_id, tenantName);
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
      window.open(data.url, '_blank');
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
          <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[200px]">{doc.file_path.split('/').pop()}</span>
                    <Badge variant="outline" className="text-xs">
                      {doc.document_type === 'id' ? 'ID Document' : 'Income Document'}
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
      {/* Leads / Inquiries */}
      <Card>
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
                <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{lead.tenant_profile?.display_name || 'Tenant'}</div>
                    <div className="text-xs text-muted-foreground">
                      Last message {lead.last_message_at ? format(new Date(lead.last_message_at), 'MMM dd, yyyy') : 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {invitesByTenant[lead.tenant_id]?.status === 'invited' ? (
                      <Badge variant="secondary">Invited to Apply</Badge>
                    ) : invitesByTenant[lead.tenant_id]?.status === 'used' ? (
                      <Badge>Application Submitted</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleInvite(lead.tenant_id, lead.id)}>
                        Invite to Apply
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => window.open(`/messages?c=${lead.id}`, '_self')}>
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
      <Card>
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
                    <Card key={application.id} className="border-l-4 border-l-primary/20">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-primary/10 rounded-full">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-semibold">{tenantName}</h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  Applied {format(new Date(application.created_at), 'MMM dd, yyyy')}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant={getStatusBadgeVariant(application.status)}>
                                {application.status.toUpperCase()}
                              </Badge>
                              {application.screening_profile?.is_complete && (
                                <Badge variant="outline">
                                  <FileText className="h-3 w-3 mr-1" />
                                  Screening Complete
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedApplication(application)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Application Details - {tenantName}</DialogTitle>
                                  <DialogDescription>
                                    Review the complete application and screening information
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedApplication && renderApplicationDetails(selectedApplication)}
                              </DialogContent>
                            </Dialog>

                            {application.status === 'pending' && (
                              <>
                                <Button 
                                  onClick={() => handleAcceptApplication(application)}
                                  className="bg-green-600 hover:bg-green-700"
                                  size="sm"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Accept & Start Lease
                                </Button>
                                <Button
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeclineApplication(application.id)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Decline
                                </Button>
                              </>
                            )}
                            
                            {application.status === 'accepted' && (
                              <Button 
                                onClick={() => {
                                  const tenantName = application.screening_profile 
                                    ? `${application.screening_profile.first_name} ${application.screening_profile.last_name}`
                                    : application.tenant_profile?.display_name || 'Tenant';
                                  onStartLease(application.tenant_id, tenantName);
                                }}
                                className="bg-blue-600 hover:bg-blue-700"
                                size="sm"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Create Lease
                              </Button>
                            )}

                            {application.status === 'declined' && (
                              <Badge variant="destructive">
                                Application Declined
                              </Badge>
                            )}
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
    </div>
  );
}