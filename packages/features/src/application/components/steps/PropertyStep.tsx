import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { CheckCircle2, MapPin } from 'lucide-react';

export interface PropertySummary {
  id: string;
  title: string;
  location: string;
  price: number | null;
  image: string | null;
}

const STEP_OVERVIEW = [
  'Your details',
  'Household and income',
  'Consent and checks',
  'References and documents',
  'Review and submit'
];

/** Step 1: confirm the property being applied for and set expectations. */
export function PropertyStep({ property }: { property: PropertySummary | null }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">You're applying for</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Check that this is the right property before you start.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          {property ? (
            <div className="flex gap-4 items-start">
              {property.image && (
                <img
                  src={property.image}
                  alt=""
                  className="h-20 w-20 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="font-semibold break-words">{property.title}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="break-words">{property.location}</span>
                </p>
                {property.price != null && (
                  <p className="text-sm font-medium mt-1">R{property.price.toLocaleString()} / month</p>
                )}
              </div>
            </div>
          ) : (
            <div className="h-16 bg-muted animate-pulse rounded" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">What to expect</p>
          <ul className="space-y-2">
            {STEP_OVERVIEW.map((label) => (
              <li key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Your progress is saved automatically — you can leave and pick up where you left off at
            any time, even on a slow connection.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
