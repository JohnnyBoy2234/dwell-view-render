import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mzanzihomes/ui/components/select';
import TileDetailLayout from '@/components/TileDetailLayout';
import { useTenantInventory } from '@/hooks/useTenantInventory';
import {
  CONDITION_ORDER,
  CONDITION_META,
  INVENTORY_TEAL,
  categoryLabel,
  itemMatchesQuery,
  type InventoryCondition,
  type InventoryItem,
} from '@/components/inventory/inventoryModel';
import { InventoryItemCard } from '@/components/inventory/InventoryItemCard';
import {
  InventoryErrorState,
  InventoryNoPropertyState,
  InventorySkeleton,
} from '@/components/inventory/InventoryStates';

type ConditionFilter = 'all' | InventoryCondition;
type SortKey = 'name' | 'condition' | 'updated' | 'category' | 'quantity';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name', label: 'Item name' },
  { value: 'condition', label: 'Condition' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'category', label: 'Category' },
  { value: 'quantity', label: 'Quantity' },
];

const conditionIndex = (c: InventoryCondition) => CONDITION_ORDER.indexOf(c);

function sortItems(items: InventoryItem[], key: SortKey): InventoryItem[] {
  const sorted = [...items];
  switch (key) {
    case 'condition':
      return sorted.sort((a, b) => conditionIndex(a.condition) - conditionIndex(b.condition) || a.name.localeCompare(b.name));
    case 'updated':
      return sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    case 'category':
      return sorted.sort((a, b) => (a.category ?? 'zzz').localeCompare(b.category ?? 'zzz') || a.name.localeCompare(b.name));
    case 'quantity':
      return sorted.sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
    case 'name':
    default:
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export default function TenantInventoryRoom() {
  const { roomName } = useParams<{ roomName: string }>();
  const room = decodeURIComponent(roomName ?? '');
  const { property, propertyLoading, isLoading, isError, refetch, items } = useTenantInventory();

  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState<ConditionFilter>('all');
  const [category, setCategory] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('name');

  const roomItems = useMemo(() => items.filter((i) => i.room === room), [items, room]);

  const categoriesPresent = useMemo(() => {
    const set = new Set<string>();
    for (const i of roomItems) if (i.category) set.add(i.category);
    return [...set];
  }, [roomItems]);

  const visible = useMemo(() => {
    const filtered = roomItems.filter(
      (i) =>
        itemMatchesQuery(i, search) &&
        (condition === 'all' || i.condition === condition) &&
        (category === 'all' || i.category === category),
    );
    return sortItems(filtered, sort);
  }, [roomItems, search, condition, category, sort]);

  const subtitle =
    propertyLoading || isLoading
      ? 'Recorded by your landlord'
      : `${roomItems.length} inventory item${roomItems.length === 1 ? '' : 's'}`;

  let body: React.ReactNode;
  if (propertyLoading || isLoading) {
    body = <InventorySkeleton />;
  } else if (!property) {
    body = <InventoryNoPropertyState />;
  } else if (isError) {
    body = <InventoryErrorState onRetry={() => refetch()} />;
  } else {
    body = (
      <div className="space-y-4 [animation:fadeUp_0.5s_ease-out]">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, brand, serial…"
            aria-label={`Search items in ${room}`}
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-[14px] text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-teal-400 focus:outline-none"
          />
        </div>

        {/* Condition filter chips */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {(['all', ...CONDITION_ORDER] as ConditionFilter[]).map((key) => {
            const active = condition === key;
            const label = key === 'all' ? 'All' : CONDITION_META[key].label;
            return (
              <button
                key={key}
                onClick={() => setCondition(key)}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
                  active ? 'text-white' : 'bg-white text-slate-600 shadow-sm'
                }`}
                style={active ? { background: INVENTORY_TEAL } : undefined}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Category + sort */}
        <div className="flex gap-2">
          {categoriesPresent.length > 0 && (
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-10 flex-1 rounded-full bg-white text-[13px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoriesPresent.map((c) => (
                  <SelectItem key={c} value={c}>
                    {categoryLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-10 flex-1 rounded-full bg-white text-[13px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  Sort: {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Items */}
        {visible.length === 0 ? (
          <div className="rounded-[24px] bg-white p-8 text-center text-[13px] text-slate-500 shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
            No items match your filters.
          </div>
        ) : (
          <div className="space-y-2.5">
            {visible.map((item) => (
              <InventoryItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <TileDetailLayout icon={Box} accent={INVENTORY_TEAL} title={room || 'Room'} subtitle={subtitle}>
      {body}
    </TileDetailLayout>
  );
}
