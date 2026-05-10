import { useMemo } from 'react';
import InventoryStartPanel from '@/components/property/InventoryStartPanel';

export default function InventoryStart() {
  const propertyId = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('propertyId') || undefined;
    } catch {
      return undefined;
    }
  }, []);

  return (
    <div className="p-4">
      <InventoryStartPanel propertyId={propertyId} />
    </div>
  );
}


