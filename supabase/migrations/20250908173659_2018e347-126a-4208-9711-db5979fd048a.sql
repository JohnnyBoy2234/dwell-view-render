-- 1.1 Create viewing status enum
create type viewing_proposal_status as enum ('proposed','confirmed','declined','cancelled','expired');

-- 1.2 Create viewing proposals table (for DM-driven scheduling)
create table if not exists public.viewing_proposals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  landlord_id uuid not null,                 -- auth.users.id
  tenant_id uuid not null,                   -- auth.users.id
  start_at timestamptz not null,             -- UTC
  duration_minutes int not null default 20,
  status viewing_proposal_status not null default 'proposed',
  notes text,                                -- optional landlord note
  created_by uuid not null,                  -- who created the proposal (usually landlord)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz
);

-- Create indexes for viewing_proposals
create index on public.viewing_proposals(conversation_id);
create index on public.viewing_proposals(tenant_id, status);
create index on public.viewing_proposals(landlord_id, status);
create index on public.viewing_proposals(start_at);

-- 1.3 Update messages table to reference viewing proposals
alter table public.messages
  add column if not exists viewing_proposal_id uuid references public.viewing_proposals(id) on delete set null;

-- 1.4 Create viewing reminders table
create table if not exists public.viewing_reminders (
  id bigserial primary key,
  viewing_proposal_id uuid not null references public.viewing_proposals(id) on delete cascade,
  fire_at timestamptz not null,
  kind text not null,         -- '24h_before' | '2h_before' | '30m_before'
  sent_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index on public.viewing_reminders(fire_at) where sent_at is null;

-- Enable RLS on new tables
alter table public.viewing_proposals enable row level security;
alter table public.viewing_reminders enable row level security;

-- RLS policies for viewing_proposals
create policy "Users can view proposals where they are participants"
  on public.viewing_proposals for select
  using (auth.uid() = landlord_id or auth.uid() = tenant_id);

create policy "Landlords can create proposals for their properties"
  on public.viewing_proposals for insert 
  with check (
    auth.uid() = landlord_id and 
    auth.uid() = created_by and
    exists (
      select 1 from public.properties 
      where id = viewing_proposals.property_id and landlord_id = auth.uid()
    )
  );

create policy "Creators can update while proposed"
  on public.viewing_proposals for update
  using (auth.uid() = created_by and status = 'proposed');

create policy "Tenants can confirm proposals"
  on public.viewing_proposals for update
  using (auth.uid() = tenant_id and status = 'proposed')
  with check (status in ('confirmed', 'declined'));

create policy "Landlords can cancel proposals"
  on public.viewing_proposals for update
  using (auth.uid() = landlord_id)
  with check (status = 'cancelled');

-- RLS policies for viewing_reminders
create policy "System can manage reminders"
  on public.viewing_reminders for all
  using (true);

-- Add updated_at trigger for viewing_proposals
create trigger update_viewing_proposals_updated_at
  before update on public.viewing_proposals
  for each row execute function public.update_updated_at_column();

-- Enable realtime for new tables
alter publication supabase_realtime add table public.viewing_proposals;
alter publication supabase_realtime add table public.viewing_reminders;