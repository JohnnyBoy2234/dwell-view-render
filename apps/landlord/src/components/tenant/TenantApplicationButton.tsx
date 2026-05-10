import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ExternalLink } from 'lucide-react';
import { useTenantApplications } from '@/hooks/useTenantApplications';
import { useNavigate } from 'react-router-dom';

interface TenantApplicationButtonProps {
  propertyId: string;
  className?: string;
}

export const TenantApplicationButton = ({ propertyId, className }: TenantApplicationButtonProps) => {
  const { getApplicationForProperty, hasApplicationForProperty, getApplicationStatus, loading } = useTenantApplications();
  const navigate = useNavigate();

  const application = getApplicationForProperty(propertyId);
  const hasApplication = hasApplicationForProperty(propertyId);
  const status = getApplicationStatus(propertyId);

  const handleApplicationClick = () => {
    if (application) {
      // Navigate to application details/edit page
      navigate(`/application/${application.id}`);
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
        return null;
    }
  };

  if (loading) {
    return (
      <Button 
        variant="outline" 
        className={className}
        disabled
      >
        <FileText className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (!hasApplication) {
    return null; // Hide button if no application exists
  }

  return (
    <div className="space-y-2">
      <Button 
        variant="outline" 
        className={className}
        onClick={handleApplicationClick}
      >
        <FileText className="h-4 w-4 mr-2" />
        View Application
        <ExternalLink className="h-3 w-3 ml-2" />
      </Button>
      {status && getStatusBadge(status)}
    </div>
  );
};