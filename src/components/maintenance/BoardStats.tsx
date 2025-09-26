import { Card, CardContent } from '@/components/ui/card';
import { MaintenanceStats } from '@/hooks/useMaintenanceStats';
import { MAINTENANCE_LABELS } from '@/constants/maintenanceConstants';

interface BoardStatsProps {
  stats: MaintenanceStats;
}

/**
 * Component for displaying maintenance board statistics
 */
export function BoardStats({ stats }: BoardStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{stats.totalTickets}</div>
          <div className="text-sm text-muted-foreground">{MAINTENANCE_LABELS.TOTAL_TICKETS}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.inProgressTickets}</div>
          <div className="text-sm text-muted-foreground">{MAINTENANCE_LABELS.IN_PROGRESS}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.overdueTickets}</div>
          <div className="text-sm text-muted-foreground">{MAINTENANCE_LABELS.OVERDUE}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completedTickets}</div>
          <div className="text-sm text-muted-foreground">{MAINTENANCE_LABELS.COMPLETED}</div>
        </CardContent>
      </Card>
    </div>
  );
}