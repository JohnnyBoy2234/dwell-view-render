-- Property ownership verification: a one-time, property-level check (title
-- deed, manually reviewed for now — no real deeds API exists yet, see the
-- design spec) that gates publishing alongside the existing payment check.
-- Landlord identity reuses the existing, already-generic kyc_profiles
-- pipeline rather than a new table.

create type public.property_ownership_status as enum ('not_submitted', 'submitted', 'verified', 'declined');

alter table public.properties
  add column title_deed_path text,
  add column ownership_status public.property_ownership_status not null default 'not_submitted',
  add column ownership_verified_at timestamptz,
  add column ownership_reviewed_by uuid references auth.users(id),
  add column ownership_decline_reason text;

-- Storage: private bucket for title deeds, path convention <property_id>/deed.<ext>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('title-deeds', 'title-deeds', false, 10485760, array['application/pdf','image/jpeg','image/png']::text[])
on conflict (id) do nothing;

drop policy if exists "Landlords can upload their own title deeds" on storage.objects;
create policy "Landlords can upload their own title deeds"
on storage.objects for insert
with check (
  bucket_id = 'title-deeds'
  and exists (
    select 1 from public.properties p
    where p.id::text = (storage.foldername(name))[1]
      and p.landlord_id = auth.uid()
  )
);

drop policy if exists "Landlords can update their own title deeds" on storage.objects;
create policy "Landlords can update their own title deeds"
on storage.objects for update
using (
  bucket_id = 'title-deeds'
  and exists (
    select 1 from public.properties p
    where p.id::text = (storage.foldername(name))[1]
      and p.landlord_id = auth.uid()
  )
);

drop policy if exists "Landlords and admins can view title deeds" on storage.objects;
create policy "Landlords and admins can view title deeds"
on storage.objects for select
using (
  bucket_id = 'title-deeds'
  and (
    exists (
      select 1 from public.properties p
      where p.id::text = (storage.foldername(name))[1]
        and p.landlord_id = auth.uid()
    )
    or public.is_admin()
  )
);

-- Enforcement: extend the existing publish-paywall trigger with two earlier
-- checks. Order matters for UX — ownership (backstop, should already be
-- true by listing time) -> identity (first listing only) -> payment
-- (every listing, existing behaviour unchanged).
create or replace function public.enforce_publish_paywall()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  IF NEW.is_listed IS TRUE AND (TG_OP = 'INSERT' OR OLD.is_listed IS DISTINCT FROM TRUE) THEN
    IF NEW.ownership_status IS DISTINCT FROM 'verified' THEN
      RAISE EXCEPTION 'OWNERSHIP_NOT_VERIFIED: title deed ownership must be verified before publishing';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.kyc_profiles WHERE user_id = NEW.landlord_id AND status = 'approved'
    ) THEN
      RAISE EXCEPTION 'IDENTITY_NOT_VERIFIED: landlord identity (KYC) must be approved before publishing';
    END IF;
    IF NOT public.can_publish_property(NEW.id, NEW.landlord_id) THEN
      RAISE EXCEPTION 'PUBLISH_PAYWALL: publishing requires an active subscription or a once-off listing fee';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Notifications: same three-branch shape as the existing notify_on_kyc_status_change.
create or replace function public.notify_on_ownership_status_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  IF NEW.ownership_status IS DISTINCT FROM OLD.ownership_status THEN
    IF NEW.ownership_status = 'verified' THEN
      PERFORM public.create_notification(
        NEW.landlord_id,
        'Title deed verified — you can now publish this listing.',
        '/list-property?propertyId=' || NEW.id,
        'system',
        jsonb_build_object('property_id', NEW.id, 'ownership_status', NEW.ownership_status)
      );
    ELSIF NEW.ownership_status = 'declined' THEN
      PERFORM public.create_notification(
        NEW.landlord_id,
        'Title deed verification needs attention',
        '/list-property?propertyId=' || NEW.id,
        'system',
        jsonb_build_object('property_id', NEW.id, 'ownership_status', NEW.ownership_status, 'reason', NEW.ownership_decline_reason)
      );
    ELSIF NEW.ownership_status = 'submitted' THEN
      INSERT INTO public.notifications (user_id, message, link_url, type, metadata)
      SELECT ur.user_id,
             'New title deed submitted for ownership review',
             '/admin/documents',
             'system',
             jsonb_build_object('property_id', NEW.id)
      FROM public.user_roles ur
      WHERE ur.role = 'admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

drop trigger if exists trg_notify_on_ownership_status_change on public.properties;
create trigger trg_notify_on_ownership_status_change
after update on public.properties
for each row
execute function public.notify_on_ownership_status_change();
