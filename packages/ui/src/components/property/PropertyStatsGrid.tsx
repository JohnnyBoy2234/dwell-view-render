import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { TrendingUp } from 'lucide-react';
import { PropertyStat } from '@/hooks/usePropertyStats';

interface PropertyStatsGridProps {
  stats: PropertyStat[];
}

/**
 * Grid component for displaying property statistics
 */
export function PropertyStatsGrid({ stats }: PropertyStatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-ios bg-${stat.color}/10`}>
                  <Icon className={`h-4 w-4 text-${stat.color}`} />
                </div>
                <TrendingUp className="h-3 w-3 text-success-green" />
              </div>
              <div>
                <p className="text-xs text-ios-gray font-medium">{stat.label}</p>
                <p className="text-lg font-bold text-ios-gray-dark">{stat.value}</p>
                <p className="text-xs text-ios-gray mt-1">{stat.trend}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}