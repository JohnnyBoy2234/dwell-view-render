import * as React from 'react';
import { Wrench, Plus, ArrowRight, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface MaintenanceRequest {
  id: string;
  title: string;
  status: 'submitted' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  priority: 'low' | 'medium' | 'high';
}

interface MaintenanceCardProps {
  recentMaintenance: MaintenanceRequest[];
}

export function MaintenanceCard({ recentMaintenance }: MaintenanceCardProps) {
  const navigate = useNavigate();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success-green" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-earth-warm" />;
      default:
        return <AlertCircle className="h-4 w-4 text-ocean-blue" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-destructive';
      case 'medium':
        return 'text-earth-warm';
      default:
        return 'text-muted-foreground';
    }
  };

  const latestRequest = recentMaintenance[0];

  return (
    <Card className="hover-scale cursor-pointer shadow-medium border-ocean-blue/20 bg-gradient-to-br from-white to-success-green-light/20 animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wrench className="h-5 w-5 text-success-green" />
          Maintenance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {latestRequest ? (
          <>
            <div className="p-3 bg-gradient-to-r from-background to-success-green-light/40 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge variant={getStatusBadgeVariant(latestRequest.status)} className="text-xs">
                  {latestRequest.status.replace('_', ' ')}
                </Badge>
                <span className={`text-xs font-medium ${getPriorityColor(latestRequest.priority)}`}>
                  {latestRequest.priority} priority
                </span>
              </div>
              <div className="flex items-start gap-2">
                {getStatusIcon(latestRequest.status)}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">
                    {latestRequest.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(latestRequest.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>

            {recentMaintenance.length > 1 && (
              <p className="text-xs text-muted-foreground">
                +{recentMaintenance.length - 1} more request{recentMaintenance.length - 1 > 1 ? 's' : ''}
              </p>
            )}

            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="flex-1 text-success-green hover:bg-success-green/10"
                onClick={() => navigate('/tenant-dashboard?tab=maintenance')}
              >
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="border-success-green text-success-green hover:bg-success-green/10"
                onClick={() => navigate('/tenant-dashboard/maintenance')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <Wrench className="h-12 w-12 text-success-green mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No maintenance requests</p>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-success-green hover:bg-success-green/10"
              onClick={() => navigate('/tenant-dashboard/maintenance')}
            >
              <Plus className="h-4 w-4 mr-1" />
              Report Issue
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}