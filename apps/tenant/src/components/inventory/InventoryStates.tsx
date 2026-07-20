import type { ReactNode } from 'react';
import { Box, Home, PackageOpen, RefreshCw, WifiOff } from 'lucide-react';

function StateCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[24px] bg-white p-8 text-center shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">{icon}</div>
      <p className="mt-4 text-[16px] font-bold text-slate-900">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-slate-500">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/** Linked to a property, but the landlord has not created any inventory. */
export function InventoryEmptyState() {
  return (
    <StateCard
      icon={<Box className="h-8 w-8 text-teal-500" aria-hidden="true" />}
      title="No inventory recorded yet"
      description="Your landlord's inventory will appear here once items have been added to this property."
    />
  );
}

/** The tenant is not connected to any property yet. */
export function InventoryNoPropertyState() {
  return (
    <StateCard
      icon={<Home className="h-8 w-8 text-teal-500" aria-hidden="true" />}
      title="No property linked yet"
      description="The inventory will appear here once you are connected to a rental property."
    />
  );
}

export function InventoryErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <StateCard
      icon={<PackageOpen className="h-8 w-8 text-teal-500" aria-hidden="true" />}
      title="We couldn't load the inventory"
      description="Something went wrong while fetching this property's inventory. Please try again."
    >
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-[13px] font-bold text-white active:scale-[0.98]"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </button>
      )}
    </StateCard>
  );
}

/** Item detail could not be found (e.g. a stale deep link). */
export function InventoryItemNotFound({ onBack }: { onBack: () => void }) {
  return (
    <StateCard
      icon={<PackageOpen className="h-8 w-8 text-teal-500" aria-hidden="true" />}
      title="Item not found"
      description="This inventory item may have been removed by your landlord."
    >
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-[13px] font-bold text-white active:scale-[0.98]"
      >
        Back to inventory
      </button>
    </StateCard>
  );
}

export function OfflineBanner() {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
      <WifiOff className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
      <span>Viewing saved inventory — it may not be current.</span>
    </div>
  );
}

export function InventorySkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-44 animate-pulse rounded-[24px] bg-white/70" />
      <div className="h-8 w-32 animate-pulse rounded-full bg-white/70" />
      <div className="h-64 animate-pulse rounded-[24px] bg-white/70" />
    </div>
  );
}
