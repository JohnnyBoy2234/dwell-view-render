import { Box, Sofa, Monitor, Sprout } from 'lucide-react';
import { categoryBuckets, INVENTORY_TEAL, type InventoryItem } from './inventoryModel';

/** Four-up summary derived from real items: total + furniture / appliances /
 * other category buckets. */
export function InventoryStatsRow({ items }: { items: InventoryItem[] }) {
  const b = categoryBuckets(items);
  const stats = [
    { icon: Box, value: b.total, label: 'Total items' },
    { icon: Sofa, value: b.furniture, label: 'Furniture' },
    { icon: Monitor, value: b.appliances, label: 'Appliances' },
    { icon: Sprout, value: b.other, label: 'Other' },
  ];
  return (
    <div className="grid grid-cols-4 rounded-[24px] bg-white py-4 shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`flex flex-col items-center gap-1.5 px-1 ${i > 0 ? 'border-l border-slate-100' : ''}`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50">
            <s.icon className="h-[18px] w-[18px]" style={{ color: INVENTORY_TEAL }} aria-hidden="true" />
          </span>
          <span className="text-[19px] font-extrabold leading-none text-slate-900">{s.value}</span>
          <span className="text-[11.5px] text-slate-500">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
