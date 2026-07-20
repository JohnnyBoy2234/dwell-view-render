import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Check, AlertTriangle, X, Minus, Package } from 'lucide-react';
import { CONDITION_META, type InventoryCondition, type InventoryItem } from './inventoryModel';

const MARK: Record<InventoryCondition, typeof Check> = {
  good: Check,
  needs_attention: AlertTriangle,
  not_working: X,
  unknown: Minus,
};

/** The most recently updated items, with a photo, room and condition. */
export function RecentItemsList({ items, limit = 4 }: { items: InventoryItem[]; limit?: number }) {
  const navigate = useNavigate();
  const recent = useMemo(
    () => [...items].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, limit),
    [items, limit],
  );

  return (
    <section>
      <h3 className="mb-3 text-[16px] font-extrabold tracking-tight text-slate-900">Recent items</h3>
      <div className="space-y-2.5">
        {recent.map((item) => {
          const meta = CONDITION_META[item.condition];
          const Mark = MARK[item.condition];
          const thumb = item.image_urls?.[0];
          return (
            <button
              key={item.id}
              onClick={() => navigate(`/tenant/inventory/item/${item.id}`)}
              className="flex w-full items-center gap-3 rounded-[20px] bg-white p-3 text-left shadow-[0_16px_34px_-26px_rgba(20,50,90,0.5)] transition active:scale-[0.99]"
            >
              {thumb ? (
                <img src={thumb} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50">
                  <Package className="h-6 w-6 text-teal-500" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-bold text-slate-900">{item.name}</p>
                <p className="truncate text-[12.5px] text-slate-500">{item.room}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: meta.color }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                  {meta.label}
                </p>
              </div>
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{ background: meta.color }}
                aria-hidden="true"
              >
                <Mark className="h-3.5 w-3.5 text-white" strokeWidth={3} />
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
