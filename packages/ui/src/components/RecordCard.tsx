import { Calendar } from 'lucide-react';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';

export interface RecordCardBadge {
  label: string;
  variant?: React.ComponentProps<typeof Badge>['variant'];
  className?: string;
}

export interface RecordCardDetail {
  label: string;
  value: string;
}

interface RecordCardProps {
  title: string;
  dateLine: string;
  badge: RecordCardBadge;
  details?: RecordCardDetail[];
  extra?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
}

/** The lease-contract card layout, shared so lease, viewing, maintenance and
 * application lists look the same across the dashboard. Compact single-row
 * layout: title, badge and detail lines on the left, actions pinned to the
 * right on wider screens (stacked below on mobile). */
export function RecordCard({ title, dateLine, badge, details, extra, actions, onClick }: RecordCardProps) {
  return (
    <Card
      className={`bg-white dark:bg-slate-900 border border-black/[0.07] shadow-sm rounded-2xl overflow-hidden transition-shadow hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold leading-snug line-clamp-1">{title}</h3>
              <Badge className={`flex-shrink-0 ${badge.className ?? ''}`} variant={badge.variant}>
                {badge.label}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="line-clamp-1">{dateLine}</span>
              </span>
              {details?.map((detail) => (
                <span key={detail.label} className="line-clamp-1">
                  <strong className="font-medium text-foreground/80">{detail.label}:</strong> {detail.value}
                </span>
              ))}
            </div>
            {extra}
          </div>
          {actions && (
            <div className="flex flex-wrap gap-2 sm:flex-shrink-0 sm:justify-end">{actions}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
