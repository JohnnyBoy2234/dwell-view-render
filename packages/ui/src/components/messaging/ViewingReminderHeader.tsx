import { Card } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Calendar, Clock, MapPin, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ConfirmedViewing } from '@/hooks/useConfirmedViewing';

interface ViewingReminderHeaderProps {
  viewing: ConfirmedViewing;
  onViewDetails: () => void;
}

export function ViewingReminderHeader({ viewing, onViewDetails }: ViewingReminderHeaderProps) {
  const localTime = toZonedTime(new Date(viewing.start_at), 'Africa/Johannesburg');
  const endTime = new Date(localTime.getTime() + viewing.duration_minutes * 60 * 1000);
  
  const isToday = format(localTime, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isTomorrow = format(localTime, 'yyyy-MM-dd') === format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  
  let dateLabel = format(localTime, 'MMM d');
  if (isToday) dateLabel = 'Today';
  else if (isTomorrow) dateLabel = 'Tomorrow';

  return (
    <Card className="mx-4 mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 dark:from-green-950 dark:to-emerald-950 dark:border-green-800">
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <div className="bg-green-100 dark:bg-green-800 p-2 rounded-full">
                <Calendar className="h-4 w-4 text-green-600 dark:text-green-300" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 text-xs">
                  Confirmed Viewing
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">
                    {dateLabel} • {format(localTime, 'h:mm a')} - {format(endTime, 'h:mm a')} SAST
                  </span>
                </div>
                
                {viewing.properties && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{viewing.properties.title}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="flex-shrink-0 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40"
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
        </div>
      </div>
    </Card>
  );
}