import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Edit, MessageSquare, Users, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FindTenantsTabProps } from '@/types/dashboard';

export function FindTenantsTab({ property, inquiriesCount, applicationsCount }: FindTenantsTabProps) {
  const navigate = useNavigate();

  const handleEditListing = () => {
    navigate(`/dashboard/edit-property/${property.id}`);
  };

  const handleViewInquiries = () => {
    navigate(`/dashboard/property/${property.id}/inquiries`);
  };

  const handleViewApplications = () => {
    navigate(`/dashboard/property/${property.id}/applications`);
  };

  const handleViewMessages = () => {
    navigate(`/messages?propertyId=${property.id}`);
  };

  return (
    <div className="space-y-4">
      {/* Listing Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Listing Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                <Eye className="w-3 h-3 mr-1" />
                Active on SwiftRent
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleEditListing}>
              <Edit className="w-4 h-4 mr-2" />
              Edit listing
            </Button>
            <Button variant="outline" size="sm">
              Deactivate listing
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inquiries & Applications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Interest & Applications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div 
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={handleViewInquiries}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Inquiries</p>
                <p className="text-sm text-muted-foreground">
                  {inquiriesCount > 0 ? `${inquiriesCount} new inquiries` : 'No inquiries yet'}
                </p>
              </div>
            </div>
            {inquiriesCount > 0 && (
              <Badge variant="default">{inquiriesCount}</Badge>
            )}
          </div>

          <div 
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={handleViewApplications}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Applications</p>
                <p className="text-sm text-muted-foreground">
                  {applicationsCount > 0 ? `${applicationsCount} applications received` : 'No applications yet'}
                </p>
              </div>
            </div>
            {applicationsCount > 0 && (
              <Badge variant="default">{applicationsCount}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={handleViewMessages}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages for this property
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}