import { useQuery } from '@tanstack/react-query';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { normalizeCondition, type InventoryItem } from '@/components/inventory/inventoryModel';

interface InventoryApproval {
  approved_at: string;
}

interface TenantInventoryData {
  items: InventoryItem[];
  landlordName: string | null;
  approval: InventoryApproval | null;
}

const ITEM_COLUMNS =
  'id, property_id, room, name, quantity, description, serial_number, brand_model, note, category, condition, image_urls, created_at, updated_at';

/**
 * Loads the read-only property inventory for the tenant's linked property:
 * items (with condition + category), the landlord's name, and the tenant's
 * acknowledgement row. Cached via React Query so the overview, room and item
 * screens share one fetch.
 */
export function useTenantInventory() {
  const { tenantProperty, loading: propertyLoading } = useTenantDashboard();
  const { user } = useAuth();
  const propertyId = tenantProperty?.id;

  const query = useQuery<TenantInventoryData>({
    queryKey: ['tenant-inventory', propertyId, user?.id],
    enabled: !!propertyId,
    queryFn: async () => {
      const [itemsRes, propertyRes, approvalRes] = await Promise.all([
        (supabase.from('property_inventory_items') as any)
          .select(ITEM_COLUMNS)
          .eq('property_id', propertyId)
          .order('room')
          .order('name'),
        (supabase.from('properties') as any)
          .select('landlord_id')
          .eq('id', propertyId)
          .maybeSingle(),
        user
          ? (supabase.from('inventory_approvals') as any)
              .select('approved_at')
              .eq('property_id', propertyId)
              .eq('tenant_id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (itemsRes.error) throw itemsRes.error;

      const items: InventoryItem[] = ((itemsRes.data ?? []) as any[]).map((row) => ({
        ...row,
        quantity: row.quantity ?? 1,
        image_urls: row.image_urls ?? [],
        category: row.category ?? null,
        condition: normalizeCondition(row.condition),
      }));

      let landlordName: string | null = null;
      if (propertyRes.data?.landlord_id) {
        const { data: profile } = await (supabase.from('profiles') as any)
          .select('display_name')
          .eq('user_id', propertyRes.data.landlord_id)
          .maybeSingle();
        landlordName = profile?.display_name ?? null;
      }

      return {
        items,
        landlordName,
        approval: (approvalRes.data as InventoryApproval | null) ?? null,
      };
    },
  });

  const lastUpdatedAt = (() => {
    const items = query.data?.items ?? [];
    if (!items.length) return null;
    return items.reduce((latest, item) => (item.updated_at > latest ? item.updated_at : latest), items[0].updated_at);
  })();

  return {
    property: tenantProperty,
    propertyLoading,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    items: query.data?.items ?? [],
    landlordName: query.data?.landlordName ?? null,
    approval: query.data?.approval ?? null,
    lastUpdatedAt,
  };
}
