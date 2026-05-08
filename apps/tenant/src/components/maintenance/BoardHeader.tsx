import { Button } from '@/components/ui/button';
import { Plus, Filter } from 'lucide-react';
import { MAINTENANCE_LABELS, PRIORITY_OPTIONS } from '@/constants/maintenanceConstants';

interface BoardHeaderProps {
  selectedPriority: string | null;
  onPriorityChange: (priority: string | null) => void;
  onCreateClick: () => void;
  showCreateButton?: boolean;
}

/**
 * Component for maintenance board header with filters and actions
 */
export function BoardHeader({ 
  selectedPriority, 
  onPriorityChange, 
  onCreateClick, 
  showCreateButton = true 
}: BoardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">{MAINTENANCE_LABELS.TITLE}</h2>
        <p className="text-muted-foreground">
          {MAINTENANCE_LABELS.SUBTITLE}
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <select
            value={selectedPriority || ''}
            onChange={(e) => onPriorityChange(e.target.value || null)}
            className="text-sm border rounded px-2 py-1"
            aria-label="Filter by priority"
          >
            {PRIORITY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {showCreateButton && (
          <Button 
            onClick={onCreateClick}
            className="flex items-center gap-2"
            aria-label="Create new maintenance request"
          >
            <Plus className="h-4 w-4" />
            {MAINTENANCE_LABELS.NEW_REQUEST}
          </Button>
        )}
      </div>
    </div>
  );
}