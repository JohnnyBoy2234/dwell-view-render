import { MapPin, CalendarDays, Package, DoorOpen, Home } from 'lucide-react';
import { groupByRoom, shortDate, INVENTORY_TEAL, type InventoryItem } from './inventoryModel';

interface Property {
  title: string;
  location: string;
  images: string[];
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0" style={{ color: INVENTORY_TEAL }} aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-[10.5px] text-slate-400">{label}</p>
        <p className="truncate text-[12.5px] font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

/**
 * Property context card. The mockup's temperature/humidity are sensor data the
 * app doesn't have, so this shows real inventory facts instead: last updated,
 * item count and room count.
 */
export function InventoryPropertyCard({
  property,
  items,
  lastUpdatedAt,
}: {
  property: Property;
  items: InventoryItem[];
  lastUpdatedAt: string | null;
}) {
  const thumb = property.images?.[0];
  const roomCount = groupByRoom(items).length;

  return (
    <div className="rounded-[24px] bg-white p-3 shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
      <div className="flex items-center gap-3">
        {thumb ? (
          <img src={thumb} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-50">
            <Home className="h-7 w-7 text-teal-500" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-extrabold text-slate-900">{property.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{property.location}</span>
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3">
        <Fact icon={CalendarDays} label="Last updated" value={lastUpdatedAt ? shortDate(lastUpdatedAt) : '—'} />
        <Fact icon={Package} label="Items" value={items.length} />
        <Fact icon={DoorOpen} label="Rooms" value={roomCount} />
      </div>
    </div>
  );
}
