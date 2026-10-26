alter table public.properties
  drop constraint if exists properties_ownership_reviewed_by_fkey;

alter table public.properties
  add constraint properties_ownership_reviewed_by_fkey
  foreign key (ownership_reviewed_by) references auth.users(id) on delete set null;
