import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';

export interface AggregatedReaction {
  emoji: string;
  count: number;
  mine: boolean;
}
/** messageId → aggregated reactions */
export type ReactionMap = Record<string, AggregatedReaction[]>;

interface ReactionRow {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

/**
 * Self-contained emoji reactions for a conversation. Fetches all reactions,
 * keeps them live over realtime, and toggles the current user's reaction with an
 * optimistic update. Kept separate from the core messaging hook so it can't
 * destabilise sending/receiving.
 */
export function useMessageReactions(conversationId: string | null | undefined) {
  const { user } = useAuth();
  const [rows, setRows] = useState<ReactionRow[]>([]);
  const rowsRef = useRef<ReactionRow[]>([]);
  rowsRef.current = rows;

  const load = useCallback(async () => {
    if (!conversationId) { setRows([]); return; }
    const { data } = await supabase
      .from('message_reactions')
      .select('id, message_id, user_id, emoji')
      .eq('conversation_id', conversationId);
    setRows((data as ReactionRow[]) ?? []);
  }, [conversationId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!conversationId) return;
    const ch = supabase
      .channel(`reactions-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setRows((prev) => {
            if (payload.eventType === 'INSERT') {
              const r = payload.new as ReactionRow;
              if (prev.some((x) => x.id === r.id)) return prev;
              // Drop any optimistic temp row for the same (message,user,emoji).
              const deduped = prev.filter(
                (x) => !(x.id.startsWith('temp_') && x.message_id === r.message_id && x.user_id === r.user_id && x.emoji === r.emoji),
              );
              return [...deduped, r];
            }
            if (payload.eventType === 'DELETE') {
              const oldId = (payload.old as any)?.id;
              return prev.filter((x) => x.id !== oldId);
            }
            return prev;
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId]);

  const toggle = useCallback(async (messageId: string, emoji: string) => {
    if (!user || !conversationId) return;
    const existing = rowsRef.current.find(
      (r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji,
    );
    if (existing) {
      setRows((prev) => prev.filter((r) => r.id !== existing.id));
      if (!existing.id.startsWith('temp_')) {
        await supabase.from('message_reactions').delete().eq('id', existing.id);
      }
      return;
    }
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setRows((prev) => [...prev, { id: tempId, message_id: messageId, user_id: user.id, emoji }]);
    const { data, error } = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, conversation_id: conversationId, user_id: user.id, emoji })
      .select('id, message_id, user_id, emoji')
      .single();
    if (error) {
      setRows((prev) => prev.filter((r) => r.id !== tempId));
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === tempId ? (data as ReactionRow) : r)));
  }, [user, conversationId]);

  // Aggregate into a per-message map.
  const reactions: ReactionMap = {};
  for (const r of rows) {
    const arr = (reactions[r.message_id] ??= []);
    const agg = arr.find((a) => a.emoji === r.emoji);
    if (agg) {
      agg.count += 1;
      if (r.user_id === user?.id) agg.mine = true;
    } else {
      arr.push({ emoji: r.emoji, count: 1, mine: r.user_id === user?.id });
    }
  }

  return { reactions, toggle };
}

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
