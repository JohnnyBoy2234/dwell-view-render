import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileResponsiveButtonProps extends ButtonProps {
  mobileSize?: 'sm' | 'default' | 'lg';
  desktopSize?: 'sm' | 'default' | 'lg';
  mobileFullWidth?: boolean;
  hideTextOnMobile?: boolean;
  icon?: React.ReactNode;
  text: string;
}

export const MobileResponsiveButton: React.FC<MobileResponsiveButtonProps> = ({
  mobileSize = 'default',
  desktopSize = 'default',
  mobileFullWidth = false,
  hideTextOnMobile = false,
  icon,
  text,
  className,
  children,
  ...props
}) => {
  const mobileClasses = {
    sm: 'h-8 px-3 text-xs',
    default: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base'
  };

  const desktopClasses = {
    sm: 'sm:h-8 sm:px-3 sm:text-xs',
    default: 'sm:h-10 sm:px-4 sm:text-sm',
    lg: 'sm:h-12 sm:px-6 sm:text-base'
  };

  return (
    <Button
      className={cn(
        mobileClasses[mobileSize],
        desktopClasses[desktopSize],
        mobileFullWidth && 'w-full sm:w-auto',
        'flex items-center gap-2 touch-manipulation', // Touch-friendly
        className
      )}
      {...props}
    >
      {icon}
      <span className={hideTextOnMobile ? 'hidden sm:inline' : ''}>
        {children || text}
      </span>
    </Button>
  );
};