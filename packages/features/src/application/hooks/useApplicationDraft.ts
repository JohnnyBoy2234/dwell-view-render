import { useCallback, useEffect, useRef, useState } from 'react';
import { loadDraft, saveDraft, type ApplicationDraft } from '../services/draftService';
import { mergeDraft, type ApplicationFormData } from '../types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const localKey = (userId: string, propertyId: string) =>
  `sr_application_autosave_${userId}_${propertyId}`;

interface UseApplicationDraftArgs {
  userId: string | undefined;
  propertyId: string;
  landlordId: string;
  inviteId?: string;
}

/**
 * Loads the saved draft (server first, localStorage fallback) and debounce-
 * autosaves changes back. localStorage keeps only form state — documents live
 * in storage buckets, never locally.
 */
export function useApplicationDraft({ userId, propertyId, landlordId, inviteId }: UseApplicationDraftArgs) {
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const skipNextSave = useRef(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      let result = await loadDraft(userId, propertyId);
      if (!result) {
        try {
          const raw = localStorage.getItem(localKey(userId, propertyId));
          if (raw) {
            const saved = JSON.parse(raw);
            result = {
              formData: mergeDraft(saved.formData),
              currentStep: typeof saved.currentStep === 'number' ? saved.currentStep : 0,
              completedSteps: Array.isArray(saved.completedSteps) ? saved.completedSteps : [],
              updatedAt: saved.updatedAt ?? null
            };
          }
        } catch {
          // unreadable local draft — start fresh
        }
      }
      if (!cancelled) {
        setDraft(result);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, propertyId]);

  const persist = useCallback(
    async (formData: ApplicationFormData, currentStep: number, completedSteps: number[]) => {
      if (!userId) return;
      setSaveStatus('saving');
      try {
        await saveDraft(userId, propertyId, landlordId, inviteId, { formData, currentStep, completedSteps });
        localStorage.setItem(
          localKey(userId, propertyId),
          JSON.stringify({ formData, currentStep, completedSteps, updatedAt: new Date().toISOString() })
        );
        setSaveStatus('saved');
      } catch (error) {
        console.warn('Draft autosave failed', error);
        // keep the local copy even when the server save fails
        try {
          localStorage.setItem(
            localKey(userId, propertyId),
            JSON.stringify({ formData, currentStep, completedSteps, updatedAt: new Date().toISOString() })
          );
        } catch {
          /* storage full/unavailable */
        }
        setSaveStatus('error');
      }
    },
    [userId, propertyId, landlordId, inviteId]
  );

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  /** Debounced autosave; call on every meaningful change. */
  const scheduleSave = useCallback(
    (formData: ApplicationFormData, currentStep: number, completedSteps: number[]) => {
      if (skipNextSave.current) {
        skipNextSave.current = false;
        return;
      }
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => persist(formData, currentStep, completedSteps), 800);
    },
    [persist]
  );

  /** Immediate save — used on step transitions and after uploads. */
  const saveNow = useCallback(
    (formData: ApplicationFormData, currentStep: number, completedSteps: number[]) => {
      clearTimeout(debounceTimer.current);
      return persist(formData, currentStep, completedSteps);
    },
    [persist]
  );

  const clearLocal = useCallback(() => {
    if (userId) localStorage.removeItem(localKey(userId, propertyId));
  }, [userId, propertyId]);

  useEffect(() => () => clearTimeout(debounceTimer.current), []);

  return { draft, loaded, saveStatus, scheduleSave, saveNow, clearLocal };
}
