-- 1.1 Create viewing status enum
create type viewing_status as enum ('proposed','confirmed','declined','cancelled','expired');

-- 1.2 Create viewing slots table (one slot per proposal; attach to a thread)
create table if not exists public.viewing_slots (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.conversations(id) on delete cascade, -- DM thread
  property_id uuid not null references public.properties(id) on delete cascade,
  landlord_id uuid not null,                 -- auth.users.id
  tenant_id uuid not null,                   -- auth.users.id
  start_at timestamptz not null,             -- UTC
  duration_minutes int not null default 20,
  status viewing_status not null default 'proposed',
  notes text,                                -- optional landlord note
  created_by uuid not null,                  -- who created the slot (usually landlord)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz
);

-- Create indexes for viewing_slots
create index on public.viewing_slots(thread_id);
create index on public.viewing_slots(tenant_id, status);
create index on public.viewing_slots(landlord_id, status);
create index on public.viewing_slots(start_at);

-- 1.3 Update messages table to reference viewing slots
alter table public.messages
  add column if not exists viewing_slot_id uuid references public.viewing_slots(id) on delete set null;

-- Update message_type column (already exists but ensure it's correct)
alter table public.messages
  alter column message_type set default 'text';

-- 1.4 Create viewing reminders table
create table if not exists public.viewing_reminders (
  id bigserial primary key,
  viewing_slot_id uuid not null references public.viewing_slots(id) on delete cascade,
  fire_at timestamptz not null,
  kind text not null,         -- '24h_before' | '2h_before' | '30m_before'
  sent_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index on public.viewing_reminders(fire_at) where sent_at is null;

-- Enable RLS on new tables
alter table public.viewing_slots enable row level security;
alter table public.viewing_reminders enable row level security;

-- RLS policies for viewing_slots
create policy "Users can view slots where they are participants"
  on public.viewing_slots for select
  using (auth.uid() = landlord_id or auth.uid() = tenant_id);

create policy "Landlords can create slots for their properties"
  on public.viewing_slots for insert 
  with check (
    auth.uid() = landlord_id and 
    auth.uid() = created_by and
    exists (
      select 1 from public.properties 
      where id = viewing_slots.property_id and landlord_id = auth.uid()
    )
  );

create policy "Creators can update while proposed"
  on public.viewing_slots for update
  using (auth.uid() = created_by and status = 'proposed');

create policy "Tenants can confirm slots"
  on public.viewing_slots for update
  using (auth.uid() = tenant_id and status = 'proposed')
  with check (status in ('confirmed', 'declined'));

create policy "Landlords can cancel slots"
  on public.viewing_slots for update
  using (auth.uid() = landlord_id)
  with check (status = 'cancelled');

-- RLS policies for viewing_reminders
create policy "System can manage reminders"
  on public.viewing_reminders for all
  using (true);

-- Add updated_at trigger for viewing_slots
create trigger update_viewing_slots_updated_at
  before update on public.viewing_slots
  for each row execute function public.update_updated_at_column();

-- Enable realtime for new tables
alter publication supabase_realtime add table public.viewing_slots;
alter publication supabase_realtime add table public.viewing_reminders;