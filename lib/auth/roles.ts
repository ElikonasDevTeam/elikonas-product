import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type UserRole = "learner" | "provider" | "admin";

const ROLE_RANK: Record<UserRole, number> = {
  learner: 0,
  provider: 1,
  admin: 2,
};

export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return (data?.role as UserRole) ?? "learner";
}

export async function isProvider(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return ROLE_RANK[role] >= ROLE_RANK["provider"];
}

export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "admin";
}

// Call at the top of any server action or page that requires a minimum role.
// Redirects to /profile?error=Access+denied if the current user doesn't qualify.
export async function requireRole(minimumRole: UserRole): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRole(user.id);

  if (ROLE_RANK[role] < ROLE_RANK[minimumRole]) {
    redirect("/profile?error=Access+denied");
  }
}
