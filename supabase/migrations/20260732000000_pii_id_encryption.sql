-- §7: encrypt SA ID numbers at rest (POPIA). ID numbers on profiles /
-- screening_details are stored ciphertext; the UI reads a masked value, and the
-- full number is decrypted only for the owner (or an admin, or a landlord with a
-- lease/application/tenancy relationship) via get_id_number(). Uses a Vault-held
-- key + pgcrypto.

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'pii_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'pii_key', 'PII field encryption key');
  end if;
end $$;

create or replace function public._pii_key() returns text
language sql stable security definer set search_path = vault, public as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'pii_key' limit 1;
$$;
revoke all on function public._pii_key() from public, anon, authenticated;

create or replace function public.encrypt_pii(p_plain text) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_plain is null or p_plain = '' then return p_plain; end if;
  if p_plain like 'enc:v1:%' then return p_plain; end if;
  return 'enc:v1:' || encode(pgp_sym_encrypt(p_plain, public._pii_key()), 'base64');
end; $$;

create or replace function public.decrypt_pii(p_cipher text) returns text
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if p_cipher is null or p_cipher = '' then return p_cipher; end if;
  if p_cipher not like 'enc:v1:%' then return p_cipher; end if;
  return pgp_sym_decrypt(decode(substring(p_cipher from 8), 'base64'), public._pii_key());
exception when others then return null; end; $$;

create or replace function public.mask_id(p_id text) returns text
language sql immutable as $$
  select case
    when p_id is null or p_id = '' then p_id
    when p_id like 'enc:v1:%' then '••••••'
    when length(p_id) <= 4 then p_id
    else repeat('•', length(p_id) - 4) || right(p_id, 4)
  end;
$$;

create or replace function public.trg_encrypt_id_number() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.id_number is not null and new.id_number <> '' and new.id_number not like 'enc:v1:%' then
    new.id_number := public.encrypt_pii(new.id_number);
  end if;
  return new;
end; $$;

drop trigger if exists encrypt_id_number on public.profiles;
create trigger encrypt_id_number before insert or update of id_number on public.profiles
  for each row execute function public.trg_encrypt_id_number();

drop trigger if exists encrypt_id_number on public.screening_details;
create trigger encrypt_id_number before insert or update of id_number on public.screening_details
  for each row execute function public.trg_encrypt_id_number();

create or replace function public.get_id_number(p_user_id uuid, p_source text default 'screening')
returns text
language plpgsql stable security definer set search_path = public as $$
declare v_cipher text; v_caller uuid := auth.uid();
begin
  if v_caller is null then return null; end if;
  if p_source = 'profile' then
    select id_number into v_cipher from public.profiles where user_id = p_user_id;
  else
    select id_number into v_cipher from public.screening_details where user_id = p_user_id;
  end if;
  if v_caller = p_user_id or public.is_admin(v_caller) then
    return public.decrypt_pii(v_cipher);
  end if;
  if exists (
    select 1 from public.lease_contracts lc where lc.landlord_id = v_caller and lc.tenant_id = p_user_id
    union all select 1 from public.application_requests ar where ar.landlord_id = v_caller and ar.tenant_id = p_user_id
    union all select 1 from public.tenancies t where t.landlord_id = v_caller and t.tenant_id = p_user_id
  ) then
    return public.decrypt_pii(v_cipher);
  end if;
  return null;
end; $$;

grant execute on function public.get_id_number(uuid, text) to authenticated;
grant execute on function public.mask_id(text) to authenticated;

-- Backfill: encrypt any existing plaintext id_number (idempotent).
update public.profiles set id_number = public.encrypt_pii(id_number)
  where id_number is not null and id_number <> '' and id_number not like 'enc:v1:%';
update public.screening_details set id_number = public.encrypt_pii(id_number)
  where id_number is not null and id_number <> '' and id_number not like 'enc:v1:%';
