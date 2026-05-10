import React from 'react';
import { Card } from '@/components/ui/card';
import { PROPERTY_CARD_STYLES } from '@/constants/propertyCardConstants';
import { BarChart3 } from 'lucide-react';

interface AccountingHeaderProps {
  subtitle: string;
  children?: React.ReactNode;
}

export function AccountingHeader({ subtitle, children }: AccountingHeaderProps) {
  return (
    <Card className={`${PROPERTY_CARD_STYLES.CARD} mb-6`}>
      <div className="p-6 space-y-4">
        {/* SwiftBooks Header */}
        <div className="flex items-center gap-3 pb-2 border-b">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              SwiftBooks
            </h1>
            <p className="text-sm text-muted-foreground/70">{subtitle}</p>
          </div>
        </div>
        
        {/* Navigation or additional content */}
        {children}
      </div>
    </Card>
  );
}
