import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { PropertyActivity } from '@/hooks/usePropertyActivity';
import { PROPERTY_LABELS } from '@mzanzihomes/common/constants/propertyConstants';

interface PropertyActivityFeedProps {
  activities: PropertyActivity[];
}

/**
 * Component for displaying recent property activity
 */
export function PropertyActivityFeed({ activities }: PropertyActivityFeedProps) {
  return (
    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-ios-gray-dark">
          {PROPERTY_LABELS.RECENT_ACTIVITY}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <div key={index} className="flex items-start gap-3">
              <div className={`p-2 rounded-ios bg-${activity.color}/10 mt-0.5`}>
                <Icon className={`h-3 w-3 text-${activity.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ios-gray-dark font-medium">{activity.message}</p>
                <p className="text-xs text-ios-gray mt-1">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}