import { Bed, Bath, Car, Ruler } from "lucide-react";
import { PROPERTY_CARD_STYLES, PROPERTY_CARD_LABELS } from '@mzanzihomes/common/constants/propertyCardConstants';

interface PropertyFeaturesProps {
  beds: number;
  baths: number;
  parking: number;
  size?: string | number;
}

/**
 * Property features component displaying beds, baths, parking, and size
 * Used in property cards to show key property specifications in a compact layout
 */
export function PropertyFeatures({ beds, baths, parking, size }: PropertyFeaturesProps) {
  const features = [
    { icon: Bed, value: beds, label: PROPERTY_CARD_LABELS.BEDS },
    { icon: Bath, value: baths, label: PROPERTY_CARD_LABELS.BATHS },
    { icon: Car, value: parking, label: PROPERTY_CARD_LABELS.PARKING },
    ...(size ? [{ icon: Ruler, value: size, label: 'm²' }] : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
      {features.map(({ icon: Icon, value, label }, index) => (
        <div key={`${label}-${index}`} className="flex items-center">
          <Icon className="h-3.5 w-3.5 mr-1 text-ocean-blue" />
          <span className="text-xs font-medium">{value} {label}</span>
          {index < features.length - 1 && (
            <span className="mx-1.5 text-muted-foreground/40">•</span>
          )}
        </div>
      ))}
    </div>
  );
}