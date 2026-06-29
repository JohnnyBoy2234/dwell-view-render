import { Property } from '@mzanzihomes/common/types/dashboard';
import { usePropertyStats } from '@/hooks/usePropertyStats';
import { usePropertyActions } from '@/hooks/usePropertyActions';
import { usePropertyActivity } from '@/hooks/usePropertyActivity';
import { PropertyStatsGrid } from './PropertyStatsGrid';
import { PropertyQuickActions } from './PropertyQuickActions';
import { PropertyActivityFeed } from './PropertyActivityFeed';
import { PropertyDetailsCard } from './PropertyDetailsCard';

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

/**
 * Property overview component displaying stats, actions, activity, and details
 * Provides a comprehensive view of property status and recent activity
 */
export function PropertyOverview({ property, maintenanceRequests }: PropertyOverviewProps) {
  // Custom hooks for business logic and data
  const stats = usePropertyStats({ property, maintenanceRequests });
  const actions = usePropertyActions({ propertyId: property.id });
  const activities = usePropertyActivity();

  return (
    <div className="space-y-6">
      <PropertyStatsGrid stats={stats} />
      <PropertyQuickActions actions={actions} />
      <PropertyActivityFeed activities={activities} />
      <PropertyDetailsCard property={property} />
    </div>
  );
}