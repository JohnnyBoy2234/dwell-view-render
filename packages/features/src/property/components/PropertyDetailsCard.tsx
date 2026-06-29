import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Property } from '@mzanzihomes/common/types/dashboard';
import { PROPERTY_LABELS } from '@mzanzihomes/common/constants/propertyConstants';

interface PropertyDetailsCardProps {
  property: Property;
}

/**
 * Component for displaying property details summary
 */
export function PropertyDetailsCard({ property }: PropertyDetailsCardProps) {
  return (
    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-ios-gray-dark">
          {PROPERTY_LABELS.PROPERTY_DETAILS}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-ios-gray font-medium">{PROPERTY_LABELS.PROPERTY_TYPE}</p>
            <p className="text-ios-gray-dark">{property.property_type}</p>
          </div>
          <div>
            <p className="text-ios-gray font-medium">{PROPERTY_LABELS.STATUS}</p>
            <Badge className="bg-success-green/10 text-success-green border-0 rounded-ios text-xs">
              {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
            </Badge>
          </div>
          <div>
            <p className="text-ios-gray font-medium">{PROPERTY_LABELS.LOCATION}</p>
            <p className="text-ios-gray-dark">{property.location}</p>
          </div>
          <div>
            <p className="text-ios-gray font-medium">{PROPERTY_LABELS.LISTED}</p>
            <p className="text-ios-gray-dark">{new Date(property.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}