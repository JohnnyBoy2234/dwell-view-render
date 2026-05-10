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

  // Check if there's an approved request for this property
  const approvedRequest = requests?.find(
    req => req.property_id === propertyId && 
           req.status === 'approved' &&
           req.tenant_id === user?.id
  );

  const handleRequestApplication = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Check if there's already a pending or approved request
      const existingRequest = requests?.find(
        req => req.property_id === propertyId && 
               req.tenant_id === user.id && 
               (req.status === 'pending' || req.status === 'approved')
      );

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          toast.info('You already have a pending application request for this property');
        } else if (existingRequest.status === 'approved') {
          toast.info('Your application for this property has been approved');
        }
        return;
      }

      // Create the application request
      const newRequest = await createRequest(propertyId);
      
      if (newRequest) {
        toast.success('Application requested successfully');
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Error requesting application:', error);
      const errorMessage = error?.message || 'Failed to request application. Please try again.';
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
          disabled={isSubmitting || loading || !!approvedRequest}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          variant={approvedRequest ? 'outline' : 'default'}
        >
          {isSubmitting || loading ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </span>
          ) : approvedRequest ? (
            <span className="flex items-center text-green-600">
              <Check className="mr-2 h-4 w-4" />
              Application Approved
            </span>
          ) : (
            <span className="flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Request Application
            </span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
