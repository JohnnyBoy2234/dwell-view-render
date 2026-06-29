import { useMemo } from 'react';
import { Users, Wrench, Calendar } from 'lucide-react';
import { ACTIVITY_TYPES, PROPERTY_COLORS } from '@mzanzihomes/common/constants/propertyConstants';

export interface PropertyActivity {
  type: string;
  message: string;
  time: string;
  icon: typeof Users;
  color: string;
}

/**
 * Hook to provide recent property activity data
 * In a real application, this would fetch from an API
 */
export function usePropertyActivity(): PropertyActivity[] {
  return useMemo(() => [
    {
      type: ACTIVITY_TYPES.APPLICATION,
      message: 'New application received from Sarah M.',
      time: '2 hours ago',
      icon: Users,
      color: PROPERTY_COLORS.IOS_BLUE
    },
    {
      type: ACTIVITY_TYPES.MAINTENANCE,
      message: 'Maintenance request completed - Kitchen tap repair',
      time: '1 day ago',
      icon: Wrench,
      color: PROPERTY_COLORS.IOS_GREEN
    },
    {
      type: ACTIVITY_TYPES.VIEWING,
      message: 'Viewing scheduled for tomorrow at 2:00 PM',
      time: '2 days ago',
      icon: Calendar,
      color: PROPERTY_COLORS.IOS_ORANGE
    }
  ], []);
}