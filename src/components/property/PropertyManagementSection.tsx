import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, 
  Eye, 
  Share2, 
  Calendar, 
  MapPin, 
  Camera,
  Settings,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Property } from '@/types/dashboard';

interface PropertyManagementSectionProps {
  property: Property;
}

export function PropertyManagementSection({ property }: PropertyManagementSectionProps) {
  const navigate = useNavigate();

  const managementActions = [
    {
      category: 'Listing Management',
      actions: [
        {
          label: 'Edit Property Details',
          description: 'Update description, pricing, and features',
          icon: Edit,
          color: 'ios-blue',
          action: () => navigate('/list-property', { state: { editProperty: property } })
        },
        {
          label: 'View Public Listing',
          description: 'See how your property appears to tenants',
          icon: Eye,
          color: 'ios-green',
          action: () => navigate(`/property/${property.id}`)
        },
        {
          label: 'Update Photos',
          description: 'Add or replace property images',
          icon: Camera,
          color: 'ios-purple',
          action: () => navigate('/list-property', { state: { editProperty: property } })
        }
      ]
    },
    {
      category: 'Viewing Management',
      actions: [
        {
          label: 'Manage Viewing Slots',
          description: 'Create and schedule property viewings',
          icon: Calendar,
          color: 'ios-orange',
          action: () => navigate(`/manage-property/${property.id}?tab=viewings`)
        },
        {
          label: 'Location Settings',
          description: 'Update property location and access details',
          icon: MapPin,
          color: 'ios-teal',
          action: () => navigate('/list-property', { state: { editProperty: property } })
        }
      ]
    },
    {
      category: 'Marketing & Promotion',
      actions: [
        {
          label: 'Share Property',
          description: 'Generate shareable link for social media',
          icon: Share2,
          color: 'ios-pink',
          action: () => {
            navigator.clipboard.writeText(`${window.location.origin}/property/${property.id}`);
          }
        },
        {
          label: 'Property Settings',
          description: 'Advanced listing and visibility options',
          icon: Settings,
          color: 'ios-gray',
          action: () => navigate('/list-property', { state: { editProperty: property } })
        }
      ]
    }
  ];

  const propertyStats = [
    { label: 'Views This Week', value: '42' },
    { label: 'Inquiries', value: '8' },
    { label: 'Bookmarked', value: '15' },
    { label: 'Applications', value: '3' }
  ];

  return (
    <div className="space-y-6">
      {/* Property Performance */}
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-ios-gray-dark">Property Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {propertyStats.map((stat, index) => (
              <div key={index} className="text-center p-3 bg-ios-gray/5 rounded-ios">
                <p className="text-lg font-bold text-ios-gray-dark">{stat.value}</p>
                <p className="text-xs text-ios-gray">{stat.label}</p>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            className="w-full mt-4 border-ios-gray/20 hover:bg-ios-gray/5 rounded-ios"
            onClick={() => navigate(`/property/${property.id}`)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Public Listing
          </Button>
        </CardContent>
      </Card>

      {/* Management Actions */}
      {managementActions.map((category, categoryIndex) => (
        <Card key={categoryIndex} className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-ios-gray-dark">{category.category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {category.actions.map((action, actionIndex) => {
              const Icon = action.icon;
              return (
                <Button
                  key={actionIndex}
                  variant="ghost"
                  onClick={action.action}
                  className="w-full justify-between p-4 h-auto hover:bg-ios-gray/5 rounded-ios"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className={`p-2 rounded-ios bg-${action.color}/10`}>
                      <Icon className={`h-4 w-4 text-${action.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-ios-gray-dark">{action.label}</p>
                      <p className="text-xs text-ios-gray">{action.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ios-gray" />
                </Button>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Quick Status Toggle */}
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-ios-gray-dark">Listing Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-ios-gray-dark">Current Status</p>
              <Badge className="bg-success-green/10 text-success-green border-0 rounded-ios mt-1">
                {property.status === 'available' ? 'Active Listing' : 
                 property.status === 'unlisted' ? 'Private (Not Listed)' : property.status}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-ios-blue hover:bg-ios-blue-dark text-white rounded-ios"
              disabled={property.status === 'available'}
            >
              {property.status === 'unlisted' ? 'List Publicly' : 'Activate Listing'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-ios-gray/20 hover:bg-ios-gray/5 rounded-ios"
              disabled={property.status !== 'available'}
            >
              {property.status === 'available' ? 'Unlist' : 'Pause Listing'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}