import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  CreditCard, 
  Package, 
  FileText, 
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Calendar
} from 'lucide-react';
// Simple R icon for South African Rand
const RIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>
);
import { useNavigate } from 'react-router-dom';
import { Property } from '@mzanzihomes/common/types/dashboard';

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

interface PropertyOperationsProps {
  property: Property;
  maintenanceRequests: MaintenanceRequest[];
}

export function PropertyOperations({ property, maintenanceRequests }: PropertyOperationsProps) {
  const navigate = useNavigate();

  const getMaintenanceStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <AlertCircle className="h-4 w-4 text-earth-warm" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-ocean-blue" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success-green" />;
      default:
        return <AlertCircle className="h-4 w-4 text-ios-gray" />;
    }
  };

  const getMaintenanceStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-earth-warm/10 text-earth-warm border-earth-warm/20';
      case 'in_progress':
        return 'bg-ocean-blue/10 text-ocean-blue border-ocean-blue/20';
      case 'completed':
        return 'bg-success-green/10 text-success-green border-success-green/20';
      default:
        return 'bg-ios-gray/10 text-ios-gray border-ios-gray/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-ios-red/10 text-ios-red border-ios-red/20';
      case 'medium':
        return 'bg-earth-warm/10 text-earth-warm border-earth-warm/20';
      case 'low':
        return 'bg-success-green/10 text-success-green border-success-green/20';
      default:
        return 'bg-ios-gray/10 text-ios-gray border-ios-gray/20';
    }
  };

  const operationStats = [
    {
      label: 'Active Requests',
      value: maintenanceRequests.filter(r => r.status !== 'completed').length,
      icon: Wrench,
      color: 'ios-orange'
    },
    {
      label: 'Monthly Revenue',
      value: `R${property.price.toLocaleString()}`,
      icon: RIcon,
      color: 'ios-green'
    },
    {
      label: 'Inventory Items',
      value: '24',
      icon: Package,
      color: 'ios-purple'
    },
    {
      label: 'Documents',
      value: '8',
      icon: FileText,
      color: 'ios-blue'
    }
  ];

  const quickActions = [
    {
      label: 'Create Maintenance Request',
      description: 'Report or schedule maintenance',
      icon: Plus,
      color: 'ios-orange',
      action: () => navigate(`/manage-property/${property.id}?tab=maintenance`)
    },
    {
      label: 'Manage Payments',
      description: 'Set up rent collection',
      icon: CreditCard,
      color: 'ios-green',
      action: () => navigate(`/manage-property/${property.id}?tab=payments`)
    },
    {
      label: 'Property Inventory',
      description: 'Track items and condition',
      icon: Package,
      color: 'ios-purple',
      action: () => navigate(`/manage-property/${property.id}?tab=inventory`)
    }
  ];

  return (
    <div className="space-y-6">
      {/* Operations Stats */}
      <div className="grid grid-cols-2 gap-4">
        {operationStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-ios bg-${stat.color}/10`}>
                    <Icon className={`h-4 w-4 text-${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ios-gray-dark">{stat.value}</p>
                    <p className="text-xs text-ios-gray">{stat.label}</p>
                  </div>
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

      {/* Maintenance Requests */}
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-ios-gray-dark">
            Maintenance Requests ({maintenanceRequests.length})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/manage-property/${property.id}?tab=maintenance`)}
            className="border-ios-gray/20 hover:bg-ios-gray/5 rounded-ios"
          >
            View All
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {maintenanceRequests.slice(0, 3).map((request) => (
            <div
              key={request.id}
              className="p-3 bg-ios-gray/5 rounded-ios hover:bg-ios-gray/10 transition-colors cursor-pointer"
              onClick={() => navigate(`/maintenance/${request.id}`)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getMaintenanceStatusIcon(request.status)}
                  <p className="font-medium text-ios-gray-dark">{request.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getPriorityColor(request.priority)} rounded-ios text-xs`}>
                    {request.priority}
                  </Badge>
                  <Badge className={`${getMaintenanceStatusColor(request.status)} rounded-ios text-xs`}>
                    {request.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-ios-gray line-clamp-2 mb-2">{request.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-ios-gray">{request.category}</span>
                <span className="text-xs text-ios-gray">
                  {new Date(request.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
          
          {maintenanceRequests.length === 0 && (
            <div className="text-center py-6">
              <Wrench className="h-8 w-8 text-ios-gray mx-auto mb-2" />
              <p className="text-ios-gray">No maintenance requests</p>
              <p className="text-xs text-ios-gray mt-1">Maintenance requests will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Overview */}
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-ios-gray-dark">Financial Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-ios-gray font-medium">Monthly Rent</p>
              <p className="text-lg font-bold text-success-green">R{property.price.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-ios-gray font-medium">Payment Status</p>
              <Badge className="bg-success-green/10 text-success-green border-0 rounded-ios mt-1">
                Current
              </Badge>
            </div>
            <div>
              <p className="text-ios-gray font-medium">Security Deposit</p>
              <p className="text-ios-gray-dark">R{(property.price * 1.5).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-ios-gray font-medium">Next Due Date</p>
              <p className="text-ios-gray-dark">{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full border-ios-gray/20 hover:bg-ios-gray/5 rounded-ios"
            onClick={() => navigate(`/manage-property/${property.id}?tab=payments`)}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Manage Payments
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}