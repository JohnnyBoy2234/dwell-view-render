import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, FileText, Calendar } from 'lucide-react';
import { QUICK_ACTION_LABELS, PROPERTY_COLORS, PROPERTY_ROUTES } from '@/constants/propertyConstants';

export interface PropertyAction {
  label: string;
  icon: typeof MessageSquare;
  color: string;
  action: () => void;
}

export interface PropertyActionsConfig {
  propertyId: string;
}

/**
 * Hook to provide property quick actions with navigation
 */
export function usePropertyActions({ propertyId }: PropertyActionsConfig): PropertyAction[] {
  const navigate = useNavigate();

  return useMemo(() => [
    {
      label: QUICK_ACTION_LABELS.VIEW_MESSAGES,
      icon: MessageSquare,
      color: PROPERTY_COLORS.IOS_BLUE,
      action: () => navigate(PROPERTY_ROUTES.MESSAGES)
    },
    {
      label: QUICK_ACTION_LABELS.PROPERTY_LISTING,
      icon: FileText,
      color: PROPERTY_COLORS.IOS_GREEN,
      action: () => navigate(PROPERTY_ROUTES.PROPERTY_DETAIL(propertyId))
    },
    {
      label: QUICK_ACTION_LABELS.SCHEDULE_VIEWING,
      icon: Calendar,
      color: PROPERTY_COLORS.IOS_PURPLE,
      action: () => navigate(PROPERTY_ROUTES.MANAGE_VIEWINGS(propertyId))
    }
  ], [navigate, propertyId]);
}