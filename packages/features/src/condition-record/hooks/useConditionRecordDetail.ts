import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import {
  locationTagsForProperty,
  type ConditionParty,
  type ConditionPhoto,
  type ConditionRecord,
  type ConditionSignature,
  type ConditionDispute,
  type ConditionAuditEntry,
  type ConditionChecklistItem,
  type ConditionMeter,
  type ConditionKey,
  standardChecklistItems,
} from '@mzanzihomes/common';
import { CONSENT_REGISTRY } from '@mzanzihomes/common/constants/consentRegistry';
import type { TenancySummary } from './useConditionRecords';

// Best-effort signing evidence: public IP (via a lightweight lookup) + UA.
// p_consent_version is only accepted by condition_approve, not the (dead,
// unreachable since the receipt step was skipped) condition_sign_receipt.
async function signMetadata(consent: string, version?: string) {
  let ip: string | null = null;
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    ip = (await res.json()).ip ?? null;
  } catch {}
  return {
    p_ip: ip,
    p_ua: navigator.userAgent,
    p_consent: consent,
    ...(version ? { p_consent_version: version } : {}),
  };
}

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
  const [signatures, setSignatures] = useState<ConditionSignature[]>([]);
  const [disputes, setDisputes] = useState<ConditionDispute[]>([]);
  const [audit, setAudit] = useState<ConditionAuditEntry[]>([]);
  const [checklist, setChecklist] = useState<ConditionChecklistItem[]>([]);
  const [meters, setMeters] = useState<ConditionMeter[]>([]);
  const [keys, setKeys] = useState<ConditionKey[]>([]);
  // Check-in counterpart items, loaded read-only for move-out comparison.
  const [checkInItems, setCheckInItems] = useState<ConditionChecklistItem[]>([]);
  const [locationTags, setLocationTags] = useState<string[]>(locationTagsForProperty(null));
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // File handles for pending uploads so a failed upload can be retried.
  const pendingFilesRef = useRef(new Map<string, { file: File; locationTag: string; disputeId?: string; itemId?: string }>());
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

      // Signing state, disputes and audit trail (all party-visible via RLS).
      const [{ data: sigs }, { data: disp }, { data: aud }] = await Promise.all([
        db.from('condition_signatures').select('*').eq('record_id', recordId).order('signed_at', { ascending: true }),
        db.from('condition_disputes').select('*').eq('record_id', recordId).order('created_at', { ascending: true }),
        db.from('condition_record_audit').select('*').eq('record_id', recordId).order('created_at', { ascending: true }),
      ]);
      setSignatures((sigs ?? []) as ConditionSignature[]);
      setDisputes((disp ?? []) as ConditionDispute[]);
      setAudit((aud ?? []) as ConditionAuditEntry[]);

      const [{ data: items }, { data: mtr }, { data: kys }] = await Promise.all([
        db.from('condition_checklist_items').select('*').eq('record_id', recordId).order('location_tag').order('sort_order'),
        db.from('condition_meters').select('*').eq('record_id', recordId).order('created_at'),
        db.from('condition_keys').select('*').eq('record_id', recordId).order('created_at'),
      ]);
      setChecklist((items ?? []) as ConditionChecklistItem[]);
      setMeters((mtr ?? []) as ConditionMeter[]);
      setKeys((kys ?? []) as ConditionKey[]);

      // For a move-out record, load the check-in report's checklist so the UI
      // and PDF can show check-in condition beside check-out condition.
      if (rec.event_type === 'move_out') {
        const { data: checkIn } = await db
          .from('condition_records').select('id')
          .eq('tenancy_id', rec.tenancy_id).eq('event_type', 'move_in').maybeSingle();
        if (checkIn?.id) {
          const { data: ci } = await db.from('condition_checklist_items').select('*').eq('record_id', checkIn.id);
          setCheckInItems((ci ?? []) as ConditionChecklistItem[]);
        } else {
          setCheckInItems([]);
        }
      } else {
        setCheckInItems([]);
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
          dispute_id: entry.disputeId ?? null,
          item_id: entry.itemId ?? null,
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
    async (files: File[], locationTag: string, opts?: { disputeId?: string; itemId?: string }) => {
      if (!recordId || files.length === 0) return;
      const ids = files.map((file) => {
        const id = crypto.randomUUID();
        pendingFilesRef.current.set(id, { file, locationTag, disputeId: opts?.disputeId, itemId: opts?.itemId });
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

  const callRpc = useCallback(async (fn: string, args: Record<string, unknown>) => {
    if (!recordId) return;
    const { data, error: err } = await db.rpc(fn, args);
    if (err) throw err;
    await refetch();
    return data;
  }, [recordId, refetch]);

  const sendForSignoff = useCallback(
    () => callRpc('condition_send_for_signoff', { p_record_id: recordId }),
    [callRpc, recordId],
  );

  const signReceipt = useCallback(
    async () =>
      callRpc('condition_sign_receipt', {
        p_record_id: recordId,
        ...(await signMetadata('I confirm that I have received and can access this condition report.')),
      }),
    [callRpc, recordId],
  );

  const approve = useCallback(
    async () =>
      callRpc('condition_approve', {
        p_record_id: recordId,
        ...(await signMetadata(
          record?.attestation_text ?? CONSENT_REGISTRY.condition_approval.text,
          CONSENT_REGISTRY.condition_approval.version,
        )),
      }),
    [callRpc, recordId, record?.attestation_text],
  );

  // Raise a dispute, then (optionally) attach photos to it.
  const raiseDispute = useCallback(
    async (locationTag: string, comment: string, files?: File[]) => {
      if (!recordId) return;
      const { data, error: err } = await db.rpc('condition_raise_dispute', {
        p_record_id: recordId,
        p_location_tag: locationTag,
        p_comment: comment,
      });
      if (err) throw err;
      const disputeId = data as string;
      if (files && files.length > 0) await uploadPhotos(files, locationTag, { disputeId });
      await refetch();
      return disputeId;
    },
    [recordId, uploadPhotos, refetch],
  );

  const respondDispute = useCallback(
    (disputeId: string, agree: boolean) =>
      callRpc('condition_respond_dispute', { p_dispute_id: disputeId, p_agree: agree }),
    [callRpc],
  );

  const reopen = useCallback(
    () => callRpc('condition_reopen', { p_record_id: recordId }),
    [callRpc, recordId],
  );

  // ── Phase 2: checklist / meters / keys (editable only while open) ──────────
  const seedChecklist = useCallback(async (tags: string[]) => {
    if (!recordId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const existing = new Set(checklist.map((i) => `${i.location_tag}::${i.name.toLowerCase()}`));
    const rows: any[] = [];
    for (const tag of tags) {
      standardChecklistItems(tag).forEach((name, idx) => {
        if (!existing.has(`${tag}::${name.toLowerCase()}`)) {
          rows.push({ record_id: recordId, location_tag: tag, name, sort_order: idx, created_by: user?.id ?? null });
        }
      });
    }
    if (rows.length === 0) return;
    const { error: err } = await db.from('condition_checklist_items').insert(rows);
    if (err) throw err;
    await refetch();
  }, [recordId, checklist, refetch]);

  const addChecklistItem = useCallback(async (locationTag: string, name: string) => {
    if (!recordId || !name.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const maxSort = Math.max(0, ...checklist.filter((i) => i.location_tag === locationTag).map((i) => i.sort_order));
    const { error: err } = await db.from('condition_checklist_items').insert({
      record_id: recordId, location_tag: locationTag, name: name.trim(), sort_order: maxSort + 1, created_by: user?.id ?? null,
    });
    if (err) throw err;
    await refetch();
  }, [recordId, checklist, refetch]);

  const updateChecklistItem = useCallback(async (id: string, patch: Partial<Pick<ConditionChecklistItem, 'condition' | 'cleanliness' | 'note' | 'name' | 'change_type' | 'change_note'>>) => {
    // Optimistic patch so grading feels instant; refetch reconciles.
    setChecklist((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const { error: err } = await db.from('condition_checklist_items').update(patch).eq('id', id);
    if (err) throw err;
  }, []);

  // Move-out only: copy the check-in report's item list (rooms + names) so the
  // same items line up for side-by-side comparison. Conditions are graded fresh.
  const copyFromCheckIn = useCallback(async () => {
    if (!recordId || checkInItems.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    const existing = new Set(checklist.map((i) => `${i.location_tag}::${i.name.toLowerCase()}`));
    const rows = checkInItems
      .filter((i) => !existing.has(`${i.location_tag}::${i.name.toLowerCase()}`))
      .map((i) => ({ record_id: recordId, location_tag: i.location_tag, name: i.name, sort_order: i.sort_order, created_by: user?.id ?? null }));
    if (rows.length === 0) return;
    const { error: err } = await db.from('condition_checklist_items').insert(rows);
    if (err) throw err;
    await refetch();
  }, [recordId, checkInItems, checklist, refetch]);

  const deleteChecklistItem = useCallback(async (id: string) => {
    const { error: err } = await db.from('condition_checklist_items').delete().eq('id', id);
    if (err) throw err;
    await refetch();
  }, [refetch]);

  const uploadItemPhotos = useCallback(
    (itemId: string, locationTag: string, files: File[]) => uploadPhotos(files, locationTag, { itemId }),
    [uploadPhotos],
  );

  const addMeter = useCallback(async (meterType: string, reading: string, note: string, file?: File) => {
    if (!recordId) return;
    const { data: { user } } = await supabase.auth.getUser();
    let photoPath: string | null = null;
    if (file) {
      const path = `${recordId}/meter_${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (!upErr) photoPath = path;
    }
    const { error: err } = await db.from('condition_meters').insert({
      record_id: recordId, meter_type: meterType, reading: reading.trim(), note: note.trim() || null, photo_path: photoPath, created_by: user?.id ?? null,
    });
    if (err) throw err;
    await refetch();
  }, [recordId, refetch]);

  const deleteMeter = useCallback(async (id: string) => {
    const { error: err } = await db.from('condition_meters').delete().eq('id', id);
    if (err) throw err;
    await refetch();
  }, [refetch]);

  const addKey = useCallback(async (label: string, quantity: number, note: string) => {
    if (!recordId || !label.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await db.from('condition_keys').insert({
      record_id: recordId, label: label.trim(), quantity: Math.max(1, quantity), note: note.trim() || null, created_by: user?.id ?? null,
    });
    if (err) throw err;
    await refetch();
  }, [recordId, refetch]);

  const deleteKey = useCallback(async (id: string) => {
    const { error: err } = await db.from('condition_keys').delete().eq('id', id);
    if (err) throw err;
    await refetch();
  }, [refetch]);

  // Signed URL for the finalised report PDF. Generates it on demand if the
  // background trigger hasn't produced it yet, so the download always works.
  const getReportUrl = useCallback(async (): Promise<string | null> => {
    let path = record?.pdf_path ?? null;
    if (!path && recordId) {
      const { error: fnErr } = await supabase.functions.invoke('generate-condition-report-pdf', {
        body: { record_id: recordId },
      });
      if (fnErr) throw fnErr;
      const { data: row } = await db.from('condition_records').select('pdf_path').eq('id', recordId).single();
      path = row?.pdf_path ?? null;
    }
    if (!path) return null;
    const { data, error: err } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
    if (err) return null;
    return data?.signedUrl ?? null;
  }, [record?.pdf_path, recordId]);

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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'condition_disputes', filter: `record_id=eq.${recordId}` },
        () => debouncedRefetch(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'condition_signatures', filter: `record_id=eq.${recordId}` },
        () => debouncedRefetch(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'condition_checklist_items', filter: `record_id=eq.${recordId}` },
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
    signatures,
    disputes,
    audit,
    checklist,
    checkInItems,
    meters,
    keys,
    locationTags,
    pendingUploads,
    loading,
    error,
    uploadPhotos,
    retryUpload,
    dismissUpload,
    saveNotes,
    sendForSignoff,
    signReceipt,
    approve,
    raiseDispute,
    respondDispute,
    reopen,
    getReportUrl,
    seedChecklist,
    copyFromCheckIn,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    uploadItemPhotos,
    addMeter,
    deleteMeter,
    addKey,
    deleteKey,
  };
}
