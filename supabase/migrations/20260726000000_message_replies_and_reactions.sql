-- Premium messaging: quoted replies + emoji reactions.

-- Reply reference (self-FK on messages).
alter table public.messages
  add column if not exists reply_to_id uuid references public.messages(id) on delete set null;

-- Reactions table. conversation_id is denormalised so realtime + RLS can filter
-- by conversation membership without a join.
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);
create index if not exists idx_message_reactions_message on public.message_reactions(message_id);
create index if not exists idx_message_reactions_conversation on public.message_reactions(conversation_id);

alter table public.message_reactions enable row level security;

create policy "reactions_select_conversation_members" on public.message_reactions
  for select using (
    exists (select 1 from public.conversations c
            where c.id = message_reactions.conversation_id
              and (c.landlord_id = auth.uid() or c.tenant_id = auth.uid()))
  );
create policy "reactions_insert_own" on public.message_reactions
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.conversations c
                where c.id = message_reactions.conversation_id
                  and (c.landlord_id = auth.uid() or c.tenant_id = auth.uid()))
  );
create policy "reactions_delete_own" on public.message_reactions
  for delete using (user_id = auth.uid());

-- Live updates for reactions.
do $$ begin
  alter publication supabase_realtime add table public.message_reactions;
exception when duplicate_object then null; end $$;
