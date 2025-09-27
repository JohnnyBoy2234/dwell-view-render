import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Home, MapPin, Calendar, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { downloadFileFromUrl } from '@/lib/download';

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
  screening_profile?: {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
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
    has_pets?: boolean;
    pet_details?: string;
    documents?: Array<{
      id: string;
      type: string;
      name: string;
      url: string;
      uploaded_at: string;
    }>;
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
    if (!id || !user) {
      console.log('Missing id or user:', { id, user: user?.id });
      return;
    }

    console.log('Fetching application:', { id, userId: user.id, isLandlord });

    try {
      let appData: any = null;
      let error: any = null;
      if (isLandlord) {
        console.log('Fetching as landlord');
        const resp = await supabase
          .from('applications')
          .select('*')
          .eq('id', id)
          .eq('landlord_id', user.id)
          .maybeSingle();
        appData = resp.data;
        error = resp.error;
      } else {
        console.log('Fetching as tenant');
        const resp = await supabase
          .from('applications')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', user.id)
          .maybeSingle();
        appData = resp.data;
        error = resp.error;
      }

      console.log('Application fetch result:', { appData, error });

      if (error) throw error;
      
      if (!appData) {
        console.log('No application data found');
        setApplication(null);
        setLoading(false);
        return;
      }

      console.log('Fetching related data for application:', appData.id);

      // Parallel fetches: property, landlord profile, screening profile, screening details, documents
      const [propertyResp, landlordResp, screeningProfileResp, screeningDetailsResp, docsResp] = await Promise.all([
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
          .from('screening_profiles')
          .select('first_name, middle_name, last_name, has_pets, pet_details, documents')
          .eq('user_id', appData.tenant_id)
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

      console.log('Related data fetch results:', {
        property: propertyResp.data,
        landlord: landlordResp.data,
        screeningProfile: screeningProfileResp.data,
        screeningDetails: screeningDetailsResp.data,
        documents: docsResp.data
      });

      // Combine screening profile and screening details data
      const screeningProfile = screeningProfileResp.data;
      const screeningDetails = screeningDetailsResp.data;
      
      const combinedScreeningData = {
        // From screening_profiles
        first_name: screeningProfile?.first_name,
        middle_name: screeningProfile?.middle_name,
        last_name: screeningProfile?.last_name,
        has_pets: screeningProfile?.has_pets,
        pet_details: screeningProfile?.pet_details,
        documents: screeningProfile?.documents,
        // From screening_details
        id_number: screeningDetails?.id_number,
        phone: screeningDetails?.phone,
        employment_status: screeningDetails?.employment_status,
        job_title: screeningDetails?.job_title,
        company_name: screeningDetails?.company_name,
        net_monthly_income: screeningDetails?.net_monthly_income,
        current_address: screeningDetails?.current_address,
        reason_for_moving: screeningDetails?.reason_for_moving,
        previous_landlord_name: screeningDetails?.previous_landlord_name,
        previous_landlord_contact: screeningDetails?.previous_landlord_contact,
      };

      setApplication({
        ...appData,
        property: propertyResp.data || undefined,
        landlord: landlordResp.data || undefined,
        screening_profile: combinedScreeningData,
        documents: docsResp.data || []
      });
    } catch (error: any) {
      console.error('Error in fetchApplication:', error);
      toast({
        variant: "destructive",
        title: "Error loading application",
        description: error.message
      });
      navigate(isLandlord ? '/dashboard' : '/tenant-dashboard');
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

  const downloadDocument = async (document: any) => {
    try {
      let fileUrl: string;
      
      if (document.source === 'screening_profile') {
        // Document from screening profile - use the URL directly
        fileUrl = document.url || document.name;
      } else if (document.source === 'documents_table' && isLandlord) {
        // Use the edge function for landlords to access tenant documents
        try {
          const { data, error } = await supabase.functions.invoke('landlord-get-document-url', {
            body: { document_id: document.id }
          });
          
          if (error || !data?.url) {
            throw new Error(error?.message || 'Failed to get download URL');
          }
          
          fileUrl = data.url;
        } catch (edgeError) {
          console.error('Edge function error:', edgeError);
          throw edgeError;
        }
      } else {
        // For tenants or other cases, construct URL from file_path
        fileUrl = document.file_path || document.url || document.name;
      }
      
      // Use the shared download utility
      await downloadFileFromUrl(fileUrl, document.name);
      
      toast({
        title: "Download started",
        description: `Downloading ${document.name}`,
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not download the document. Please try again.",
      });
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
          <Button onClick={() => navigate(isLandlord ? '/dashboard' : '/tenant-dashboard')}>
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
          <Button variant="outline" onClick={() => navigate(isLandlord ? '/dashboard' : '/tenant-dashboard')}>
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
                    <div className="font-medium break-words">
                      {application.screening_profile ? 
                        `${application.screening_profile.first_name || ''} ${application.screening_profile.middle_name || ''} ${application.screening_profile.last_name || ''}`.trim() 
                        : '—'
                      }
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ID Number</span>
                    <div className="font-medium break-words">{application.screening_profile?.id_number || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone</span>
                    <div className="font-medium break-words">{application.screening_profile?.phone || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Employment Status</span>
                    <div className="font-medium capitalize">{application.screening_profile?.employment_status || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Job Title</span>
                    <div className="font-medium break-words">{application.screening_profile?.job_title || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Company</span>
                    <div className="font-medium break-words">{application.screening_profile?.company_name || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Net Monthly Income</span>
                    <div className="font-medium">{application.screening_profile?.net_monthly_income ? `R${application.screening_profile.net_monthly_income.toLocaleString()}` : '—'}</div>
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
                    <div className="font-medium break-words">{application.screening_profile?.current_address || '—'}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Reason for Moving</span>
                    <div className="font-medium break-words">{application.screening_profile?.reason_for_moving || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Previous Landlord</span>
                    <div className="font-medium break-words">{application.screening_profile?.previous_landlord_name || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Landlord Contact</span>
                    <div className="font-medium break-words">{application.screening_profile?.previous_landlord_contact || '—'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Has Pets</span>
                    <div className="font-medium">{application.screening_profile?.has_pets ? 'Yes' : 'No'}</div>
                  </div>
                  {application.screening_profile?.has_pets && (
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">Pet Details</span>
                      <div className="font-medium break-words">{application.screening_profile?.pet_details || '—'}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {(() => {
              // Combine and deduplicate documents
              const screeningDocs = application.screening_profile?.documents || [];
              const tableDocs = application.documents || [];
              
              // Create a map to deduplicate by document name and type
              const docMap = new Map();
              
              // Add screening profile documents first
              screeningDocs.forEach(doc => {
                const key = `${doc.name}_${doc.type}`;
                if (!docMap.has(key)) {
                  docMap.set(key, {
                    id: doc.id,
                    name: doc.name,
                    type: doc.type,
                    uploaded_at: doc.uploaded_at,
                    url: doc.url,
                    source: 'screening_profile'
                  });
                }
              });
              
              // Add table documents (only if not already present)
              tableDocs.forEach(doc => {
                const fileName = doc.file_path.split('/').pop();
                const key = `${fileName}_${doc.document_type}`;
                if (!docMap.has(key)) {
                  docMap.set(key, {
                    id: doc.id,
                    name: fileName,
                    type: doc.document_type,
                    uploaded_at: doc.uploaded_at,
                    file_path: doc.file_path,
                    source: 'documents_table'
                  });
                }
              });
              
              const allDocuments = Array.from(docMap.values());
              
              if (allDocuments.length === 0) return null;
              
              return (
                <Card>
                  <CardHeader>
                    <CardTitle>Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {allDocuments.map((doc) => (
                        <div key={`${doc.source}_${doc.id}`} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium break-words">{doc.name}</div>
                            <div className="text-xs text-muted-foreground capitalize">{doc.type}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '—'}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadDocument(doc)}
                            className="ml-3 flex-shrink-0"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
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