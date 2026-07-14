import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import {
  locationTagsForProperty,
  type ConditionParty,
  type ConditionPhoto,
  type ConditionRecord,
} from '@mzanzihomes/common';
import type { TenancySummary } from './useConditionRecords';

export type PhotoWithUrl = ConditionPhoto & { url: string };

export interface PendingUpload {
  id: string;
  fileName: string;
  previewUrl: string;
  locationTag: string;
  status: 'uploading' | 'error';
  error?: string;
}

const BUCKET = 'condition-photos';
const SIGNED_URL_TTL = 3600;
const UPLOAD_CONCURRENCY = 3;
const COMPRESS_THRESHOLD_BYTES = 800 * 1024;
// 2048px keeps defects readable as inspection evidence while cutting multi-MB camera files.
const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;

const DEV = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
function timeLog(label: string, startedAt: number) {
  if (DEV) console.debug(`[condition-upload] ${label}: ${Math.round(performance.now() - startedAt)}ms`);
}

async function compressImage(file: File): Promise<Blob> {
  if (file.size < COMPRESS_THRESHOLD_BYTES) return file;
  try {
    const t = performance.now();
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    timeLog(`compress ${file.name} ${file.size}B -> ${blob?.size ?? '?'}B`, t);
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // format the browser can't decode (e.g. HEIC) — upload as-is
  }
}

