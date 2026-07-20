import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, CheckCircle2, ClipboardList } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import TileDetailLayout from '@/components/TileDetailLayout';
import { useTenantInventory } from '@/hooks/useTenantInventory';
import { INVENTORY_TEAL, shortDate } from '@/components/inventory/inventoryModel';
import { InventoryHero } from '@/components/inventory/InventoryHero';
import { InventoryStatsRow } from '@/components/inventory/InventoryStatsRow';
import { InventoryPropertyCard } from '@/components/inventory/InventoryPropertyCard';
import { RoomChips } from '@/components/inventory/RoomChips';
import { RecentItemsList } from '@/components/inventory/RecentItemsList';
import {
  InventoryEmptyState,
  InventoryNoPropertyState,
  InventoryErrorState,
  InventorySkeleton,
  OfflineBanner,
} from '@/components/inventory/InventoryStates';

function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** Tenant Inventory overview — a read-only view of the landlord-created
 * property inventory. Condition documentation deliberately lives in the
 * separate Condition Records module. View-only: no add / edit / delete. */
export default function TenantInventory() {
  const { property, propertyLoading, isLoading, isError, refetch, items, approval, lastUpdatedAt } =
    useTenantInventory();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const online = useOnline();
  const [approving, setApproving] = useState(false);
  const roomsRef = useRef<HTMLDivElement>(null);

  const acknowledged = !!(approval && lastUpdatedAt && lastUpdatedAt <= approval.approved_at);

  const acknowledgeInventory = async () => {
    if (!user || !property) return;
    setApproving(true);
    try {
      const { error } = await (supabase.from('inventory_approvals') as any).upsert(
        { property_id: property.id, tenant_id: user.id, approved_at: new Date().toISOString() },
        { onConflict: 'property_id,tenant_id' },
      );
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['tenant-inventory'] });
      toast({ title: 'Inventory acknowledged', description: 'Your landlord can see that you agree with the inventory.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not acknowledge', description: e.message });
    } finally {
      setApproving(false);
    }
  };

  let body: React.ReactNode;
  if (propertyLoading || isLoading) {
    body = <InventorySkeleton />;
  } else if (!property) {
    body = (
      <div className="space-y-5 [animation:fadeUp_0.5s_ease-out]">
        <InventoryHero />
        <InventoryNoPropertyState />
      </div>
    );
  } else if (isError) {
    body = (
      <div className="space-y-5 [animation:fadeUp_0.5s_ease-out]">
        <InventoryHero />
        <InventoryErrorState onRetry={() => refetch()} />
      </div>
    );
  } else if (items.length === 0) {
    body = (
      <div className="space-y-5 [animation:fadeUp_0.5s_ease-out]">
        <InventoryHero />
        <InventoryEmptyState />
      </div>
    );
  } else {
    body = (
      <div className="space-y-5 [animation:fadeUp_0.5s_ease-out]">
        {!online && <OfflineBanner />}

        <InventoryHero onView={() => roomsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />

        <InventoryStatsRow items={items} />

        <InventoryPropertyCard property={property} items={items} lastUpdatedAt={lastUpdatedAt} />

        <div ref={roomsRef} className="scroll-mt-4">
          <RoomChips items={items} />
        </div>

        <RecentItemsList items={items} />

        {/* Tenant acknowledgement — the tenant's confirmation that the recorded
            inventory matches what they found at the property. */}
        {acknowledged ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <p className="text-[13px] text-emerald-800">
              You acknowledged this inventory on {shortDate(approval!.approved_at)}.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-teal-200 bg-teal-50/60 px-4 py-3.5">
            <p className="text-[13px] text-slate-700">
              {approval
                ? 'Your landlord updated the inventory since you acknowledged it. Review the changes and acknowledge again.'
                : 'If everything matches what you found at the property, acknowledge the inventory.'}
            </p>
            <button
              onClick={acknowledgeInventory}
              disabled={approving}
              className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_12px_24px_-10px_rgba(20,179,154,0.8)] active:scale-[0.98] disabled:opacity-70"
              style={{ background: INVENTORY_TEAL }}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {approving ? 'Saving…' : approval ? 'Acknowledge again' : 'I agree — acknowledge inventory'}
            </button>
          </div>
        )}

        {/* Inventory stays separate from the Condition Record / Inspection List. */}
        <Link
          to="/tenant/condition-records"
          className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_16px_34px_-26px_rgba(20,50,90,0.5)] active:scale-[0.99]"
        >
          <ClipboardList className="h-5 w-5 shrink-0 text-teal-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-slate-900">View condition record</p>
            <p className="text-[12px] text-slate-500">Document the condition of the property separately.</p>
          </div>
        </Link>

        <p className="px-1 text-center text-[12px] text-slate-400">
          This inventory is recorded and maintained by your landlord.
        </p>
      </div>
    );
  }

  return (
    <TileDetailLayout icon={Box} accent={INVENTORY_TEAL} title="Inventory" subtitle="Recorded by your landlord">
      {body}
    </TileDetailLayout>
  );
}
