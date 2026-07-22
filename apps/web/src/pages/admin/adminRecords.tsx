import { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, Inbox } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';

export const zar = (v: number | null | undefined) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2 }).format(Number(v) || 0);

export const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const titleCase = (s?: string | null) =>
  (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '—';

const uniq = (arr: (string | null | undefined)[]) =>
  Array.from(new Set(arr.filter(Boolean) as string[]));

/** Fetch property titles + profile display names for a set of ids, as lookup maps. */
export async function buildLookups(propertyIds: (string | null | undefined)[], userIds: (string | null | undefined)[]) {
  const pIds = uniq(propertyIds);
  const uIds = uniq(userIds);
  const [props, profs] = await Promise.all([
    pIds.length ? supabase.from('properties').select('id, title, location').in('id', pIds) : Promise.resolve({ data: [] as any[] }),
    uIds.length ? supabase.from('profiles').select('user_id, display_name').in('user_id', uIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const propMap = new Map<string, { title: string; location?: string }>((props.data ?? []).map((p: any) => [p.id, { title: p.title, location: p.location }]));
  const userMap = new Map<string, string>((profs.data ?? []).map((p: any) => [p.user_id, p.display_name]));
  return { propMap, userMap };
}

/** Generic loader for an admin record table: base rows + an enrich step. */
export function useAdminRecords<T>(
  loader: () => Promise<T[]>,
  deps: any[] = [],
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRows(await loader()); }
    catch (e: any) { setError(e?.message || 'Failed to load records'); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);
  return { rows, loading, error, refresh: load };
}

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  approved: { bg: '#e7f8f0', fg: '#047857' },
  signed: { bg: '#e7f8f0', fg: '#047857' },
  completed: { bg: '#e7f8f0', fg: '#047857' },
  paid: { bg: '#e7f8f0', fg: '#047857' },
  active: { bg: '#e7f8f0', fg: '#047857' },
  pending: { bg: '#fff6e6', fg: '#b45309' },
  submitted: { bg: '#fff6e6', fg: '#b45309' },
  under_review: { bg: '#fff6e6', fg: '#b45309' },
  pending_tenant: { bg: '#fff6e6', fg: '#b45309' },
  pending_landlord: { bg: '#eff4ff', fg: '#1d4ed8' },
  draft: { bg: '#f1f5f9', fg: '#475569' },
  rejected: { bg: '#ffeef2', fg: '#be123c' },
  withdrawn: { bg: '#ffeef2', fg: '#be123c' },
  expired: { bg: '#ffeef2', fg: '#be123c' },
  terminated: { bg: '#f1f5f9', fg: '#64748b' },
};

export function StatusPill({ status }: { status?: string | null }) {
  const key = (status || '').toLowerCase();
  const tone = STATUS_TONE[key] || { bg: '#eff4ff', fg: '#1d4ed8' };
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold capitalize"
      style={{ background: tone.bg, color: tone.fg }}>
      {titleCase(status)}
    </span>
  );
}

interface ShellProps {
  title: string;
  subtitle: string;
  count: number;
  loading: boolean;
  onRefresh: () => void;
  search: string;
  setSearch: (v: string) => void;
  statuses?: string[];
  activeStatus?: string;
  setStatus?: (v: string) => void;
  children: React.ReactNode;
}

export function RecordsShell({
  title, subtitle, count, loading, onRefresh, search, setSearch,
  statuses, activeStatus, setStatus, children,
}: ShellProps) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-[13.5px] text-slate-500">{subtitle} · <span className="font-semibold text-slate-600">{count}</span> records</p>
        </div>
        <button onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 active:scale-95">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13.5px] text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-400"
          />
        </div>
        {statuses && statuses.length > 1 && setStatus ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {statuses.map((s) => {
              const active = activeStatus === s;
              return (
                <button key={s} onClick={() => setStatus(s)}
                  className="rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize transition-colors"
                  style={active
                    ? { background: 'hsl(214,100%,59%)', color: '#fff' }
                    : { background: '#fff', color: '#475569', border: '1px solid #e2e8f0' }}>
                  {s === 'all' ? 'All' : titleCase(s)}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-18px_rgba(16,24,40,0.25)]">
        <div className="overflow-x-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export function EmptyRow({ colSpan, loading }: { colSpan: number; loading: boolean }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center">
        {loading ? (
          <span className="text-[13.5px] text-slate-400">Loading records…</span>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Inbox className="h-7 w-7 text-slate-300" />
            <span className="text-[13.5px] font-medium text-slate-500">No records found</span>
          </div>
        )}
      </td>
    </tr>
  );
}

export const thCls = 'whitespace-nowrap px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-slate-400';
export const tdCls = 'whitespace-nowrap px-4 py-3 text-[13px] text-slate-700';
