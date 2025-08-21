import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MobileOptimizedCardProps extends React.ComponentProps<typeof Card> {
  title?: string;
  description?: string;
  children: React.ReactNode;
  mobileSpacing?: 'compact' | 'normal' | 'spacious';
}

export const MobileOptimizedCard: React.FC<MobileOptimizedCardProps> = ({
  title,
  description,
  children,
  mobileSpacing = 'normal',
  className,
  ...props
}) => {
  const spacingClasses = {
    compact: 'p-3 sm:p-4',
    normal: 'p-4 sm:p-6',
    spacious: 'p-6 sm:p-8'
  };

  return (
    <Card
      className={cn(
        'shadow-medium border-ocean-blue/20 bg-gradient-to-br from-white to-earth-light/20',
        className
      )}
      {...props}
    >
      {(title || description) && (
        <CardHeader className={spacingClasses[mobileSpacing]}>
          {title && (
            <CardTitle className="text-lg sm:text-xl font-semibold text-foreground">
              {title}
            </CardTitle>
          )}
          {description && (
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(spacingClasses[mobileSpacing], title || description ? 'pt-0' : '')}>
        {children}
      </CardContent>
    </Card>
  );
};