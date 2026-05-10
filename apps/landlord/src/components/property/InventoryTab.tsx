import { InventoryStartPanel } from './InventoryStartPanel';

interface InventoryTabProps {
  propertyId: string;
}

export function InventoryTab({ propertyId }: InventoryTabProps) {
  return <InventoryStartPanel propertyId={propertyId} />;
}
