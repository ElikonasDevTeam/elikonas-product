import { fileTypeFromBuffer } from "file-type";

// Mirrors the credential-files Storage bucket's own allowed_mime_types —
// kept in sync by hand with the bucket config in
// supabase/migrations/20261003190000_add_credentials_table_and_storage.sql.
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, matches the bucket's file_size_limit

export type FileValidationResult =
  | { ok: true; mime: string; ext: string }
  | { ok: false; error: string };

// Validates a file's actual content via magic-byte signature sniffing —
// never trusts the client-reported File.type, which is attacker-controlled
// (renaming a file, or setting an arbitrary Content-Type on the request, is
// trivial). A file whose real content doesn't match a known, allowed
// signature is rejected outright, regardless of its claimed type/extension.
export async function validateUploadedFile(file: File): Promise<FileValidationResult> {
  if (file.size === 0) {
    return { ok: false, error: "The selected file is empty." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "File is too large. Maximum size is 10MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    return {
      ok: false,
      error: "Unsupported file type. Upload a JPEG, PNG, HEIC/HEIF, or PDF file.",
    };
  }

  return { ok: true, mime: detected.mime, ext: detected.ext };
}

// Mirrors the "avatars" Storage bucket's own allowed_mime_types — see
// supabase/migrations/20261005070000_add_avatar_upload.sql. Deliberately
// narrower than credential-files: no PDF (an avatar isn't a document), and
// no HEIC/HEIF — sharp's build here has no HEIF decoder, so a HEIC avatar
// would fail at the processing step with a confusing error. Caught and
// named explicitly below instead.
const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_AVATAR_HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);

const MAX_AVATAR_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, matches the avatars bucket's file_size_limit

export async function validateAvatarUpload(file: File): Promise<FileValidationResult> {
  if (file.size === 0) {
    return { ok: false, error: "The selected file is empty." };
  }
  if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
    return { ok: false, error: "File is too large. Maximum size is 5MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(buffer);

  if (detected && ALLOWED_AVATAR_HEIC_MIME_TYPES.has(detected.mime)) {
    return {
      ok: false,
      error: "HEIC/HEIF photos aren't supported yet. Please upload a JPEG or PNG.",
    };
  }

  if (!detected || !ALLOWED_AVATAR_MIME_TYPES.has(detected.mime)) {
    return { ok: false, error: "Unsupported file type. Upload a JPEG, PNG, or WebP image." };
  }

  return { ok: true, mime: detected.mime, ext: detected.ext };
}
