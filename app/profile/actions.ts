"use server";

/*
  Schema reference for public.ed_units. Migrations live in supabase/migrations/
  — don't run DDL by hand from here.

    id            uuid        primary key, default gen_random_uuid()
    user_id       uuid        not null, references auth.users(id) on delete cascade
    name          text        not null
    provider      text        not null
    category      text        not null
    status        text        not null, check in ('completed','in_progress','planned')
    progress_pct  int         not null, default 0, check between 0 and 100
    created_at    timestamptz not null, default now()
    updated_at    timestamptz not null, default now()  -- maintained by the
                              -- ed_units_updated_at trigger (update_updated_at())

  RLS is enabled, with four separate policies rather than one FOR ALL policy.
  All four are scoped identically to auth.uid() = user_id:

    "Users can read their own ed_units"    SELECT
    "Users can insert their own ed_units"  INSERT
    "Users can update their own ed_units"  UPDATE
    "Users can delete their own ed_units"  DELETE

  An earlier version of this comment claimed a single FOR ALL policy named
  "Users can manage their own ed_units" — that was never actually deployed.
  The UPDATE policy genuinely did not exist until
  supabase/migrations/20261003162706_add_ed_units_update_policy_and_updated_at.sql,
  which is why editing a record silently failed (RLS blocked it, affecting
  0 rows, instead of raising an error).
*/

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type AddEdUnitState = { error: string } | { success: true } | null;
export type EditEdUnitState = AddEdUnitState;

// The only fields a user may write, on create or on edit. id, user_id and
// created_at are deliberately absent: ownership and creation time must not be
// reassignable from a form post.
function readEdUnitFields(formData: FormData) {
  const status = formData.get("status") as string;
  const rawPct = parseInt(formData.get("progress_pct") as string);

  return {
    name: (formData.get("name") as string)?.trim(),
    provider: (formData.get("provider") as string)?.trim(),
    category: formData.get("category") as string,
    status,
    progress_pct:
      status === "completed"
        ? 100
        : status === "planned"
          ? 0
          : Math.min(99, Math.max(1, isNaN(rawPct) ? 50 : rawPct)),
  };
}

export async function addEdUnitAction(
  _prev: AddEdUnitState,
  formData: FormData
): Promise<AddEdUnitState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("ed_units").insert({
    user_id: user.id,
    ...readEdUnitFields(formData),
  });

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

export async function editEdUnitAction(
  _prev: EditEdUnitState,
  formData: FormData
): Promise<EditEdUnitState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const id = (formData.get("id") as string)?.trim();
  if (!id) return { error: "Missing record id." };

  // Ownership is enforced by the "Users can update their own ed_units" RLS
  // policy, not by a user_id filter here — so someone else's row simply
  // matches nothing. .select() lets us tell that apart from a DB error:
  // RLS returns success with zero rows rather than raising.
  const { data, error } = await supabase
    .from("ed_units")
    .update(readEdUnitFields(formData))
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "That record could not be found." };
  }

  revalidatePath("/profile");
  return { success: true };
}
