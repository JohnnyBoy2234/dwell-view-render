import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Home, MapPin, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ApplicationDetail {
  id: string;
  tenant_id: string;
  landlord_id: string;
  property_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  property?: {
    id: string;
    title: string;
    location: string;
    images: string[];
    price: number;
    bedrooms: number;
    bathrooms: number;
  };
  landlord?: {
    user_id: string;
    display_name: string;
  };
  screening_details?: {
    full_name?: string;
    id_number?: string;
    phone?: string;
    employment_status?: string;
    job_title?: string;
    company_name?: string;
    net_monthly_income?: number;
    current_address?: string;
    reason_for_moving?: string;
    previous_landlord_name?: string;
    previous_landlord_contact?: string;
  };
  documents?: Array<{
    id: string;
    document_type: string;
    file_path: string;
    file_type: string;
    status?: string;
    uploaded_at?: string;
  }>;
}

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLandlord } = useAuth();
  const { toast } = useToast();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (id) {
      fetchApplication();
    }
  }, [id, user, navigate]);

  const fetchApplication = async () => {
    if (!id || !user) return;

    try {
      let appData: any = null;
      let error: any = null;
      if (isLandlord) {
        const resp = await supabase
          .from('applications')
          .select('*')
          .eq('id', id)
          .eq('landlord_id', user.id)
          .single();
        appData = resp.data;
        error = resp.error;
      } else {
        const resp = await supabase
          .from('applications')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', user.id)
          .single();
        appData = resp.data;
        error = resp.error;
      }

      if (error) throw error;

      // Parallel fetches: property, landlord profile, screening details, documents
      const [propertyResp, landlordResp, screeningResp, docsResp] = await Promise.all([
        supabase
          .from('properties')
          .select('id, title, location, images, price, bedrooms, bathrooms')
          .eq('id', appData.property_id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('user_id, display_name')
          .eq('user_id', appData.landlord_id)
          .maybeSingle(),
        supabase
          .from('screening_details')
          .select('full_name, id_number, phone, employment_status, job_title, company_name, net_monthly_income, current_address, reason_for_moving, previous_landlord_name, previous_landlord_contact')
          .eq('user_id', appData.tenant_id)
          .maybeSingle(),
        supabase
          .from('documents')
          .select('id, document_type, file_path, file_type, status, uploaded_at')
          .eq('user_id', appData.tenant_id)
      ]);

      setApplication({
        ...appData,
        property: propertyResp.data || undefined,
        landlord: landlordResp.data || undefined,
        screening_details: screeningResp.data || undefined,
        documents: docsResp.data || []
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading application",
        description: error.message
      });
      navigate(isLandlord ? '/enhancedlandlorddashboard' : '/enhancedtenantdashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'invited':
        return <Badge variant="secondary">Invited</Badge>;
      case 'submitted':
        return <Badge variant="outline">Under Review</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Application not found</h2>
          <p className="text-muted-foreground mb-4">The application you're looking for doesn't exist.</p>
          <Button onClick={() => navigate(isLandlord ? '/enhancedlandlorddashboard' : '/enhancedtenantdashboard')}>
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate(isLandlord ? '/enhancedlandlorddashboard' : '/enhancedtenantdashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">Application Details</h1>
            {getStatusBadge(application.status)}
          </div>
          <p className="text-muted-foreground">
            Applied on {new Date(application.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Screening Details Focus */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal & Employment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Full Name</span>
                    <div className="font-medium break-words">{application.screening_details?.full_name || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ID Number</span>
                    <div className="font-medium break-words">{application.screening_details?.id_number || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone</span>
                    <div className="font-medium break-words">{application.screening_details?.phone || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Employment Status</span>
                    <div className="font-medium capitalize">{application.screening_details?.employment_status || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Job Title</span>
                    <div className="font-medium break-words">{application.screening_details?.job_title || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Company</span>
                    <div className="font-medium break-words">{application.screening_details?.company_name || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Net Monthly Income</span>
                    <div className="font-medium">{application.screening_details?.net_monthly_income ? `R${application.screening_details.net_monthly_income.toLocaleString()}` : '—'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Residence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Current Address</span>
                    <div className="font-medium break-words">{application.screening_details?.current_address || '—'}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Reason for Moving</span>
                    <div className="font-medium break-words">{application.screening_details?.reason_for_moving || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Previous Landlord</span>
                    <div className="font-medium break-words">{application.screening_details?.previous_landlord_name || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Landlord Contact</span>
                    <div className="font-medium break-words">{application.screening_details?.previous_landlord_contact || '—'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {application.documents && application.documents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {application.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                        <div className="min-w-0">
                          <div className="font-medium break-words">{doc.file_path.split('/').pop()}</div>
                          <div className="text-xs text-muted-foreground capitalize">{doc.document_type}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column: status and actions */}
          <div className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied</span>
                  <span>{new Date(application.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{new Date(application.updated_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-semibold mb-3 break-words">{application.landlord?.display_name}</div>
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/tenant/messages')}>
                  Send Message
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}