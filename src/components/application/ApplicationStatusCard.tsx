import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import { ARIA_LABELS } from '@/constants/applicationConstants';

interface ApplicationStatusCardProps {
  status: string;
  onDashboardClick: () => void;
}

/**
 * Component to display application status when user has already submitted
 * Shows current status with appropriate styling and navigation
 */
export function ApplicationStatusCard({ status, onDashboardClick }: ApplicationStatusCardProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-6 w-6 text-success" />;
      case 'declined':
        return <XCircle className="h-6 w-6 text-destructive" />;
      case 'submitted':
      default:
        return <Clock className="h-6 w-6 text-warning" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'approved':
        return 'bg-success/10 text-success border-success/20';
      case 'declined':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'submitted':
      default:
        return 'bg-warning/10 text-warning border-warning/20';
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'approved':
        return 'Your application has been approved! The landlord will contact you with next steps.';
      case 'declined':
        return 'Your application was not successful this time. You may apply for other properties.';
      case 'submitted':
      default:
        return 'Your application is being reviewed. You will be notified once a decision is made.';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Application Status
        </CardTitle>
        <CardDescription>Your application for this property</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="text-center py-8 space-y-4">
          <div className="flex justify-center">
            {getStatusIcon()}
          </div>
          
          <div className="space-y-2">
            <Badge className={`${getStatusColor()} text-sm px-3 py-1`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
            
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {getStatusMessage()}
            </p>
          </div>
          
          <Button 
            variant="outline" 
            onClick={onDashboardClick}
            aria-label={ARIA_LABELS.DASHBOARD_LINK}
            className="mt-4"
          >
            Go to Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}