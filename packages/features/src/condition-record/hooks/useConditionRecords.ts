import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import type { ConditionEventType, ConditionRecord } from '@mzanzihomes/common';

export interface TenancySummary {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface ConditionRecordListItem {
  record: ConditionRecord;
  tenancy: TenancySummary;
  propertyTitle: string;
}

export function useConditionRecords() {
  const [records, setRecords] = useState<ConditionRecordListItem[]>([]);
  const [tenancies, setTenancies] = useState<TenancySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const db = supabase as any; // ponytail: untyped until supabase types regen (Task 8)

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setRecords([]);
        setTenancies([]);
        return;
      }
      // RLS already scopes tenancies to the caller; the or-filter is belt and braces.
      const { data: tenancyRows, error: tErr } = await db
        .from('tenancies')
        .select('id, property_id, tenant_id, landlord_id, start_date, end_date, status')
        .or(`tenant_id.eq.${uid},landlord_id.eq.${uid}`);
      if (tErr) throw tErr;
      const tList: TenancySummary[] = tenancyRows ?? [];
      setTenancies(tList);
      if (tList.length === 0) {
        setRecords([]);
        return;
      }

      const [{ data: recs, error: rErr }, { data: props, error: pErr }] = await Promise.all([
        db
          .from('condition_records')
          .select('*')
          .in('tenancy_id', tList.map((t) => t.id))
          .order('created_at', { ascending: false }),
        db
          .from('properties')
          .select('id, title')
          .in('id', tList.map((t) => t.property_id)),
      ]);
      if (rErr) throw rErr;
      if (pErr) throw pErr;

      const tenancyById = new Map(tList.map((t) => [t.id, t]));
      const titleByPropertyId = new Map<string, string>(
        (props ?? []).map((p: any) => [p.id, p.title]),
      );
      setRecords(
        ((recs ?? []) as ConditionRecord[]).map((record) => {
          const tenancy = tenancyById.get(record.tenancy_id)!;
          return {
            record,
            tenancy,
            propertyTitle: titleByPropertyId.get(tenancy.property_id) ?? 'Property',
          };
        }),
      );
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const createRecord = useCallback(
    async (tenancyId: string, eventType: ConditionEventType) => {
      const { error: err } = await db
        .from('condition_records')
        .insert({ tenancy_id: tenancyId, event_type: eventType });
      // 23505 = someone else created it first; that's success for our purposes
      if (err && err.code !== '23505') throw err;
      await refetch();
    },
    [refetch],
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { records, tenancies, loading, error, refetch, createRecord };
}
