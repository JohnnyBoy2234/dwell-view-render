import { useNavigate } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { InventoryConditionBadge } from './InventoryConditionBadge';
import { categoryLabel, type InventoryItem } from './inventoryModel';

/**
 * Compact, tappable inventory item card for the room screen: thumbnail (or
 * fallback icon), name, room · category, optional quantity and brand/model, a
 * condition badge and a chevron into the read-only detail screen.
 */
export function InventoryItemCard({ item }: { item: InventoryItem }) {
  const navigate = useNavigate();
  const thumb = item.image_urls?.[0];
  const category = categoryLabel(item.category);

  return (
    <button
      onClick={() => navigate(`/tenant/inventory/item/${item.id}`)}
      className="flex w-full items-center gap-3 rounded-[20px] bg-white p-3 text-left shadow-[0_16px_34px_-26px_rgba(20,50,90,0.5)] transition active:scale-[0.99]"
    >
      {thumb ? (
        <img
          src={thumb}
          alt=""
          loading="lazy"
          className="h-14 w-14 shrink-0 rounded-2xl border border-slate-100 object-cover"
        />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50">
          <Package className="h-6 w-6 text-teal-500" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-bold text-slate-900">{item.name}</p>
        <p className="truncate text-[12.5px] text-slate-500">
          {item.room}
          {category ? ` · ${category}` : ''}
          {item.quantity > 1 ? ` · ×${item.quantity}` : ''}
        </p>
        <div className="mt-1.5">
          <InventoryConditionBadge condition={item.condition} />
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
    </button>
  );
}
