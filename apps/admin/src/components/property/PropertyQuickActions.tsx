import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { PropertyAction } from '@/hooks/usePropertyActions';
import { PROPERTY_LABELS } from '@/constants/propertyConstants';

interface PropertyQuickActionsProps {
  actions: PropertyAction[];
}

/**
 * Component for displaying property quick actions
 */
export function PropertyQuickActions({ actions }: PropertyQuickActionsProps) {
  return (
    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-ios-gray-dark">
          {PROPERTY_LABELS.QUICK_ACTIONS}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              variant="ghost"
              onClick={action.action}
              className="w-full justify-between p-4 h-auto hover:bg-ios-gray/5 rounded-ios"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-ios bg-${action.color}/10`}>
                  <Icon className={`h-4 w-4 text-${action.color}`} />
                </div>
                <span className="font-medium text-ios-gray-dark">{action.label}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-ios-gray" />
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}