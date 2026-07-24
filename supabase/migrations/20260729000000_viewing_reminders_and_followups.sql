-- §6: one-hour pre-viewing reminders + post-viewing follow-ups for confirmed
-- viewings, for BOTH parties. Idempotent via per-proposal stamps so a retrying
-- cron never double-sends. create_notification already fans out to push.

alter table public.viewing_proposals
  add column if not exists reminder_1h_sent_at timestamptz,
  add column if not exists followup_sent_at timestamptz;

create or replace function public.process_viewing_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  -- ── 1-hour reminder: confirmed viewings starting in ~45–75 minutes ──────────
  for r in
    select vp.id, vp.property_id, vp.tenant_id, vp.landlord_id, vp.start_at,
           vp.conversation_id,
           p.title as prop_title, p.location as prop_loc,
           tp.display_name as tenant_name
    from public.viewing_proposals vp
    join public.properties p on p.id = vp.property_id
    left join public.profiles tp on tp.user_id = vp.tenant_id
    where vp.status = 'confirmed'
      and vp.cancelled_at is null
      and vp.reminder_1h_sent_at is null
      and vp.start_at between now() + interval '45 minutes' and now() + interval '75 minutes'
  loop
    perform public.create_notification(
      r.tenant_id,
      'Your viewing at ' || coalesce(r.prop_loc, r.prop_title, 'the property') || ' starts in about an hour.',
      case when r.conversation_id is not null then '/messages?c=' || r.conversation_id else '/viewings' end,
      'viewing',
      jsonb_build_object('viewing_id', r.id, 'property_id', r.property_id, 'kind', 'reminder_1h')
    );
    perform public.create_notification(
      r.landlord_id,
      'Your viewing with ' || coalesce(r.tenant_name, 'a tenant') || ' at ' || coalesce(r.prop_loc, r.prop_title, 'your property') || ' starts in about an hour.',
      case when r.conversation_id is not null then '/messages?c=' || r.conversation_id else '/enhancedlandlorddashboard' end,
      'viewing',
      jsonb_build_object('viewing_id', r.id, 'property_id', r.property_id, 'kind', 'reminder_1h')
    );
    update public.viewing_proposals set reminder_1h_sent_at = now() where id = r.id;
  end loop;

  -- ── Post-viewing follow-up: ~1 hour after the viewing end time ──────────────
  for r in
    select vp.id, vp.property_id, vp.tenant_id, vp.landlord_id, vp.conversation_id,
           p.title as prop_title, p.location as prop_loc,
           tp.display_name as tenant_name
    from public.viewing_proposals vp
    join public.properties p on p.id = vp.property_id
    left join public.profiles tp on tp.user_id = vp.tenant_id
    where vp.status = 'confirmed'
      and vp.cancelled_at is null
      and vp.followup_sent_at is null
      and (vp.start_at + (coalesce(vp.duration_minutes, 30) || ' minutes')::interval + interval '1 hour') <= now()
      and vp.start_at > now() - interval '2 days'
  loop
    perform public.create_notification(
      r.tenant_id,
      'How did the viewing go? You can now request to apply for this property.',
      '/applications',
      'viewing_followup',
      jsonb_build_object('viewing_id', r.id, 'property_id', r.property_id, 'kind', 'followup')
    );
    perform public.create_notification(
      r.landlord_id,
      'How did the viewing with ' || coalesce(r.tenant_name, 'the tenant') || ' go? You can invite them to apply.',
      '/enhancedlandlorddashboard/applications',
      'viewing_followup',
      jsonb_build_object('viewing_id', r.id, 'property_id', r.property_id, 'kind', 'followup')
    );
    update public.viewing_proposals set followup_sent_at = now() where id = r.id;
  end loop;
end;
$$;

-- Run every 15 minutes.
select cron.schedule('viewing-notifications-15min', '*/15 * * * *',
  $$ select public.process_viewing_notifications(); $$);
