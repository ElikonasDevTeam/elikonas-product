-- credentials: proof-of-completion entries for ed_units. One ed_unit may
-- eventually hold multiple credential entries (a self-attested upload now,
-- an accredited one later, etc.) — hence a separate table rather than
-- columns on ed_units.
--
-- user_id is denormalized (also derivable via ed_unit_id -> ed_units.user_id)
-- so RLS can scope directly on this table without a join. The composite FK
-- below ties ed_unit_id to ed_units(id, user_id) rather than just
-- ed_units(id), so the database itself enforces that a credential's user_id
-- always matches the ed_unit's actual owner — closing a gap RLS alone
-- wouldn't: INSERT's WITH CHECK only verifies auth.uid() = user_id on the
-- new row, not that ed_unit_id belongs to that same user, which would
-- otherwise let someone attach a credential row to *another* user's
-- ed_unit (without modifying that row — just referencing it).
alter table public.ed_units
  add constraint ed_units_id_user_id_key unique (id, user_id);

create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  ed_unit_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  self_attest boolean not null default true,
  cert_upload boolean not null default false,
  open_cred boolean not null default false,
  accredited boolean not null default false,
  blockchain boolean not null default false,
  file_url text,
  course_url text,
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credentials_ed_unit_user_fkey
    foreign key (ed_unit_id, user_id) references public.ed_units(id, user_id) on delete cascade
);

create index credentials_ed_unit_id_idx on public.credentials(ed_unit_id);
create index credentials_user_id_idx on public.credentials(user_id);

alter table public.credentials enable row level security;

create policy "Users can read their own credentials"
  on public.credentials for select
  using (auth.uid() = user_id);

create policy "Users can insert their own credentials"
  on public.credentials for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own credentials"
  on public.credentials for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own credentials"
  on public.credentials for delete
  using (auth.uid() = user_id);

create trigger credentials_updated_at
  before update on public.credentials
  for each row execute function public.update_updated_at();

-- Storage: private bucket for uploaded credential files. Files live at
-- "{user_id}/{filename}" so the path-prefix policies below can scope access
-- without a second lookup table. HEIC/HEIF included — phone photos of
-- paper certificates are the primary use case.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'credential-files',
  'credential-files',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf']
);

create policy "Users can read their own credential files"
  on storage.objects for select
  using (bucket_id = 'credential-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload their own credential files"
  on storage.objects for insert
  with check (bucket_id = 'credential-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own credential files"
  on storage.objects for update
  using (bucket_id = 'credential-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'credential-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own credential files"
  on storage.objects for delete
  using (bucket_id = 'credential-files' and (storage.foldername(name))[1] = auth.uid()::text);
