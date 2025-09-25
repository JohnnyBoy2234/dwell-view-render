import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  MessageSquare,
  Wrench,
  FileText,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Property } from '@/types/dashboard';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  priority: string;
  created_at: string;
  tenant_id: string;
  notes?: string;
}

interface PropertyOverviewProps {
  property: Property;
  maintenanceRequests: MaintenanceRequest[];
}

export function PropertyOverview({ property, maintenanceRequests }: PropertyOverviewProps) {
  const navigate = useNavigate();

  const stats = [
    {
      label: 'Monthly Rent',
      value: `R${property.price.toLocaleString()}`,
      icon: DollarSign,
      color: 'ios-green',
      trend: '+5.2%'
    },
    {
      label: 'Occupancy',
      value: property.status === 'rented' ? '100%' : '0%',
      icon: Home,
      color: 'ios-blue',
      trend: property.status === 'rented' ? 'Occupied' : 'Vacant'
    },
    {
      label: 'Applications',
      value: '3',
      icon: Users,
      color: 'ios-purple',
      trend: '2 pending'
    },
    {
      label: 'Maintenance',
      value: maintenanceRequests.length.toString(),
      icon: Wrench,
      color: 'ios-orange',
      trend: `${maintenanceRequests.filter(r => r.status === 'submitted').length} active`
    }
  ];

  const quickActions = [
    {
      label: 'View Messages',
      icon: MessageSquare,
      color: 'ios-blue',
      action: () => navigate('/messages')
    },
    {
      label: 'Property Listing',
      icon: FileText,
      color: 'ios-green',
      action: () => navigate(`/property/${property.id}`)
    },
    {
      label: 'Schedule Viewing',
      icon: Calendar,
      color: 'ios-purple',
      action: () => navigate(`/manage-property/${property.id}?tab=viewings`)
    }
  ];

  const recentActivity = [
    {
      type: 'application',
      message: 'New application received from Sarah M.',
      time: '2 hours ago',
      icon: Users,
      color: 'ios-blue'
    },
    {
      type: 'maintenance',
      message: 'Maintenance request completed - Kitchen tap repair',
      time: '1 day ago',
      icon: Wrench,
      color: 'ios-green'
    },
    {
      type: 'viewing',
      message: 'Viewing scheduled for tomorrow at 2:00 PM',
      time: '2 days ago',
      icon: Calendar,
      color: 'ios-orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-ios bg-${stat.color}/10`}>
                    <Icon className={`h-4 w-4 text-${stat.color}`} />
                  </div>
                  <TrendingUp className="h-3 w-3 text-success-green" />
                </div>
                <div>
                  <p className="text-xs text-ios-gray font-medium">{stat.label}</p>
                  <p className="text-lg font-bold text-ios-gray-dark">{stat.value}</p>
                  <p className="text-xs text-ios-gray mt-1">{stat.trend}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-ios-gray-dark">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant="ghost"
                onClick={action.action}
                className="w-full justify-between p-4 h-auto hover:bg-ios-gray/5 rounded-ios"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-ios bg-${action.color}/10`}>
                    <Icon className={`h-4 w-4 text-${action.color}`} />
                  </div>
                  <span className="font-medium text-ios-gray-dark">{action.label}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-ios-gray" />
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-ios-gray-dark">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentActivity.map((activity, index) => {
            const Icon = activity.icon;
            return (
              <div key={index} className="flex items-start gap-3">
                <div className={`p-2 rounded-ios bg-${activity.color}/10 mt-0.5`}>
                  <Icon className={`h-3 w-3 text-${activity.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ios-gray-dark font-medium">{activity.message}</p>
                  <p className="text-xs text-ios-gray mt-1">{activity.time}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Property Details Summary */}
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-ios-gray-dark">Property Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-ios-gray font-medium">Property Type</p>
              <p className="text-ios-gray-dark">{property.property_type}</p>
            </div>
            <div>
              <p className="text-ios-gray font-medium">Status</p>
              <Badge className="bg-success-green/10 text-success-green border-0 rounded-ios text-xs">
                {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
              </Badge>
            </div>
            <div>
              <p className="text-ios-gray font-medium">Location</p>
              <p className="text-ios-gray-dark">{property.location}</p>
            </div>
            <div>
              <p className="text-ios-gray font-medium">Listed</p>
              <p className="text-ios-gray-dark">{new Date(property.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}