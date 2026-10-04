-- course_url belongs on the course (ed_unit), not on each individual proof
-- of completion — a credential's own course_url (added in
-- 20261003190000_add_credentials_table_and_storage.sql) was write-only via
-- credential-modal.tsx and never displayed anywhere.
alter table public.ed_units
  add column if not exists course_url text;

-- Preserve any existing credentials.course_url values on their parent
-- ed_unit before the column is dropped, rather than silently losing them.
update public.ed_units eu
set course_url = c.course_url
from public.credentials c
where c.ed_unit_id = eu.id
  and c.course_url is not null
  and eu.course_url is null;

alter table public.credentials
  drop column if exists course_url;
