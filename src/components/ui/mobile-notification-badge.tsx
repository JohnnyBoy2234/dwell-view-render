import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MobileNotificationBadgeProps {
  count: number;
  className?: string;
  showZero?: boolean;
}

export const MobileNotificationBadge: React.FC<MobileNotificationBadgeProps> = ({
  count,
  className,
  showZero = false
}) => {
  if (count === 0 && !showZero) {
    return null;
  }

  return (
    <div className="md:hidden fixed top-4 right-4 z-50">
      <Badge 
        className={cn(
          "min-w-[24px] h-6 flex items-center justify-center",
          "bg-destructive text-destructive-foreground text-xs font-bold rounded-full",
          "shadow-lg border-2 border-background animate-pulse",
          className
        )}
      >
        {count > 99 ? '99+' : count}
      </Badge>
    </div>
  );
};