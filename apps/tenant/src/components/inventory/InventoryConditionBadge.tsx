import { CONDITION_META, type InventoryCondition } from './inventoryModel';

/**
 * Semantic condition badge. Always pairs the colour with an icon and text
 * label, so status never relies on colour alone.
 */
export function InventoryConditionBadge({ condition }: { condition: InventoryCondition }) {
  const meta = CONDITION_META[condition];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${meta.badgeBg} ${meta.badgeText}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
