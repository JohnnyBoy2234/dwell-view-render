import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Info, Package } from 'lucide-react';
import TileDetailLayout from '@/components/TileDetailLayout';
import { useTenantInventory } from '@/hooks/useTenantInventory';
import {
  INVENTORY_TEAL,
  categoryLabel,
  shortDate,
  type InventoryItem,
} from '@/components/inventory/inventoryModel';
import { InventoryConditionBadge } from '@/components/inventory/InventoryConditionBadge';
import {
  InventoryErrorState,
  InventoryItemNotFound,
  InventoryNoPropertyState,
  InventorySkeleton,
} from '@/components/inventory/InventoryStates';

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-[13px] text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right text-[13.5px] font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function ItemDetails({ item }: { item: InventoryItem }) {
  const images = item.image_urls ?? [];
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-4 [animation:fadeUp_0.5s_ease-out]">
      {/* Main photo */}
      {images.length > 0 ? (
        <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
          <img
            src={images[active]}
            alt={item.name}
            className="aspect-[4/3] w-full object-cover [animation:fadeUp_0.35s_ease-out]"
          />
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {images.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setActive(i)}
                  aria-label={`View photo ${i + 1}`}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    i === active ? 'border-teal-400' : 'border-transparent opacity-70'
                  }`}
                >
                  <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-[24px] bg-teal-50">
          <Package className="h-12 w-12 text-teal-400" aria-hidden="true" />
        </div>
      )}

      {/* Title + condition */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[20px] font-extrabold leading-tight text-slate-900">{item.name}</h2>
          {item.quantity > 1 && (
            <span className="shrink-0 text-[13px] font-semibold text-slate-500">×{item.quantity}</span>
          )}
        </div>
        <div className="mt-2">
          <InventoryConditionBadge condition={item.condition} />
        </div>
      </div>

      {/* Facts */}
      <dl className="divide-y divide-slate-100 rounded-[24px] bg-white px-4 shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
        <DetailRow label="Room" value={item.room} />
        <DetailRow label="Category" value={categoryLabel(item.category)} />
        <DetailRow label="Quantity" value={item.quantity} />
        <DetailRow label="Brand / model" value={item.brand_model} />
        <DetailRow label="Serial number" value={item.serial_number} />
        <DetailRow label="Recorded" value={shortDate(item.created_at)} />
        <DetailRow label="Last updated" value={shortDate(item.updated_at)} />
      </dl>

      {/* Description */}
      {item.description && (
        <div className="rounded-[24px] bg-white p-4 shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
          <p className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Description</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-700">{item.description}</p>
        </div>
      )}

      {/* Landlord notes */}
      {item.note && (
        <div className="rounded-[24px] bg-white p-4 shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
          <p className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Landlord notes</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-700">{item.note}</p>
        </div>
      )}

      {/* Read-only notice */}
      <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <p className="text-[12.5px] leading-relaxed text-slate-500">
          This inventory is recorded and maintained by your landlord.
        </p>
      </div>
    </div>
  );
}

export default function TenantInventoryItem() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { property, propertyLoading, isLoading, isError, refetch, items } = useTenantInventory();

  const item = useMemo(() => items.find((i) => i.id === itemId) ?? null, [items, itemId]);

  let body: React.ReactNode;
  if (propertyLoading || isLoading) {
    body = <InventorySkeleton />;
  } else if (!property) {
    body = <InventoryNoPropertyState />;
  } else if (isError) {
    body = <InventoryErrorState onRetry={() => refetch()} />;
  } else if (!item) {
    body = <InventoryItemNotFound onBack={() => navigate('/tenant/inventory')} />;
  } else {
    body = <ItemDetails item={item} />;
  }

  return (
    <TileDetailLayout icon={Box} accent={INVENTORY_TEAL} title="Inventory item" subtitle="Recorded by your landlord">
      {body}
    </TileDetailLayout>
  );
}
