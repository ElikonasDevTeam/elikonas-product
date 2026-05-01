"use server";

import { createClient } from "@/lib/supabase/server";

export async function connectAction(addresseeId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("connections").insert({
    requester_id: user.id,
    addressee_id: addresseeId,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") return { error: "Connection request already sent." };
    console.error("[connectAction] error:", error.message);
    return { error: "Could not send request. Please try again." };
  }
  return {};
}

export async function acceptConnectionAction(connectionId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("connections")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", connectionId)
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("[acceptConnectionAction] error:", error.message);
    return { error: "Could not accept request." };
  }
  return {};
}

export async function declineConnectionAction(connectionId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("connections")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("id", connectionId)
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("[declineConnectionAction] error:", error.message);
    return { error: "Could not decline request." };
  }
  return {};
}
