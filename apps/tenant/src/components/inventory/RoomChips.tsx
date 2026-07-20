import { useNavigate } from 'react-router-dom';
import { groupByRoom, roomIcon, INVENTORY_TEAL, type InventoryItem } from './inventoryModel';

/** Horizontal "By room" cards, each with a room-type icon, name and item
 * count. Tapping opens the room's filtered inventory. */
export function RoomChips({ items }: { items: InventoryItem[] }) {
  const navigate = useNavigate();
  const rooms = groupByRoom(items);

  return (
    <section>
      <h3 className="mb-3 text-[16px] font-extrabold tracking-tight text-slate-900">By room</h3>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {rooms.map((group) => {
          const Icon = roomIcon(group.room);
          return (
            <button
              key={group.room}
              onClick={() => navigate(`/tenant/inventory/room/${encodeURIComponent(group.room)}`)}
              className="flex w-[108px] shrink-0 flex-col items-center gap-2 rounded-[20px] border border-teal-100 bg-teal-50/40 px-3 py-4 transition active:scale-[0.97]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Icon className="h-6 w-6" style={{ color: INVENTORY_TEAL }} aria-hidden="true" />
              </span>
              <span className="w-full truncate text-center text-[13px] font-bold text-slate-900">{group.room}</span>
              <span className="text-[11.5px] text-slate-500">
                {group.items.length} item{group.items.length === 1 ? '' : 's'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
