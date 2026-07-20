import type { ReactNode } from 'react';
import { Camera, Home, RefreshCw } from 'lucide-react';

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
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">{icon}</div>
      <p className="mt-4 text-[16px] font-bold text-slate-900">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-slate-500">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function InspectionEmptyState() {
  return (
    <StateCard
      icon={<Camera className="h-8 w-8 text-red-400" aria-hidden="true" />}
      title="No inspections yet"
      description="Move-in and move-out inspections will appear here when they are created for your property."
    />
  );
}

export function InspectionNoPropertyState() {
  return (
    <StateCard
      icon={<Home className="h-8 w-8 text-red-400" aria-hidden="true" />}
      title="No property linked yet"
      description="The Inspection List will appear here once you are connected to a rental property."
    />
  );
}

export function InspectionErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <StateCard
      icon={<Camera className="h-8 w-8 text-red-400" aria-hidden="true" />}
      title="We couldn't load your inspections"
      description={message || 'Something went wrong. Please try again.'}
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

export function InspectionSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-48 animate-pulse rounded-[24px] bg-white/70" />
      <div className="h-7 w-32 animate-pulse rounded-full bg-white/70" />
      <div className="h-56 animate-pulse rounded-[24px] bg-white/70" />
    </div>
  );
}
