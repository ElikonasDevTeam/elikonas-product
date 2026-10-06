"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { validateAvatarUpload } from "@/lib/files/validate-upload";
import { processAvatarImage } from "@/lib/images/process-avatar";

export type UploadAvatarState = { error: string } | { success: true; avatarUrl: string } | null;

export async function uploadAvatarAction(
  _prev: UploadAvatarState,
  formData: FormData
): Promise<UploadAvatarState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Please choose a photo to upload." };
  }
  const showProfilePhoto = formData.get("show_profile_photo") === "true";

  const validated = await validateAvatarUpload(file);
  if (!validated.ok) return { error: validated.error };

  // Read the existing avatar_url before touching Storage, so the old
  // object can be cleaned up once the new one is in place.
  const { data: existing } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  let processed: Buffer;
  try {
    processed = await processAvatarImage(Buffer.from(await file.arrayBuffer()));
  } catch {
    return { error: "That image couldn't be processed. Please try a different photo." };
  }

  // A new random filename every upload (never overwrite in place) — simplest
  // way to dodge any stale-cache window on the public bucket's permanent URL.
  const path = `${user.id}/${randomUUID()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, processed, { contentType: "image/webp" });
  if (uploadError) return { error: uploadError.message };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", user.id);
  if (updateError) {
    await supabase.storage.from("avatars").remove([path]);
    return { error: "Failed to save photo. Please try again." };
  }

  const { error: privacyError } = await supabase.from("user_privacy_settings").upsert(
    { user_id: user.id, show_profile_photo: showProfilePhoto, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (privacyError) {
    return { error: "Photo saved, but the visibility setting failed to save. Please check it in Account settings." };
  }

  // Best-effort: the row now points at the new file, so the old one is
  // genuinely unreachable through the app.
  if (existing?.avatar_url) {
    await supabase.storage.from("avatars").remove([existing.avatar_url]);
  }

  revalidatePath("/profile");
  revalidatePath("/account");
  return { success: true, avatarUrl: path };
}

export type RemoveAvatarState = { error: string } | { success: true } | null;

export async function removeAvatarAction(
  _prev: RemoveAvatarState,
  _formData: FormData
): Promise<RemoveAvatarState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: existing } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (!existing?.avatar_url) return { error: "No photo to remove." };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);
  if (updateError) return { error: "Failed to remove photo. Please try again." };

  await supabase.storage.from("avatars").remove([existing.avatar_url]);

  revalidatePath("/profile");
  revalidatePath("/account");
  return { success: true };
}
