import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import type { ConditionParty, ConditionPhoto, ConditionRecord } from '@mzanzihomes/common';
import type { TenancySummary } from './useConditionRecords';

export type PhotoWithUrl = ConditionPhoto & { url: string };

const BUCKET = 'condition-photos';
const SIGNED_URL_TTL = 3600;

export function useConditionRecordDetail(recordId: string | null) {
  const [record, setRecord] = useState<ConditionRecord | null>(null);
  const [tenancy, setTenancy] = useState<TenancySummary | null>(null);
  const [myParty, setMyParty] = useState<ConditionParty | null>(null);
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const db = supabase as any; // ponytail: untyped until supabase types regen (Task 8)

  const refetch = useCallback(async () => {
    if (!recordId) return;
    setError(null);
    try {
      const { data: rec, error: rErr } = await db
        .from('condition_records')
        .select('*')
        .eq('id', recordId)
        .single();
      if (rErr) throw rErr;
      setRecord(rec as ConditionRecord);

      const { data: ten, error: tErr } = await db
        .from('tenancies')
        .select('id, property_id, tenant_id, landlord_id, start_date, end_date, status')
        .eq('id', rec.tenancy_id)
        .single();
      if (tErr) throw tErr;
      setTenancy(ten as TenancySummary);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      setMyParty(uid === ten.tenant_id ? 'tenant' : uid === ten.landlord_id ? 'landlord' : null);

      const { data: ph, error: pErr } = await db
        .from('condition_photos')
        .select('*')
        .eq('record_id', recordId)
        .order('created_at', { ascending: true });
      if (pErr) throw pErr;
      const list = (ph ?? []) as ConditionPhoto[];

      if (list.length === 0) {
        setPhotos([]);
      } else {
        const { data: signed, error: sErr } = await supabase.storage
          .from(BUCKET)
          .createSignedUrls(list.map((p) => p.storage_path), SIGNED_URL_TTL);
        if (sErr) throw sErr;
        const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
        setPhotos(list.map((p) => ({ ...p, url: urlByPath.get(p.storage_path) ?? '' })));
      }
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  const uploadPhotos = useCallback(
    async (files: File[], locationTag: string) => {
      if (!recordId) return;
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error('Not signed in');
      for (const file of files) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${recordId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
        if (upErr) throw upErr;
        const { error: insErr } = await db.from('condition_photos').insert({
          record_id: recordId,
          uploaded_by: uid,
          location_tag: locationTag,
          storage_path: path,
        });
        if (insErr) {
          await supabase.storage.from(BUCKET).remove([path]);
          throw insErr;
        }
      }
      await refetch();
    },
    [recordId, refetch],
  );

  const deletePhoto = useCallback(
    async (photo: ConditionPhoto) => {
      const { error: delErr } = await db.from('condition_photos').delete().eq('id', photo.id);
      if (delErr) throw delErr;
      await supabase.storage.from(BUCKET).remove([photo.storage_path]);
      await refetch();
    },
    [refetch],
  );

  const attest = useCallback(async () => {
    if (!recordId) return;
    const { error: err } = await db.rpc('attest_condition_record', { p_record_id: recordId });
    if (err) throw err;
    await refetch();
  }, [recordId, refetch]);

  const saveNotes = useCallback(
    async (notes: string) => {
      if (!recordId) return;
      const { error: err } = await db.rpc('set_condition_notes', {
        p_record_id: recordId,
        p_notes: notes,
      });
      if (err) throw err;
      await refetch();
    },
    [recordId, refetch],
  );

  // Both parties watch the shared gallery live (immediate-visibility requirement).
  useEffect(() => {
    if (!recordId) return;
    refetch();
    const channel = supabase
      .channel(`condition-record-${recordId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'condition_photos', filter: `record_id=eq.${recordId}` },
        () => refetch(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'condition_records', filter: `id=eq.${recordId}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [recordId, refetch]);

  return { record, tenancy, myParty, photos, loading, error, uploadPhotos, deletePhoto, attest, saveNotes };
}