export function useConditionRecordDetail(recordId: string | null) {
  const [record, setRecord] = useState<ConditionRecord | null>(null);
  const [tenancy, setTenancy] = useState<TenancySummary | null>(null);
  const [myParty, setMyParty] = useState<ConditionParty | null>(null);
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [locationTags, setLocationTags] = useState<string[]>(locationTagsForProperty(null));
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // File handles for pending uploads so a failed upload can be retried.
  const pendingFilesRef = useRef(new Map<string, { file: File; locationTag: string }>());
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Signed URLs are cached by storage path so a refetch (realtime, upload) does
  // not change every <img src> and make the whole gallery flicker/reload.
  const urlCacheRef = useRef(new Map<string, { url: string; expiresAt: number }>());

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

      // Location tags come from the live property row; falls back to the
      // static list if the row is unreadable or missing.
      const { data: prop } = await db
        .from('properties')
        .select('bedrooms, bathrooms, parking_spaces, amenities')
        .eq('id', ten.property_id)
        .maybeSingle();
      setLocationTags(locationTagsForProperty(prop));

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
        // Only sign paths that are new or within 20 minutes of expiry — cached
        // URLs keep their src stable across refetches. The margin is wider than
        // the refresh interval's 15-minute remainder so the timer always renews.
        const cache = urlCacheRef.current;
        const now = Date.now();
        const stale = list.filter((p) => {
          const c = cache.get(p.storage_path);
          return !c || c.expiresAt < now + 20 * 60_000;
        });
        if (stale.length > 0) {
          const { data: signed, error: sErr } = await supabase.storage
            .from(BUCKET)
            .createSignedUrls(stale.map((p) => p.storage_path), SIGNED_URL_TTL);
          if (sErr) throw sErr;
          for (const s of signed ?? []) {
            if (s.path && s.signedUrl) {
              cache.set(s.path, { url: s.signedUrl, expiresAt: now + SIGNED_URL_TTL * 1000 });
            }
          }
        }
        setPhotos(list.map((p) => ({ ...p, url: cache.get(p.storage_path)?.url ?? '' })));
      }
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  // Concurrent uploads + realtime both fire refetches; collapse the storm.
  const debouncedRefetch = useCallback(() => {
    clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(refetch, 400);
  }, [refetch]);

  const runUpload = useCallback(
    async (id: string) => {
      const entry = pendingFilesRef.current.get(id);
      if (!entry || !recordId) return;
      const total = performance.now();
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user.id;
        if (!uid) throw new Error('Not signed in');

        const blob = await compressImage(entry.file);
        const ext = blob === entry.file ? entry.file.name.split('.').pop() || 'jpg' : 'jpg';
        // Path is keyed by the pending-upload id: a retry overwrites its own
        // partial object instead of uploading the image a second time.
        const path = `${recordId}/${id}.${ext}`;

        let t = performance.now();
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { upsert: true, contentType: blob.type || undefined });
        if (upErr) throw upErr;
        timeLog(`storage ${entry.file.name}`, t);

        t = performance.now();
        const { error: insErr } = await db.from('condition_photos').insert({
          record_id: recordId,
          uploaded_by: uid,
          location_tag: entry.locationTag,
          storage_path: path,
        });
        // 23505 = the row already exists from an earlier attempt whose
        // response was lost; that's success, not a duplicate photo.
        if (insErr && insErr.code !== '23505') {
          await supabase.storage.from(BUCKET).remove([path]);
          throw insErr;
        }
        timeLog(`insert ${entry.file.name}`, t);
        timeLog(`total ${entry.file.name}`, total);

        pendingFilesRef.current.delete(id);
        setPendingUploads((prev) => {
          const done = prev.find((p) => p.id === id);
          if (done) URL.revokeObjectURL(done.previewUrl);
          return prev.filter((p) => p.id !== id);
        });
        debouncedRefetch();
      } catch (e: any) {
        setPendingUploads((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, status: 'error', error: e.message ?? String(e) } : p,
          ),
        );
      }
    },
    [recordId, debouncedRefetch],
  );

  const uploadPhotos = useCallback(
    async (files: File[], locationTag: string) => {
      if (!recordId || files.length === 0) return;
      const ids = files.map((file) => {
        const id = crypto.randomUUID();
        pendingFilesRef.current.set(id, { file, locationTag });
        return id;
      });
      setPendingUploads((prev) => [
        ...prev,
        ...ids.map((id, i) => ({
          id,
          fileName: files[i].name,
          previewUrl: URL.createObjectURL(files[i]),
          locationTag,
          status: 'uploading' as const,
        })),
      ]);
      const queue = [...ids];
      await Promise.all(
        Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, async () => {
          while (queue.length > 0) await runUpload(queue.shift()!);
        }),
      );
    },
    [recordId, runUpload],
  );

  const retryUpload = useCallback(
    (id: string) => {
      setPendingUploads((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'uploading', error: undefined } : p)),
      );
      void runUpload(id);
    },
    [runUpload],
  );

  // Only failed (never-saved) uploads can be dismissed; saved photos are permanent.
  const dismissUpload = useCallback((id: string) => {
    pendingFilesRef.current.delete(id);
    setPendingUploads((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

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
      // Patch locally instead of refetching: autosave fires while the user is
      // typing, and a refetch would clobber the draft and re-render the page.
      setRecord((prev) => {
        if (!prev || !tenancy) return prev;
        const mine = myParty === 'tenant' ? 'tenant_notes' : 'landlord_notes';
        return { ...prev, [mine]: notes };
      });
    },
    [recordId, tenancy, myParty],
  );

  // Both parties watch the shared record live (immediate-visibility requirement).
  useEffect(() => {
    if (!recordId) return;
    refetch();
    const channel = supabase
      .channel(`condition-record-${recordId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'condition_photos', filter: `record_id=eq.${recordId}` },
        () => debouncedRefetch(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'condition_records', filter: `id=eq.${recordId}` },
        () => debouncedRefetch(),
      )
      .subscribe();
    // Re-sign photo URLs before the 1h TTL runs out so a long-open page
    // doesn't end up with broken images.
    const refreshInterval = setInterval(refetch, (SIGNED_URL_TTL - 15 * 60) * 1000);
    return () => {
      supabase.removeChannel(channel);
      clearTimeout(refetchTimerRef.current);
      clearInterval(refreshInterval);
    };
  }, [recordId, refetch, debouncedRefetch]);

  return {
    record,
    tenancy,
    myParty,
    photos,
    locationTags,
    pendingUploads,
    loading,
    error,
    uploadPhotos,
    retryUpload,
    dismissUpload,
    attest,
    saveNotes,
  };
}
