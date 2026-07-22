import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';

export interface AdminStats {
  users: number;
  landlords: number;
  tenants: number;
  properties: number;
  listedProperties: number;
  applications: number;
  pendingApplications: number;
  leases: number;
  signedLeases: number;
  transactions: number;
  transactionValue: number;
  openMaintenance: number;
  pendingKyc: number;
  openSupport: number;
}

export type ActivityType =
  | 'user' | 'property' | 'application' | 'lease' | 'support' | 'maintenance';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  detail?: string;
  at: string; // ISO timestamp
}

const EMPTY: AdminStats = {
  users: 0, landlords: 0, tenants: 0, properties: 0, listedProperties: 0,
  applications: 0, pendingApplications: 0, leases: 0, signedLeases: 0,
  transactions: 0, transactionValue: 0, openMaintenance: 0, pendingKyc: 0, openSupport: 0,
};

// Count helper — head request, no rows transferred.
async function countOf(
  table: string,
  build?: (q: any) => any,
): Promise<number> {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (build) q = build(q);
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats>(EMPTY);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        users, landlords, tenants, properties, listedProperties,
        applications, pendingApplications, leases, signedLeases,
        txRows, openMaintenance, pendingKyc, openSupport,
      ] = await Promise.all([
        countOf('profiles'),
        countOf('user_roles', (q) => q.eq('role', 'landlord')),
        countOf('user_roles', (q) => q.eq('role', 'tenant')),
        countOf('properties'),
        countOf('properties', (q) => q.eq('is_listed', true)),
        countOf('applications'),
        countOf('applications', (q) => q.in('status', ['pending', 'submitted', 'under_review'])),
        countOf('lease_contracts'),
        countOf('lease_contracts', (q) => q.eq('status', 'signed')),
        supabase.from('transactions').select('amount').limit(2000),
        countOf('maintenance_requests', (q) => q.in('status', ['open', 'pending', 'in_progress'])),
        countOf('kyc_profiles', (q) => q.eq('status', 'pending')),
        countOf('support_messages', (q) => q.in('status', ['open', 'new', 'pending'])),
      ]);

      const txList = (txRows.data ?? []) as { amount: number | null }[];
      const transactionValue = txList.reduce((s, t) => s + (Number(t.amount) || 0), 0);

      setStats({
        users, landlords, tenants, properties, listedProperties,
        applications, pendingApplications, leases, signedLeases,
        transactions: txList.length, transactionValue,
        openMaintenance, pendingKyc, openSupport,
      });

      // Recent activity — pull the latest rows from each record stream, merge,
      // sort by time. This is the "record of everything" feed.
      const [pRes, prRes, aRes, lRes, sRes] = await Promise.all([
        supabase.from('profiles').select('id, display_name, created_at').order('created_at', { ascending: false }).limit(6),
        supabase.from('properties').select('id, title, created_at').order('created_at', { ascending: false }).limit(6),
        supabase.from('applications').select('id, status, created_at').order('created_at', { ascending: false }).limit(6),
        supabase.from('lease_contracts').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(6),
        supabase.from('support_messages').select('id, subject, created_at').order('created_at', { ascending: false }).limit(6),
      ]);

      const merged: ActivityItem[] = [
        ...((pRes.data ?? []) as any[]).map((r) => ({ id: `u-${r.id}`, type: 'user' as const, title: 'New user registered', detail: r.display_name || undefined, at: r.created_at })),
        ...((prRes.data ?? []) as any[]).map((r) => ({ id: `p-${r.id}`, type: 'property' as const, title: 'Property added', detail: r.title || undefined, at: r.created_at })),
        ...((aRes.data ?? []) as any[]).map((r) => ({ id: `a-${r.id}`, type: 'application' as const, title: 'Application submitted', detail: r.status || undefined, at: r.created_at })),
        ...((lRes.data ?? []) as any[]).map((r) => ({ id: `l-${r.id}`, type: 'lease' as const, title: 'Lease created', detail: r.title || r.status || undefined, at: r.created_at })),
        ...((sRes.data ?? []) as any[]).map((r) => ({ id: `s-${r.id}`, type: 'support' as const, title: 'Support message', detail: r.subject || undefined, at: r.created_at })),
      ]
        .filter((x) => x.at)
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 14);

      setActivity(merged);
    } catch (e: any) {
      setError(e?.message || 'Failed to load admin stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { stats, activity, loading, error, refresh: load };
}
