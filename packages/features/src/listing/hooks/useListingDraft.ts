// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { isIncompleteDraft, nextRetryDelay } from './draftLogic';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface Options {
  userId: string | undefined;
  // From ?propertyId= — editing an existing row skips draft discovery.
  existingPropertyId: string | null;
}

// Owns the server-side draft: creation, debounced field saves with retry,
// save-state for the indicator, and discovery of a resumable draft.
export function useListingDraft({ userId, existingPropertyId }: Options) {
  const [draftId, setDraftId] = useState<string | null>(existingPropertyId);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [resumeDraft, setResumeDraft] = useState<any | null>(null);

  const pending = useRef<Record<string, any>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempt = useRef(0);
  const draftIdRef = useRef<string | null>(existingPropertyId);
  draftIdRef.current = draftId ?? draftIdRef.current;
  // Holds the in-flight insert so a concurrent ensureDraft (e.g. a double-click
  // on Continue at step 1) joins the same insert instead of creating a duplicate.
  const creatingRef = useRef<Promise<string | null> | null>(null);

  // Discover the most recent incomplete unlisted draft to offer a resume.
  useEffect(() => {
    if (existingPropertyId || !userId) return;
    let cancelled = false;
    supabase
      .from('properties')
      .select('*')
      .eq('landlord_id', userId)
      .eq('is_listed', false)
      .order('updated_at', { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const draft = data.find(isIncompleteDraft);
        if (draft) setResumeDraft(draft);
      });
    return () => {
      cancelled = true;
    };
  }, [existingPropertyId, userId]);

  const flush = useCallback(async () => {
    const id = draftIdRef.current;
    if (!id) return;
    const fields = pending.current;
    if (Object.keys(fields).length === 0) return;
    pending.current = {};
    setSaveState('saving');
    const { error } = await supabase.from('properties').update(fields).eq('id', id);
    if (error) {
      // Merge back (newer edits win) and retry with backoff.
      pending.current = { ...fields, ...pending.current };
      setSaveState('error');
      attempt.current += 1;
      timer.current = setTimeout(() => void flush(), nextRetryDelay(attempt.current));
      return;
    }
    attempt.current = 0;
    setSaveState('saved');
    setLastSavedAt(Date.now());
  }, []);

  // Debounced save; call with the full row-shaped patch you want persisted.
  const save = useCallback(
    (fields: Record<string, any>) => {
      pending.current = { ...pending.current, ...fields };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 800);
    },
    [flush]
  );

  // Creates the draft row on first call (step 1 → Continue); saves after that.
  const ensureDraft = useCallback(
    async (fields: Record<string, any>): Promise<string | null> => {
      if (draftIdRef.current) {
        save(fields);
        return draftIdRef.current;
      }
      if (!userId) return null;
      // Concurrent call joins the same insert rather than firing a second one.
      if (creatingRef.current) return creatingRef.current;
      creatingRef.current = (async () => {
        setSaveState('saving');
        const { data, error } = await supabase
          .from('properties')
          .insert({
            landlord_id: userId,
            is_listed: false,
            title: '',
            description: '',
            location: '',
            price: 0,
            ...fields,
          })
          .select('id')
          .single();
        if (error || !data) {
          setSaveState('error');
          return null;
        }
        draftIdRef.current = data.id;
        setDraftId(data.id);
        setSaveState('saved');
        setLastSavedAt(Date.now());
        return data.id;
      })();
      try {
        return await creatingRef.current;
      } finally {
        creatingRef.current = null;
      }
    },
    [userId, save]
  );

  const adoptDraft = useCallback((row: any) => {
    draftIdRef.current = row.id;
    setDraftId(row.id);
    setResumeDraft(null);
  }, []);

  const dismissResume = useCallback(() => setResumeDraft(null), []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      // Don't drop edits still sitting in the debounce window when the user
      // navigates away — fire-and-forget flush. (Post-unmount setState is a
      // warning-free no-op in React 18, so voiding it is safe.)
      if (draftIdRef.current && Object.keys(pending.current).length > 0) {
        void flush();
      }
    },
    [flush]
  );

  return {
    draftId,
    saveState,
    lastSavedAt,
    save,
    flush,
    ensureDraft,
    resumeDraft,
    adoptDraft,
    dismissResume,
  };
}
