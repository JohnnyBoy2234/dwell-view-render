import { useMemo, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import {
  RecordsShell, StatusPill, EmptyRow, useAdminRecords, buildLookups,
  fmtDate, thCls, tdCls,
} from './adminRecords';

interface LeaseRow {
  id: string;
  title: string | null;
  status: string | null;
  created_at: string;
  property: string;
  tenant: string;
  landlord: string;
}

async function loadLeases(): Promise<LeaseRow[]> {
  const { data, error } = await supabase
    .from('lease_contracts')
    .select('id, title, property_id, landlord_id, tenant_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  const rows = data ?? [];
  const { propMap, userMap } = await buildLookups(
    rows.map((r: any) => r.property_id),
    rows.flatMap((r: any) => [r.tenant_id, r.landlord_id]),
  );
  return rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    created_at: r.created_at,
    property: propMap.get(r.property_id)?.title || '—',
    tenant: userMap.get(r.tenant_id) || '—',
    landlord: userMap.get(r.landlord_id) || '—',
  }));
}

export default function AdminLeases() {
  const { rows, loading, refresh } = useAdminRecords<LeaseRow>(loadLeases);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const statuses = useMemo(
    () => ['all', ...Array.from(new Set(rows.map((r) => (r.status || '').toLowerCase()).filter(Boolean)))],
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== 'all' && (r.status || '').toLowerCase() !== status) return false;
      if (!q) return true;
      return [r.title, r.property, r.tenant, r.landlord, r.status].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [rows, search, status]);

  return (
    <RecordsShell
      title="Leases & Contracts" subtitle="Every lease agreement"
      count={filtered.length} loading={loading} onRefresh={refresh}
      search={search} setSearch={setSearch}
      statuses={statuses} activeStatus={status} setStatus={setStatus}
    >
      <table className="w-full border-collapse">
        <thead className="border-b border-slate-100 bg-slate-50/60">
          <tr>
            <th className={thCls}>Lease</th>
            <th className={thCls}>Property</th>
            <th className={thCls}>Tenant</th>
            <th className={thCls}>Landlord</th>
            <th className={thCls}>Status</th>
            <th className={thCls}>Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <EmptyRow colSpan={6} loading={loading} />
          ) : (
            filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className={`${tdCls} font-semibold text-slate-900`}>{r.title || 'Lease'}</td>
                <td className={tdCls}>{r.property}</td>
                <td className={tdCls}>{r.tenant}</td>
                <td className={tdCls}>{r.landlord}</td>
                <td className={tdCls}><StatusPill status={r.status} /></td>
                <td className={`${tdCls} text-slate-400`}>{fmtDate(r.created_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </RecordsShell>
  );
}
