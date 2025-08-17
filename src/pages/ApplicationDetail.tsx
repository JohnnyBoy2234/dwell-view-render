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
}

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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
      const { data: appData, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', user.id)
        .single();

      if (error) throw error;

      // Fetch property details
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('id, title, location, images, price, bedrooms, bathrooms')
        .eq('id', appData.property_id)
        .single();

      if (propertyError) throw propertyError;

      // Fetch landlord profile
      const { data: landlordData, error: landlordError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .eq('user_id', appData.landlord_id)
        .single();

      if (landlordError) throw landlordError;

      setApplication({
        ...appData,
        property: propertyData,
        landlord: landlordData
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading application",
        description: error.message
      });
      navigate('/tenant-dashboard');
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
          <Button onClick={() => navigate('/tenant-dashboard')}>
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
          <Button variant="outline" onClick={() => navigate('/tenant-dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Application Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Application Details</h1>
            {getStatusBadge(application.status)}
          </div>
          <p className="text-muted-foreground">
            Application submitted on {new Date(application.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Property Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Property Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {application.property?.images?.[0] && (
                  <div className="mb-4">
                    <img
                      src={application.property.images[0]}
                      alt={application.property.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{application.property?.title}</h3>
                <div className="flex items-center text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4 mr-1" />
                  {application.property?.location}
                </div>
                <div className="text-2xl font-bold mb-4">
                  R{application.property?.price?.toLocaleString()}/month
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Bedrooms</span>
                    <div className="font-semibold">{application.property?.bedrooms}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Bathrooms</span>
                    <div className="font-semibold">{application.property?.bathrooms}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Application Status & Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  {getStatusBadge(application.status)}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Applied:</span>
                    <span>{new Date(application.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span>{new Date(application.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {application.status === 'invited' && (
                  <div className="pt-4">
                    <Button className="w-full">
                      Complete Application
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Landlord</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-semibold">{application.landlord?.display_name}</div>
                <Button 
                  variant="outline" 
                  className="w-full mt-3"
                  onClick={() => navigate('/messages')}
                >
                  Send Message
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate(`/property/${application.property_id}`)}
                >
                  View Property
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}