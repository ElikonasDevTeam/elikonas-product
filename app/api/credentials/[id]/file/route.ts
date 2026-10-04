// Redirects to a freshly-generated signed URL for a credential's uploaded
// file. Signed URLs expire, so one must never be generated once and then
// embedded in rendered HTML (a badge's href, say) — it'll work right after
// render and silently start failing with "InvalidJWT / exp claim expired"
// once that TTL elapses, regardless of how long the credential itself has
// existed. Generating it fresh on every click, here, means the token is
// always valid at the moment it's actually used.
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const SIGNED_URL_TTL_SECONDS = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // RLS scopes this to the caller's own rows — a credential that exists but
  // belongs to someone else simply doesn't come back, same as elsewhere in
  // this app (editEdUnitAction, addCredentialAction's ed_unit ownership check).
  const { data: credential } = await supabase
    .from("credentials")
    .select("file_url")
    .eq("id", id)
    .maybeSingle();

  if (!credential?.file_url) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from("credential-files")
    .createSignedUrl(credential.file_url, SIGNED_URL_TTL_SECONDS);

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not generate a file link." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
