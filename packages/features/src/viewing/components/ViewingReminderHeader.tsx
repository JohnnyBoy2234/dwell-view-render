import { Card } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Calendar, Clock, MapPin, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ConfirmedViewing } from '../hooks/useConfirmedViewing';

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
    <button
      onClick={onViewDetails}
      className="mx-3 mb-1.5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/60 dark:border-green-800 px-3 py-1.5 text-left"
      style={{ width: 'calc(100% - 1.5rem)' }}
    >
      <Calendar className="h-4 w-4 text-green-600 dark:text-green-300 shrink-0" />
      <span className="text-[13px] font-medium text-green-900 dark:text-green-100 truncate flex-1">
        Viewing {dateLabel} · {format(localTime, 'h:mm a')}
        {viewing.properties?.title ? ` · ${viewing.properties.title}` : ''}
      </span>
      <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-300">
        <Eye className="h-3 w-3" /> View
      </span>
    </button>
  );
}