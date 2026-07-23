-- When a tenant is linked to a property (tenancy), make sure a conversation
-- exists so landlord and tenant can message immediately, and tell the tenant.
create or replace function public.ensure_conversation_for_tenancy()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_conv_id uuid;
  v_landlord_name text;
begin
  if new.tenant_id is null or new.landlord_id is null or new.property_id is null then
    return new;
  end if;

  select id into v_conv_id from public.conversations
   where property_id = new.property_id and landlord_id = new.landlord_id and tenant_id = new.tenant_id
   limit 1;

  if v_conv_id is null then
    insert into public.conversations (property_id, landlord_id, tenant_id)
    values (new.property_id, new.landlord_id, new.tenant_id)
    returning id into v_conv_id;

    select display_name into v_landlord_name from public.profiles where user_id = new.landlord_id;
    perform public.create_notification(
      new.tenant_id,
      'You''re connected with ' || coalesce(v_landlord_name, 'your landlord') || '. You can now message them directly in the app.',
      '/messages',
      'message',
      jsonb_build_object('conversation_id', v_conv_id, 'property_id', new.property_id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ensure_conversation_on_tenancy on public.tenancies;
create trigger trg_ensure_conversation_on_tenancy
after insert on public.tenancies
for each row execute function public.ensure_conversation_for_tenancy();

-- Backfill conversations for existing tenancies that don't have one yet.
do $$
declare r record; v_conv_id uuid; v_name text;
begin
  for r in
    select distinct t.property_id, t.landlord_id, t.tenant_id
    from public.tenancies t
    where t.tenant_id is not null and t.landlord_id is not null and t.property_id is not null
      and not exists (
        select 1 from public.conversations c
        where c.property_id = t.property_id and c.landlord_id = t.landlord_id and c.tenant_id = t.tenant_id)
  loop
    insert into public.conversations (property_id, landlord_id, tenant_id)
    values (r.property_id, r.landlord_id, r.tenant_id)
    returning id into v_conv_id;

    select display_name into v_name from public.profiles where user_id = r.landlord_id;
    perform public.create_notification(
      r.tenant_id,
      'You''re connected with ' || coalesce(v_name, 'your landlord') || '. You can now message them directly in the app.',
      '/messages',
      'message',
      jsonb_build_object('conversation_id', v_conv_id, 'property_id', r.property_id)
    );
  end loop;
end $$;
