import { useMemo, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import {
  RecordsShell, EmptyRow, useAdminRecords, buildLookups,
  fmtDate, titleCase, thCls, tdCls,
} from './adminRecords';

interface ConsentRow {
  id: string;
  consent_type: string;
  subject_type: string;
  subject_id: string;
  consented: boolean;
  consent_version: string;
  created_at: string;
  user: string;
  counterparty: string;
}

async function loadConsents(): Promise<ConsentRow[]> {
  const { data, error } = await (supabase.from('consents') as any)
    .select('id, user_id, counterparty_id, consent_type, subject_type, subject_id, consented, consent_version, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  const rows = data ?? [];
  const { userMap } = await buildLookups([], rows.flatMap((r: any) => [r.user_id, r.counterparty_id]));
  return rows.map((r: any) => ({
    id: r.id,
    consent_type: r.consent_type,
    subject_type: r.subject_type,
    subject_id: r.subject_id,
    consented: r.consented,
    consent_version: r.consent_version,
    created_at: r.created_at,
    user: userMap.get(r.user_id) || '—',
    counterparty: userMap.get(r.counterparty_id) || '—',
  }));
}

export default function AdminConsents() {
  const { rows, loading, refresh } = useAdminRecords<ConsentRow>(loadConsents);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');

  const types = useMemo(
    () => ['all', ...Array.from(new Set(rows.map((r) => r.consent_type)))],
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (type !== 'all' && r.consent_type !== type) return false;
      if (!q) return true;
      return [r.consent_type, r.subject_type, r.user, r.counterparty, r.consent_version]
        .some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [rows, search, type]);

  return (
    <RecordsShell
      title="Consents" subtitle="Every recorded consent event"
      count={filtered.length} loading={loading} onRefresh={refresh}
      search={search} setSearch={setSearch}
      statuses={types} activeStatus={type} setStatus={setType}
    >
      <table className="w-full border-collapse">
        <thead className="border-b border-slate-100 bg-slate-50/60">
          <tr>
            <th className={thCls}>Consenter</th>
            <th className={thCls}>Counterparty</th>
            <th className={thCls}>Type</th>
            <th className={thCls}>Subject</th>
            <th className={thCls}>Consented</th>
            <th className={thCls}>Version</th>
            <th className={thCls}>Recorded</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <EmptyRow colSpan={7} loading={loading} />
          ) : (
            filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className={`${tdCls} font-semibold text-slate-900`}>{r.user}</td>
                <td className={tdCls}>{r.counterparty}</td>
                <td className={tdCls}>{titleCase(r.consent_type)}</td>
                <td className={tdCls}>{titleCase(r.subject_type)} · {r.subject_id.slice(0, 8)}…</td>
                <td className={tdCls}>{r.consented ? 'Yes' : 'No'}</td>
                <td className={tdCls}>{r.consent_version}</td>
                <td className={`${tdCls} text-slate-400`}>{fmtDate(r.created_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </RecordsShell>
  );
}
