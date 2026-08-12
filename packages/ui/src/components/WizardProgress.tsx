import * as React from 'react';

export interface WizardProgressStep {
  title: string;
}

interface WizardProgressProps {
  /** Step titles (strings) or objects with a `title`. */
  steps: Array<string | WizardProgressStep>;
  /** Current step index (0-based). */
  current: number;
  /** Accent colour for completed/active segments. Defaults to the lease violet. */
  accent?: string;
  /** Colour for upcoming segments. */
  track?: string;
  className?: string;
}

/**
 * Shared wizard step indicator using the lease wizard's segmented-bar style:
 * a "Step X of Y — Title" line above a row of equal-width bars that fill up to
 * (and including) the current step. Reused by the lease wizard and the rental
 * application flow so both show progress the same way.
 */
export function WizardProgress({
  steps,
  current,
  accent = '#7c3aed',
  track = '#e5e7eb',
  className,
}: WizardProgressProps) {
  const titles = steps.map((s) => (typeof s === 'string' ? s : s.title));
  const total = titles.length;
  const safeCurrent = Math.max(0, Math.min(current, total - 1));

  return (
    <div className={className} role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={safeCurrent + 1}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Step {safeCurrent + 1} of {total}
        </p>
        <p className="text-sm font-medium truncate">{titles[safeCurrent]}</p>
      </div>
      <div className="mt-2 flex gap-1.5">
        {titles.map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ background: i <= safeCurrent ? accent : track }}
          />
        ))}
      </div>
    </div>
  );
}
