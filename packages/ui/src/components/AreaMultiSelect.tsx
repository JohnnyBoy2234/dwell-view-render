import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';
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
 * come from getAreaPredictions with a static-free fallback (empty list) when
 * Maps is unavailable — typed text still works via Enter.
 */
export function AreaMultiSelect({ areas, onChange, placeholder = 'Add an area…', className, onSubmit }: AreaMultiSelectProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  const addArea = (raw: string) => {
    const area = raw.trim();
    if (!area) return;
    const exists = areas.some((a) => a.toLowerCase() === area.toLowerCase());
    if (!exists) onChange([...areas, area]);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  };

  const removeArea = (area: string) => onChange(areas.filter((a) => a !== area));

  const handleChange = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    // Show the built-in SA list instantly (works with no Google key, like the
    // web search), then upgrade to live Google predictions if they come back.
    const fallback = matchSaAreas(value);
    setSuggestions(fallback);
    setOpen(fallback.length > 0);
    const mine = ++seq.current;
    getAreaPredictions(value)
      .then((preds) => {
        if (mine !== seq.current) return; // ignore stale
        if (preds.length === 0) return;    // keep the fallback list
        const list = preds.map((p) => p.description).slice(0, 6);
        setSuggestions(list);
        setOpen(true);
      })
      .catch(() => { /* keep the fallback list */ });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) addArea(query);
      else onSubmit?.();
    } else if (e.key === 'Backspace' && !query && areas.length > 0) {
      removeArea(areas[areas.length - 1]);
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
    <div ref={wrapRef} className={cn('relative w-full', className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <MapPin className="h-4 w-4 shrink-0 text-ocean-blue" />
        {areas.map((area) => (
          <span
            key={area}
            className="inline-flex items-center gap-1 rounded-full bg-ocean-blue/10 pl-2.5 pr-1 py-1 text-xs font-medium text-ocean-blue"
          >
            {area}
            <button
              type="button"
              aria-label={`Remove ${area}`}
              onClick={() => removeArea(area)}
              className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-ocean-blue/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder={areas.length === 0 ? placeholder : 'Add another area…'}
          className="min-w-[120px] flex-1 bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-400"
          autoComplete="off"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[200] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_16px_48px_rgba(37,99,235,0.14)]">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addArea(s); }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-ocean-blue/6"
            >
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
