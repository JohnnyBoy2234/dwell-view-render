import { Eye } from 'lucide-react';
import furnitureUrl from '@/assets/inventory-furniture.png';
import { INVENTORY_TEAL } from './inventoryModel';

/** Faint teal house silhouettes behind the hero furniture (2–4% opacity). */
function HouseWatermarks() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 320 160"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <g fill={INVENTORY_TEAL} opacity="0.05">
        <path d="M196 120 V70 L226 46 L256 70 V120 Z" />
        <path d="M188 74 L226 44 L264 74 Z" />
        <path d="M244 120 V80 L270 60 L296 80 V120 Z" />
        <path d="M238 84 L270 58 L302 84 Z" />
      </g>
    </svg>
  );
}

/**
 * Inventory hero: soft-teal card with a 3D furniture illustration and a
 * "View inventory" action. Always rendered so the page reads as designed in
 * every state.
 */
export function InventoryHero({ onView }: { onView?: () => void }) {
  return (
    <div
      className="relative min-h-[184px] overflow-hidden rounded-[24px] p-5 shadow-[0_18px_38px_-26px_rgba(13,148,136,0.5)]"
      style={{ background: 'linear-gradient(135deg, #e6f6f2 0%, #d3eee8 100%)' }}
    >
      <HouseWatermarks />
      {/* Vertical centering via top/bottom + my-auto (not translate) so the
          soft-float animation's transform doesn't clobber the centering. */}
      <img
        src={furnitureUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute bottom-0 right-2 top-0 my-auto h-[160px] w-auto animate-soft-float"
      />
      <div className="relative z-10 max-w-[52%]">
        <h2 className="text-[21px] font-extrabold leading-tight text-slate-900">Property inventory</h2>
        <p className="mt-1.5 text-[13px] leading-snug text-slate-600">
          All items and appliances recorded for your rental.
        </p>
        {onView && (
          <button
            onClick={onView}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[13.5px] font-bold text-white shadow-[0_12px_24px_-10px_rgba(20,179,154,0.85)] transition-transform active:scale-[0.97]"
            style={{ background: INVENTORY_TEAL }}
          >
            <Eye className="h-4 w-4" aria-hidden="true" /> View inventory
          </button>
        )}
      </div>
    </div>
  );
}
