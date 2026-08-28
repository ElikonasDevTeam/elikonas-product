import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/app-shell";

export const metadata: Metadata = {
  title: "Help & Support — Elikonas",
};

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const meta = user.user_metadata ?? {};
  const currentUserName: string = meta.full_name || user.email || "Learner";

  let unreadCount = 0;
  let unreadTidingsCount = 0;
  let pendingConnectionsCount = 0;

  try {
    const [{ count: notifCount }, { count: tidingsCount }, { count: pendingCount }] =
      await Promise.all([
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false),
        supabase
          .from("tidings_messages")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .eq("read", false),
        supabase
          .from("connections")
          .select("*", { count: "exact", head: true })
          .eq("addressee_id", user.id)
          .eq("status", "pending"),
      ]);

    unreadCount = notifCount ?? 0;
    unreadTidingsCount = tidingsCount ?? 0;
    pendingConnectionsCount = pendingCount ?? 0;
  } catch (err) {
    console.error("[support/page] unexpected error:", err);
  }

  return (
    <AppShell
      currentUserName={currentUserName}
      unreadCount={unreadCount}
      unreadTidingsCount={unreadTidingsCount}
      pendingConnectionsCount={pendingConnectionsCount}
      activePage="support"
    >
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-[#323031]">Help &amp; Support</h1>
        <p className="mt-2 text-sm text-[#323031]/60">
          Elikonas is still growing, and you&apos;re one of the first people using it. If
          something&apos;s not working, feels confusing, or you just have a question — reach
          out. A real person reads every message.
        </p>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[#323031]">Email us</p>
          <a
            href="mailto:support@elikonas.com"
            className="mt-1 inline-block text-lg font-semibold text-[#177e89] hover:text-[#084c61] transition-colors"
          >
            support@elikonas.com
          </a>
          <p className="mt-3 text-sm text-[#323031]/50">
            Since we&apos;re a small team in our earliest days, response times may vary — but
            every message gets a real reply.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[#323031]/40">
          Have a suggestion instead of an issue?{" "}
          <a href="/feedback" className="text-[#177e89] underline">
            Share it here
          </a>
          .
        </p>
      </div>
    </AppShell>
  );
}
