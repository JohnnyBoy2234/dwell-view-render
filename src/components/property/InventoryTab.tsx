import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface InventoryTabProps {
  propertyId: string;
}

export function InventoryTab({ propertyId }: InventoryTabProps) {
  // The propertyId will be used when inventory data is connected to the database
  return (
    <Card className="bg-gradient-to-br from-white to-earth-light/40 border border-ocean-blue/20 shadow-medium rounded-2xl">
      <CardContent className="p-6 flex flex-col min-h-[200px]">
        <h2 className="text-xl font-bold text-center">Inventory</h2>
        <p className="text-center text-muted-foreground mt-2">No items have been added yet.</p>
        <div className="flex-1" />
        <div className="flex justify-end">
          <Button>Add Item</Button>
        </div>
      </CardContent>
    </Card>
  );
}
