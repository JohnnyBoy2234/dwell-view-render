import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@mzanzihomes/supabase/client';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Input } from '@mzanzihomes/ui/components/input';
import { Home, Info, Package, Search } from 'lucide-react';

interface InventoryItem {
  id: string;
  room: string;
  name: string;
  quantity: number;
  description: string | null;
  serial_number: string | null;
  brand_model: string | null;
  note: string | null;
  updated_at: string;
}

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Read-only view of the landlord-created property inventory. Condition
 * documentation deliberately lives elsewhere (condition records). */
export default function TenantInventory() {
  const { tenantProperty, loading: propertyLoading } = useTenantDashboard();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [landlordName, setLandlordName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (propertyLoading) return;
    if (!tenantProperty) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [{ data: itemRows, error: itemsError }, { data: property }] = await Promise.all([
          (supabase.from('property_inventory_items') as any)
            .select('id, room, name, quantity, description, serial_number, brand_model, note, updated_at')
            .eq('property_id', tenantProperty.id)
            .order('room')
            .order('name'),
          (supabase.from('properties') as any)
            .select('landlord_id')
            .eq('id', tenantProperty.id)
            .maybeSingle()
        ]);
        if (itemsError) throw itemsError;
        setItems((itemRows ?? []) as InventoryItem[]);
        if (property?.landlord_id) {
          const { data: profile } = await (supabase.from('profiles') as any)
            .select('display_name')
            .eq('user_id', property.landlord_id)
            .maybeSingle();
          setLandlordName(profile?.display_name ?? null);
        }
      } catch (e: any) {
        setError(e.message || 'Could not load the inventory.');
      } finally {
        setLoading(false);
      }
    })();
  }, [propertyLoading, tenantProperty?.id]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [item.name, item.room, item.description, item.brand_model, item.serial_number, item.note]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [items, search]);

  const rooms = useMemo(() => {
    const grouped = new Map<string, InventoryItem[]>();
    for (const item of filteredItems) {
      const list = grouped.get(item.room) ?? [];
      list.push(item);
      grouped.set(item.room, list);
    }
    return [...grouped.entries()];
  }, [filteredItems]);

  const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const lastUpdated = items.length
    ? items.reduce((latest, item) => (item.updated_at > latest ? item.updated_at : latest), items[0].updated_at)
    : null;

  if (propertyLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded"></div>
        <div className="grid gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const infoCard = (
    <Card className="bg-muted/30">
      <CardContent className="pt-6 space-y-4 text-sm">
        <div className="flex gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-semibold">What is the Inventory?</p>
            <p className="text-muted-foreground mt-1">
              The Inventory is a list of furniture and other items belonging to the property. It is
              created and managed by the landlord.
            </p>
          </div>
        </div>
        <div className="border-t pt-4">
          <Link to="/tenant/condition-records" className="font-semibold text-primary underline underline-offset-2">
            View Condition Record
          </Link>
          <p className="text-muted-foreground mt-1">
            To view or document the condition of the property and its items, use the separate
            Condition Record.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Property Inventory</h1>
        <p className="text-muted-foreground">
          View the furniture and items recorded by your landlord for this property.
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-10 text-center text-destructive">{error}</CardContent>
        </Card>
      ) : !tenantProperty ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Home className="h-10 w-10 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
            <p className="font-medium">No property linked yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              The inventory will appear here once you are connected to a property.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Property summary */}
          <Card className="bg-ocean-blue/5 border-ocean-blue/20">
            <CardContent className="pt-6 space-y-1">
              <h2 className="font-semibold text-lg break-words">{tenantProperty.title}</h2>
              <p className="text-sm text-muted-foreground break-words">{tenantProperty.location}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm text-muted-foreground">
                {landlordName && <span>Landlord: {landlordName}</span>}
                {lastUpdated && <span>Last updated: {shortDate(lastUpdated)}</span>}
                <span>{totalItems} item{totalItems === 1 ? '' : 's'} listed</span>
              </div>
            </CardContent>
          </Card>

          {items.length === 0 ? (
            <>
              <Card>
                <CardContent className="py-10 text-center">
                  <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
                  <p className="font-medium">No inventory has been added yet</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    The landlord has not yet added a list of furniture or property items. You do not
                    need to create anything.
                  </p>
                </CardContent>
              </Card>
              {infoCard}
            </>
          ) : (
            <>
              {/* Search */}
              <div className="relative">
                <Search
                  className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items or rooms…"
                  aria-label="Search the inventory"
                  className="pl-9"
                />
              </div>

              {rooms.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No items match your search.
                  </CardContent>
                </Card>
              ) : (
                rooms.map(([room, roomItems]) => (
                  <Card key={room}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between gap-2">
                        <span className="truncate">{room}</span>
                        <Badge variant="secondary" className="shrink-0">
                          {roomItems.length} item{roomItems.length === 1 ? '' : 's'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y">
                      {roomItems.map((item) => (
                        <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium break-words">{item.name}</p>
                            <span className="text-sm text-muted-foreground shrink-0">× {item.quantity}</span>
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-0.5 break-words">{item.description}</p>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                            {item.brand_model && <span>Brand/model: {item.brand_model}</span>}
                            {item.serial_number && <span>Serial: {item.serial_number}</span>}
                          </div>
                          {item.note && (
                            <p className="text-xs text-muted-foreground mt-0.5 break-words">
                              Landlord note: {item.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}
              {infoCard}
            </>
          )}
        </>
      )}
    </div>
  );
}
