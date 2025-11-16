// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { NotificationService } from '@/services/notificationService';

export interface UpcomingViewingLike {
  id: string;
  start_time?: string; // viewing_slots
  end_time?: string;
  scheduled_date?: string; // viewings
  property_id?: string;
}

function isWithinTwoHours(dateIso?: string) {
  if (!dateIso) return false;
  const now = new Date();
  const target = new Date(dateIso);
  const diffMs = target.getTime() - now.getTime();
  return diffMs <= 2 * 60 * 60 * 1000 && diffMs > 0;
}

function alreadySent(userId: string, viewingId: string): boolean {
  const key = `viewingReminderSent:${userId}:${viewingId}:2h`;
  return localStorage.getItem(key) === '1';
}

function markSent(userId: string, viewingId: string) {
  const key = `viewingReminderSent:${userId}:${viewingId}:2h`;
  localStorage.setItem(key, '1');
}

export async function ensureTwoHourViewingRemindersForTenant(
  userId: string,
  upcoming: UpcomingViewingLike[]
) {
  for (const v of upcoming) {
    const when = v.start_time || v.scheduled_date;
    if (!when) continue;
    if (!isWithinTwoHours(when)) continue;
    if (alreadySent(userId, v.id)) continue;

    const friendly = new Date(when).toLocaleString();
    await NotificationService.createViewingNotification(
      userId,
      'Viewing in 2 hours',
      `Reminder: your viewing is scheduled for ${friendly}.`,
      'high',
      '/tenant/viewings',
      { viewingId: v.id, reminder: '2hr_pre' }
    );
    markSent(userId, v.id);
  }
}

export async function ensureTwoHourViewingRemindersForLandlord(userId: string) {
  // Fetch upcoming confirmed viewings in the next 2 hours for this landlord
  const nowIso = new Date().toISOString();
  const twoHoursAheadIso = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('viewings')
    .select('id, scheduled_date, property_id')
    .eq('landlord_id', userId)
    .gte('scheduled_date', nowIso)
    .lte('scheduled_date', twoHoursAheadIso);

  if (error) return;
  for (const v of data || []) {
    if (!v.scheduled_date) continue;
    if (alreadySent(userId, v.id)) continue;

    const friendly = new Date(v.scheduled_date).toLocaleString();
    await NotificationService.createViewingNotification(
      userId,
      'Viewing in 2 hours',
      `Reminder: you have a viewing scheduled for ${friendly}.`,
      'high',
      '/enhancedlandlorddashboard/viewings',
      { viewingId: v.id, reminder: '2hr_pre' }
    );
    markSent(userId, v.id);
  }
}


