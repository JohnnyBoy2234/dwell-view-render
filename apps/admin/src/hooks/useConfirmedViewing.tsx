// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ConfirmedViewing {
  id: string;
  start_at: string;
  duration_minutes: number;
  property_id: string;
  conversation_id: string;
  properties?: {
    title: string;
    location: string;
  };
}

export const useConfirmedViewing = (conversationId?: string) => {
  const { user } = useAuth();
  const [confirmedViewing, setConfirmedViewing] = useState<ConfirmedViewing | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !conversationId) return;

    const fetchConfirmedViewing = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('viewing_proposals')
          .select(`
            id,
            start_at,
            duration_minutes,
            property_id,
            conversation_id,
            properties (
              title,
              location
            )
          `)
          .eq('conversation_id', conversationId)
          .eq('status', 'confirmed')
          .gte('start_at', new Date().toISOString()) // Only upcoming viewings
          .order('start_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setConfirmedViewing(data);
      } catch (error) {
        console.error('Error fetching confirmed viewing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfirmedViewing();

    // Subscribe to viewing proposal changes
    const channel = supabase
      .channel(`confirmed-viewing-${conversationId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'viewing_proposals',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          fetchConfirmedViewing();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationId]);

  return {
    confirmedViewing,
    loading,
  };
};