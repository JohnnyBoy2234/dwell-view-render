import { Calendar } from 'lucide-react';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { PROPERTY_CARD_STYLES } from '@mzanzihomes/common/constants/propertyCardConstants';

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
 * application lists look the same across the dashboard: title + date in the
 * header with a status badge on the right, a few "Label: value" lines, and a
 * row of small action buttons. */
export function RecordCard({ title, dateLine, badge, details, extra, actions, onClick }: RecordCardProps) {
  return (
    <Card className={PROPERTY_CARD_STYLES.CARD} onClick={onClick}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="line-clamp-1">{title}</CardTitle>
            <CardDescription>
              <span className="flex items-center gap-1 text-sm">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="line-clamp-1">{dateLine}</span>
              </span>
            </CardDescription>
          </div>
          <Badge className={`w-fit flex-shrink-0 ${badge.className ?? ''}`} variant={badge.variant}>
            {badge.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {details && details.length > 0 && (
            <div className="text-sm text-muted-foreground space-y-1">
              {details.map((detail) => (
                <p key={detail.label} className="line-clamp-1">
                  <strong>{detail.label}:</strong> {detail.value}
                </p>
              ))}
            </div>
          )}
          {extra}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
