import { Bed, Bath, Car } from "lucide-react";
import { PROPERTY_CARD_STYLES, PROPERTY_CARD_LABELS } from '@/constants/propertyCardConstants';

interface PropertyFeaturesProps {
  beds: number;
  baths: number;
  parking: number;
}

/**
 * Property features component displaying beds, baths, and parking
 * Used in property cards to show key property specifications
 */
export function PropertyFeatures({ beds, baths, parking }: PropertyFeaturesProps) {
  const features = [
    { icon: Bed, value: beds, label: PROPERTY_CARD_LABELS.BEDS },
    { icon: Bath, value: baths, label: PROPERTY_CARD_LABELS.BATHS },
    { icon: Car, value: parking, label: PROPERTY_CARD_LABELS.PARKING },
  ];

  return (
    <div className={PROPERTY_CARD_STYLES.FEATURES_CONTAINER}>
      {features.map(({ icon: Icon, value, label }) => (
        <div 
          key={label} 
          className={PROPERTY_CARD_STYLES.FEATURE_ITEM}
        >
          <Icon 
            className={PROPERTY_CARD_STYLES.FEATURE_ICON}
            aria-hidden="true"
          />
          <span>{value} {label}</span>
        </div>
      ))}
    </div>
  );
}