import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { MAINTENANCE_LABELS } from '@mzanzihomes/common/constants/maintenanceConstants';
import type { MaintenanceRequest } from '@mzanzihomes/common/types/maintenance';

interface OverdueAlertProps {
  overdueTickets: MaintenanceRequest[];
}

/**
 * Component for displaying overdue ticket alerts
 */
export function OverdueAlert({ overdueTickets }: OverdueAlertProps) {
  if (overdueTickets.length === 0) {
    return null;
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          {MAINTENANCE_LABELS.OVERDUE_TICKETS} ({overdueTickets.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {overdueTickets.slice(0, 3).map(ticket => (
            <div 
              key={ticket.id} 
              className="flex items-center justify-between p-2 bg-white rounded border"
            >
              <div>
                <span className="font-medium">{ticket.title}</span>
                <Badge variant="destructive" className="ml-2">{ticket.priority}</Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {MAINTENANCE_LABELS.CREATED_DATE(ticket.created_at)}
              </span>
            </div>
          ))}
          {overdueTickets.length > 3 && (
            <p className="text-sm text-muted-foreground">
              {MAINTENANCE_LABELS.MORE_OVERDUE(overdueTickets.length - 3)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}