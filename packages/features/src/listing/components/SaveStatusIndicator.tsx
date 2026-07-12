import * as React from 'react';
import { Check, CloudOff, Loader2 } from 'lucide-react';
import type { SaveState } from '../hooks/useListingDraft';

interface Props {
  state: SaveState;
  lastSavedAt: number | null;
}

// Subtle autosave status shown beside the wizard title.
export function SaveStatusIndicator({ state, lastSavedAt }: Props) {
  const [, setTick] = React.useState(0);
  // Re-render every 5s so "Saved just now" ages into "Draft saved".
  React.useEffect(() => {
    if (!lastSavedAt) return;
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  if (state === 'idle' && !lastSavedAt) return null;

  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
        <CloudOff className="h-3.5 w-3.5" /> Couldn't save — retrying
      </span>
    );
  }
  const justNow = lastSavedAt && Date.now() - lastSavedAt < 10_000;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Check className="h-3.5 w-3.5 text-green-600" />
      {justNow ? 'Saved just now' : 'Draft saved'}
    </span>
  );
}
