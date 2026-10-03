-- Editing a learning record was impossible: ed_units had SELECT/INSERT/DELETE
-- policies but no UPDATE policy, so any update through the user-session
-- client was silently blocked by RLS (0 rows affected).
alter table public.ed_units
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists ed_units_updated_at on public.ed_units;
create trigger ed_units_updated_at
  before update on public.ed_units
  for each row execute function public.update_updated_at();

drop policy if exists "Users can update their own ed_units" on public.ed_units;
create policy "Users can update their own ed_units"
  on public.ed_units for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
