import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { completionPercentage } from '../services/draftService';

export interface ApplicationDraftSummary {
  id: string;
  property_id: string;
  landlord_id: string;
  invite_id: string | null;
  completionPercentage: number;
  updated_at: string;
  property?: {
    id: string;
    title: string;
    location: string;
    images: string[] | null;
    price: number | null;
  } | null;
}

/** In-progress application drafts for the signed-in tenant, with enough
 * property context to render a card. */
export function useApplicationDrafts() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<ApplicationDraftSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchDrafts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error: draftsError } = await (supabase.from('application_drafts') as any)
        .select('id, property_id, landlord_id, invite_id, completed_steps, updated_at')
        .eq('tenant_id', user.id)
        .order('updated_at', { ascending: false });
      if (draftsError) throw draftsError;

      const rows = (data ?? []) as any[];
      let propsById = new Map<string, any>();
      if (rows.length > 0) {
        const propertyIds = Array.from(new Set(rows.map((d) => d.property_id)));
        const { data: props } = await (supabase.from('properties') as any)
          .select('id, title, location, images, price')
          .in('id', propertyIds);
        propsById = new Map((props ?? []).map((p: any) => [p.id, p]));
      }

      setDrafts(
        rows.map((d) => ({
          id: d.id,
          property_id: d.property_id,
          landlord_id: d.landlord_id,
          invite_id: d.invite_id ?? null,
          completionPercentage: completionPercentage(d.completed_steps ?? []),
          updated_at: d.updated_at,
          property: propsById.get(d.property_id) ?? null
        }))
      );
      setError(false);
    } catch (e) {
      console.error('Failed to fetch application drafts', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) void fetchDrafts();
  }, [user?.id, fetchDrafts]);

  return { drafts, loading, error, refresh: fetchDrafts };
}
