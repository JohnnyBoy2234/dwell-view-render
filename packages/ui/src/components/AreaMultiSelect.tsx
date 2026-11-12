import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { MapPin, X, Search } from 'lucide-react';
import { cn } from '@mzanzihomes/common/lib/utils';
import { getAreaPredictions } from '@mzanzihomes/ui/utils/googleMaps';
import { matchSaAreas } from '@mzanzihomes/ui/lib/saAreas';

interface AreaMultiSelectProps {
  areas: string[];
  onChange: (areas: string[]) => void;
  placeholder?: string;
  className?: string;
  /** Called when the user presses Enter with the input empty (e.g. run search). */
  onSubmit?: () => void;
}

/**
 * Property24-style multi-area picker: type an area, pick a Google suggestion (or
 * press Enter to accept free text), and it becomes a removable chip. Search
 * several areas at once; each chip has an X to remove it. Google suggestions
 * come from getAreaPredictions with a static SA-suburb fallback (works with no
 * Maps key) — typed text still works via Enter.
 */
interface Suggestion {
  /** Full string stored as the chip/filter value — unchanged behaviour. */
  value: string;
  /** Area/suburb name — the bold, primary line (Property24-style). */
  primary: string;
  /** City/province context — the smaller, secondary line. */
  secondary?: string;
}

// Static-list entries are "Suburb, City" (or just "City" with no comma) — split
// on the first comma so the dropdown can show the same two-line layout the
// live Google predictions get from structured_formatting.
const splitStaticArea = (full: string): Suggestion => {
  const idx = full.indexOf(',');
  if (idx === -1) return { value: full, primary: full };
  return { value: full, primary: full.slice(0, idx).trim(), secondary: full.slice(idx + 1).trim() };
};

export function AreaMultiSelect({ areas, onChange, placeholder = 'Add an area…', className, onSubmit }: AreaMultiSelectProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  // Drop anything already picked, so the list never shows a dead/duplicate row.
  const dedupe = (list: Suggestion[]) => {
    const chosen = new Set(areas.map((a) => a.toLowerCase()));
    return list.filter((s) => !chosen.has(s.value.toLowerCase()));
  };

  const addArea = (raw: string) => {
    const area = raw.trim();
    if (!area) return;
    const exists = areas.some((a) => a.toLowerCase() === area.toLowerCase());
    if (!exists) onChange([...areas, area]);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    // Keep focus so the tenant can immediately add another area.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const removeArea = (area: string) => onChange(areas.filter((a) => a !== area));

  const runQuery = (value: string) => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    // Show the built-in SA list instantly (works with no Google key, like the
    // web search), then upgrade to live Google predictions if they come back.
    const fallback = dedupe(matchSaAreas(value, 8).map(splitStaticArea));
    setSuggestions(fallback);
    setOpen(fallback.length > 0);
    const mine = ++seq.current;
    getAreaPredictions(value)
      .then((preds) => {
        if (mine !== seq.current) return; // ignore stale
        if (preds.length === 0) return;    // keep the fallback list
        const list = dedupe(
          preds.map((p) => ({ value: p.description, primary: p.mainText, secondary: p.secondaryText }))
        ).slice(0, 8);
        if (list.length === 0) return;
        setSuggestions(list);
        setOpen(true);
      })
      .catch(() => { /* keep the fallback list */ });
  };

  const handleChange = (value: string) => {
    setQuery(value);
    runQuery(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) addArea(query);
      else onSubmit?.();
    } else if (e.key === 'Backspace' && !query && areas.length > 0) {
      removeArea(areas[areas.length - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Close the suggestions on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    // z-30 while open lifts the whole control (and its dropdown) above sibling
    // rows like the filter bar, which otherwise paint over the suggestions.
    <div ref={wrapRef} className={cn('relative w-full', open && 'z-30', className)}>
      <div className="flex min-h-[36px] flex-wrap items-center gap-1.5">
        <Search className="h-[18px] w-[18px] shrink-0 text-slate-400" />
        {areas.map((area) => (
          <span
            key={area}
            className="inline-flex items-center gap-1 rounded-full bg-ocean-blue/10 py-[3px] pl-2.5 pr-1 text-[12.5px] font-semibold leading-none text-ocean-blue"
          >
            {area}
            <button
              type="button"
              aria-label={`Remove ${area}`}
              onClick={() => removeArea(area)}
              className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-ocean-blue/60 transition hover:bg-ocean-blue/20 hover:text-ocean-blue"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => runQuery(query)}
          placeholder={areas.length === 0 ? placeholder : 'Add another…'}
          className="min-w-[90px] flex-1 bg-transparent text-[15px] text-slate-800 outline-none placeholder:text-slate-400"
          autoComplete="off"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[300] max-h-[320px] overflow-y-auto overscroll-contain rounded-xl border border-slate-100 bg-white py-1 shadow-[0_12px_36px_-8px_rgba(20,50,90,0.28)]">
          {suggestions.map((s) => (
            <button
              key={s.value}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addArea(s.value); }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-ocean-blue/[0.07]"
            >
              <MapPin className="h-[18px] w-[18px] shrink-0 text-slate-400" />
              <span className="min-w-0">
                <span className="block truncate text-[17px] font-semibold leading-tight text-slate-800">{s.primary}</span>
                {s.secondary && (
                  <span className="block truncate text-[13px] leading-tight text-slate-500">{s.secondary}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
