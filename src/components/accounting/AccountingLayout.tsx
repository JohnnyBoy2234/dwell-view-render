import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AccountingLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function AccountingLayout({ title, subtitle, children, className }: AccountingLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SwiftBooks</h1>
          {subtitle && <p className="text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
      </Card>
      
      {/* Content */}
      <div className={cn('space-y-6', className)}>
        {children}
      </div>
    </div>
  );
}
