-- A browsing tenant can't read a landlord's profile (RLS), but the property
-- detail page needs to know whether the landlord has in-app messaging (a paid
-- plan) to decide between "message → chat" and "contact → phone/email". Expose
-- ONLY that boolean via a SECURITY DEFINER function.
create or replace function public.property_landlord_subscribed(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select public.is_active_subscriber(p.landlord_id)
       from public.properties p
      where p.id = p_property_id),
    false
  );
$$;

grant execute on function public.property_landlord_subscribed(uuid) to anon, authenticated;
