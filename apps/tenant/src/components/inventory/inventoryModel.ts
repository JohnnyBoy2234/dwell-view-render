import type { LucideIcon } from 'lucide-react';
import {
  CheckCircle2, AlertTriangle, XCircle, HelpCircle,
  Sofa, CookingPot, BedDouble, Bath, BookOpen, Car, Trees, Box,
} from 'lucide-react';

/** The Inventory module's teal accent (matches the design-system `teal` tone). */
export const INVENTORY_TEAL = '#14b39a';

export type InventoryCondition = 'good' | 'needs_attention' | 'not_working' | 'unknown';

/** Read-only shape of a landlord-created inventory item as the tenant sees it. */
export interface InventoryItem {
  id: string;
  property_id: string;
  room: string;
  name: string;
  quantity: number;
  description: string | null;
  serial_number: string | null;
  brand_model: string | null;
  note: string | null;
  category: string | null;
  condition: InventoryCondition;
  image_urls: string[] | null;
  created_at: string;
  updated_at: string;
}

export const CONDITION_ORDER: InventoryCondition[] = [
  'good',
  'needs_attention',
  'not_working',
  'unknown',
];

interface ConditionMeta {
  /** Badge / detail label, e.g. "Good condition". */
  label: string;
  /** Legend label used beside the summary chart, e.g. "In good condition". */
  legendLabel: string;
  /** Semantic swatch colour for the chart segment and legend dot. */
  color: string;
  badgeBg: string;
  badgeText: string;
  icon: LucideIcon;
}

export const CONDITION_META: Record<InventoryCondition, ConditionMeta> = {
  good: {
    label: 'Good condition',
    legendLabel: 'In good condition',
    color: '#16a34a',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    icon: CheckCircle2,
  },
  needs_attention: {
    label: 'Needs attention',
    legendLabel: 'Needs attention',
    color: '#f59e0b',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    icon: AlertTriangle,
  },
  not_working: {
    label: 'Not working',
    legendLabel: 'Not working',
    color: '#ef4444',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-600',
    icon: XCircle,
  },
  unknown: {
    label: 'Not recorded',
    legendLabel: 'Not recorded',
    color: '#94a3b8',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-500',
    icon: HelpCircle,
  },
};

/** Coerce any stored/legacy value into a known condition. */
export function normalizeCondition(value: unknown): InventoryCondition {
  return value === 'good' || value === 'needs_attention' || value === 'not_working'
    ? value
    : 'unknown';
}

export const CATEGORY_OPTIONS = [
  { value: 'furniture', label: 'Furniture' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'fixtures', label: 'Fixtures' },
  { value: 'decor', label: 'Decor' },
  { value: 'kitchenware', label: 'Kitchenware' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'other', label: 'Other' },
] as const;

export function categoryLabel(value?: string | null): string | null {
  if (!value) return null;
  return CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? value;
}

// Logical room order for a home, matched loosely against free-text room names.
// Anything unmatched sorts after these, then alphabetically.
const ROOM_ORDER_KEYWORDS: Array<[RegExp, number]> = [
  [/entrance|hall|foyer/i, 0],
  [/living|lounge|tv\b/i, 1],
  [/dining/i, 2],
  [/kitchen/i, 3],
  [/main bed|master/i, 4],
  [/bed/i, 5],
  [/bath|shower|toilet|en.?suite/i, 6],
  [/study|office/i, 7],
  [/garage/i, 8],
  [/garden/i, 9],
  [/outdoor|patio|balcony|yard/i, 10],
];

export function roomSortKey(room: string): number {
  for (const [re, idx] of ROOM_ORDER_KEYWORDS) if (re.test(room)) return idx;
  return 11; // "Other"
}

export interface RoomGroup {
  room: string;
  items: InventoryItem[];
}

/** Group items by room, sorted by the property's logical room order. */
export function groupByRoom(items: InventoryItem[]): RoomGroup[] {
  const map = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const list = map.get(item.room) ?? [];
    list.push(item);
    map.set(item.room, list);
  }
  return [...map.entries()]
    .map(([room, roomItems]) => ({ room, items: roomItems }))
    .sort((a, b) => roomSortKey(a.room) - roomSortKey(b.room) || a.room.localeCompare(b.room));
}

export type ConditionCounts = Record<InventoryCondition, number>;

export function conditionCounts(items: InventoryItem[]): ConditionCounts {
  const counts: ConditionCounts = { good: 0, needs_attention: 0, not_working: 0, unknown: 0 };
  for (const item of items) counts[item.condition]++;
  return counts;
}

/** High-level category buckets for the summary stat row (furniture /
 * appliances / everything else), derived from the items' category. */
export function categoryBuckets(items: InventoryItem[]) {
  let furniture = 0;
  let appliances = 0;
  for (const item of items) {
    if (item.category === 'furniture') furniture++;
    else if (item.category === 'appliances') appliances++;
  }
  return { total: items.length, furniture, appliances, other: items.length - furniture - appliances };
}

// Room-type icon for the "By room" cards, matched loosely against the name.
const ROOM_ICONS: Array<[RegExp, LucideIcon]> = [
  [/living|lounge|tv\b/i, Sofa],
  [/kitchen/i, CookingPot],
  [/bed/i, BedDouble],
  [/bath|shower|toilet|en.?suite/i, Bath],
  [/study|office/i, BookOpen],
  [/garage/i, Car],
  [/garden|outdoor|patio|yard/i, Trees],
];

export function roomIcon(room: string): LucideIcon {
  for (const [re, icon] of ROOM_ICONS) if (re.test(room)) return icon;
  return Box;
}

/** Fields searched by the room screen's search box. */
export function itemMatchesQuery(item: InventoryItem, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return [item.name, item.brand_model, item.serial_number, item.description, item.note, item.room]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(t));
}

export const shortDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
