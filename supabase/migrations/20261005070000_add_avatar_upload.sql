-- Profile image upload (PR B). profiles.avatar_url is the Storage object
-- path, not a URL — the bucket is public, so the public URL is derived at
-- render time (origin + /storage/v1/object/public/avatars/{path}), rather
-- than persisted, same reasoning as credential-files' private signed URLs.
alter table public.profiles
  add column if not exists avatar_url text;

-- Whether OTHER users (and signed-out visitors) may see this photo. Off by
-- default, consistent with every other user_privacy_settings flag — the
-- owner always sees their own photo regardless of this flag; it only gates
-- what other viewers get. <Avatar> falls back to initials whenever this is
-- false and the viewer isn't the owner.
alter table public.user_privacy_settings
  add column if not exists show_profile_photo boolean not null default false;

-- Unlike credential-files, this bucket is genuinely public-read: avatars
-- are meant to be seen by other users and by visitors to a shared public
-- profile, and a public bucket means the URL never expires (no signed-URL
-- TTL to go stale, unlike the bug just fixed on certificates). Writes are
-- still locked to the owner's own folder, same path-prefix pattern as
-- credential-files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "Users can read their own avatar files"
  on storage.objects for select
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload their own avatar files"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar files"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own avatar files"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
