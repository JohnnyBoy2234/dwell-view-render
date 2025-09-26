import { useMemo } from 'react';
import { DollarSign, Home, Users, Wrench } from 'lucide-react';
import { Property } from '@/types/dashboard';
import { 
  PROPERTY_LABELS, 
  OCCUPANCY_STATUS, 
  APPLICATION_STATUS_TEXT,
  PROPERTY_COLORS 
} from '@/constants/propertyConstants';

interface MaintenanceRequest {
  id: string;
  status: string;
}

export interface PropertyStat {
  label: string;
  value: string;
  icon: typeof DollarSign;
  color: string;
  trend: string;
}

export interface PropertyStatsConfig {
  property: Property;
  maintenanceRequests: MaintenanceRequest[];
}

/**
 * Hook to calculate and format property statistics
 */
export function usePropertyStats({ property, maintenanceRequests }: PropertyStatsConfig): PropertyStat[] {
  return useMemo(() => {
    const isOccupied = property.status === 'rented';
    const activeMaintenanceCount = maintenanceRequests.filter(r => r.status === 'submitted').length;

    return [
      {
        label: PROPERTY_LABELS.MONTHLY_RENT,
        value: `R${property.price.toLocaleString()}`,
        icon: DollarSign,
        color: PROPERTY_COLORS.IOS_GREEN,
        trend: '+5.2%'
      },
      {
        label: PROPERTY_LABELS.OCCUPANCY,
        value: isOccupied ? OCCUPANCY_STATUS.FULL : OCCUPANCY_STATUS.EMPTY,
        icon: Home,
        color: PROPERTY_COLORS.IOS_BLUE,
        trend: isOccupied ? OCCUPANCY_STATUS.OCCUPIED : OCCUPANCY_STATUS.VACANT
      },
      {
        label: PROPERTY_LABELS.APPLICATIONS,
        value: '3',
        icon: Users,
        color: PROPERTY_COLORS.IOS_PURPLE,
        trend: `2 ${APPLICATION_STATUS_TEXT.PENDING}`
      },
      {
        label: PROPERTY_LABELS.MAINTENANCE,
        value: maintenanceRequests.length.toString(),
        icon: Wrench,
        color: PROPERTY_COLORS.IOS_ORANGE,
        trend: `${activeMaintenanceCount} ${APPLICATION_STATUS_TEXT.ACTIVE}`
      }
    ];
  }, [property, maintenanceRequests]);
}