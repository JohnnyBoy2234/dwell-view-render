-- Give admins read-only visibility into every record for oversight and
-- record-keeping (powers the admin dashboard's live counts + activity feed).
-- Additive (permissive) SELECT policies gated by is_admin().
do $$
declare t text;
begin
  foreach t in array array['applications','lease_contracts','transactions','maintenance_requests','tenancies']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format($f$
      create policy "Admins can view all %1$s"
      on public.%1$I for select
      using (public.is_admin(auth.uid()))
    $f$, t);
  end loop;
end $$;
