import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  className?: string;
  showZero?: boolean;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  className,
  showZero = false
}) => {
  if (count === 0 && !showZero) {
    return null;
  }

  return (
    <Badge 
      className={cn(
        "absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center",
        "bg-destructive text-destructive-foreground text-xs font-bold rounded-full",
        "shadow-sm border-2 border-background",
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </Badge>
  );
};