"use server";

/*
  Required Supabase migration — run once in the SQL editor:

  create table public.ed_units (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    provider text not null,
    category text not null,
    status text not null check (status in ('completed', 'in_progress', 'planned')),
    progress_pct int not null default 0 check (progress_pct >= 0 and progress_pct <= 100),
    created_at timestamptz default now() not null
  );

  alter table public.ed_units enable row level security;

  create policy "Users can manage their own ed_units"
    on public.ed_units for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
*/

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type AddEdUnitState = { error: string } | { success: true } | null;

export async function addEdUnitAction(
  _prev: AddEdUnitState,
  formData: FormData
): Promise<AddEdUnitState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const name = (formData.get("name") as string)?.trim();
  const provider = (formData.get("provider") as string)?.trim();
  const category = formData.get("category") as string;
  const status = formData.get("status") as string;

  const rawPct = parseInt(formData.get("progress_pct") as string);
  const progress_pct =
    status === "completed"
      ? 100
      : status === "planned"
        ? 0
        : Math.min(99, Math.max(1, isNaN(rawPct) ? 50 : rawPct));

  const { error } = await supabase.from("ed_units").insert({
    user_id: user.id,
    name,
    provider,
    category,
    status,
    progress_pct,
  });

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}
