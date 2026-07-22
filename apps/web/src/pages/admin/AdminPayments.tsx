import { useMemo, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import {
  RecordsShell, StatusPill, EmptyRow, useAdminRecords, buildLookups,
  fmtDate, zar, thCls, tdCls,
} from './adminRecords';

interface TxRow {
  id: string;
  type: string | null;
  amount: number | null;
  created_at: string;
  payer: string;
  property: string;
}

async function loadPayments(): Promise<TxRow[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_id, property_id, type, amount, created_at')
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw error;
  const rows = data ?? [];
  const { propMap, userMap } = await buildLookups(
    rows.map((r: any) => r.property_id),
    rows.map((r: any) => r.user_id),
  );
  return rows.map((r: any) => ({
    id: r.id,
    type: r.type,
    amount: r.amount,
    created_at: r.created_at,
    payer: userMap.get(r.user_id) || '—',
    property: propMap.get(r.property_id)?.title || '—',
  }));
}

export default function AdminPayments() {
  const { rows, loading, refresh } = useAdminRecords<TxRow>(loadPayments);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');

  const types = useMemo(
    () => ['all', ...Array.from(new Set(rows.map((r) => (r.type || '').toLowerCase()).filter(Boolean)))],
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (type !== 'all' && (r.type || '').toLowerCase() !== type) return false;
      if (!q) return true;
      return [r.payer, r.property, r.type, String(r.amount)].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [rows, search, type]);

  const total = useMemo(() => filtered.reduce((s, r) => s + (Number(r.amount) || 0), 0), [filtered]);

  return (
    <RecordsShell
      title="Payments" subtitle={`Every transaction · ${zar(total)} total`}
      count={filtered.length} loading={loading} onRefresh={refresh}
      search={search} setSearch={setSearch}
      statuses={types} activeStatus={type} setStatus={setType}
    >
      <table className="w-full border-collapse">
        <thead className="border-b border-slate-100 bg-slate-50/60">
          <tr>
            <th className={thCls}>Amount</th>
            <th className={thCls}>Type</th>
            <th className={thCls}>Payer</th>
            <th className={thCls}>Property</th>
            <th className={thCls}>Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <EmptyRow colSpan={5} loading={loading} />
          ) : (
            filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className={`${tdCls} font-bold text-slate-900`}>{zar(r.amount)}</td>
                <td className={tdCls}><StatusPill status={r.type} /></td>
                <td className={tdCls}>{r.payer}</td>
                <td className={tdCls}>{r.property}</td>
                <td className={`${tdCls} text-slate-400`}>{fmtDate(r.created_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </RecordsShell>
  );
}
