"use server";

/*
  Schema reference for public.credentials. Migrations live in
  supabase/migrations/ — don't run DDL by hand from here.

    id            uuid        primary key, default gen_random_uuid()
    ed_unit_id    uuid        not null — FK (ed_unit_id, user_id) ->
                              ed_units(id, user_id), so the DB itself
                              rejects attaching a credential to an ed_unit
                              that isn't this same user's
    user_id       uuid        not null, references auth.users(id) on delete cascade
    self_attest   boolean     not null, default true
    cert_upload   boolean     not null, default false
    open_cred     boolean     not null, default false  -- no automated flow yet
    accredited    boolean     not null, default false  -- no automated flow yet
    blockchain    boolean     not null, default false  -- no automated flow yet
    file_url      text        nullable — the Storage object path (bucket is
                              private, so this is never a usable URL on its
                              own; a signed URL is generated at read time)
    course_url    text        nullable
    completed_at  date        nullable
    created_at, updated_at    standard, updated_at maintained by the
                              credentials_updated_at trigger

  RLS: SELECT/INSERT/UPDATE/DELETE all scoped to auth.uid() = user_id, same
  shape as ed_units. Storage policies on storage.objects for the
  credential-files bucket scope by path prefix ("{user_id}/...") instead,
  since storage.objects has no user_id column of its own.

  This action only ever sets self_attest = true, cert_upload = true — the
  other three flags exist in the schema for future flows (and for a
  manually-entered historical entry, set directly in the database) but no
  code path here sets them.
*/

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { validateUploadedFile } from "@/lib/files/validate-upload";

export type AddCredentialState = { error: string } | { success: true } | null;

export async function addCredentialAction(
  _prev: AddCredentialState,
  formData: FormData
): Promise<AddCredentialState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const edUnitId = (formData.get("ed_unit_id") as string)?.trim();
  if (!edUnitId) return { error: "Missing record id." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Please choose a file to upload." };
  }

  const courseUrlRaw = (formData.get("course_url") as string)?.trim();
  const course_url = courseUrlRaw || null;
  if (course_url && !/^https?:\/\//i.test(course_url)) {
    return { error: "Course URL must start with http:// or https://" };
  }

  // Confirm ownership before touching Storage at all, rather than upload
  // first and find out via the insert's RLS/FK rejection — avoids ever
  // writing an orphaned file for an ed_unit that isn't this user's. RLS
  // already scopes this query to the caller's own rows, so a record that
  // exists but belongs to someone else simply doesn't come back.
  const { data: edUnit } = await supabase
    .from("ed_units")
    .select("id")
    .eq("id", edUnitId)
    .maybeSingle();
  if (!edUnit) return { error: "That record could not be found." };

  // Never trust the browser's reported MIME type — sniff the real content.
  const validated = await validateUploadedFile(file);
  if (!validated.ok) return { error: validated.error };

  // A random name, not the user-supplied filename: avoids path-traversal /
  // injection via filename, and the extension comes from the *validated*
  // content type, not whatever the client claimed.
  const path = `${user.id}/${randomUUID()}.${validated.ext}`;

  const { error: uploadError } = await supabase.storage
    .from("credential-files")
    .upload(path, file, { contentType: validated.mime });
  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("credentials").insert({
    ed_unit_id: edUnitId,
    user_id: user.id,
    self_attest: true,
    cert_upload: true,
    file_url: path,
    course_url,
  });

  if (insertError) {
    // Don't leave an orphaned blob behind if the row insert fails for some
    // other reason (e.g. a transient DB error) after the upload succeeded.
    await supabase.storage.from("credential-files").remove([path]);
    return { error: insertError.message };
  }

  revalidatePath("/profile");
  return { success: true };
}
