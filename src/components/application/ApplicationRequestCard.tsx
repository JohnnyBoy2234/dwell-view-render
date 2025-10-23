import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useApplicationRequests } from '@/hooks/useApplicationRequests';
import { Check, FileText, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';
import { ApplicationRequestStatus } from '@/types/application';

interface ApplicationRequestCardProps {
  propertyId: string;
  propertyTitle: string;
  viewingId: string;
  onSuccess?: () => void;
  landlordId: string;
}

export function ApplicationRequestCard({ 
  propertyId, 
  propertyTitle, 
  viewingId, 
  onSuccess,
  landlordId 
}: ApplicationRequestCardProps) {
  const { user } = useAuth();
  const { createRequest, loading, requests } = useApplicationRequests();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Check if there's an approved/accepted request for this property
  const approvedRequest = requests?.find(
    req => {
      const isStatusMatch = req.status === 'accepted' || 
                          req.status === ('approved' as ApplicationRequestStatus);
      return req.property_id === propertyId && 
             isStatusMatch &&
             req.tenant_id === user?.id;
    }
  );

  const handleRequestApplication = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setIsSubmitting(true);
      await createRequest(propertyId);
      toast.success('Application request sent successfully!');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error requesting application:', error);
      const errorMessage = error?.message?.includes('duplicate key value') 
        ? 'You have already requested an application for this property.'
        : 'Failed to send application request. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartApplication = () => {
    navigate(`/rental-application/${propertyId}?landlord=${landlordId}`, {
      state: { fromRequest: true }
    });
  };

  if (approvedRequest) {
    return (
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-green-100 p-2">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <CardTitle>Application Approved!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your application request for {propertyTitle} has been approved. You can now start your rental application.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleStartApplication}
            className="w-full"
          >
            <FileText className="mr-2 h-4 w-4" />
            Start Application
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle>Request Application</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Would you like to request an application for {propertyTitle}? The landlord will review your request and notify you once approved.
        </p>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleRequestApplication}
          disabled={isSubmitting || loading}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Request...
            </>
          ) : (
            'Request Application'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
