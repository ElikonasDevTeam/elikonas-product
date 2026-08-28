import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/app-shell";

export const metadata: Metadata = {
  title: "Feedback — Elikonas",
};

const SURVEY_EMBED_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdWk8VW1fTI5Wunj0AA7yuJCQMba3IfJ6fIZsswdd_-ci_k6Q/viewform?embedded=true";

export default async function FeedbackPage() {
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
    console.error("[feedback/page] unexpected error:", err);
  }

  return (
    <AppShell
      currentUserName={currentUserName}
      unreadCount={unreadCount}
      unreadTidingsCount={unreadTidingsCount}
      pendingConnectionsCount={pendingConnectionsCount}
      activePage="feedback"
    >
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-[#323031]">
          Help shape what we build next
        </h1>
        <p className="mt-2 text-sm text-[#323031]/60">
          Two to five minutes, and every response gets read. Thank you for being here at the
          ground floor.
        </p>

        {/* Responsive Google Forms embed. Google's own generated <iframe> code
            uses a fixed pixel width, which looks broken on mobile — width is
            forced to 100% here instead, with a generous min-height so most of
            the form fits without an awkward inner scrollbar on first load. */}
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <iframe
            src={SURVEY_EMBED_URL}
            title="Elikonas Founding Member Feedback"
            className="w-full"
            style={{ minHeight: "1200px", border: 0 }}
            loading="lazy"
          >
            Loading feedback form&hellip;
          </iframe>
        </div>

        <p className="mt-4 text-center text-xs text-[#323031]/40">
          Form not loading?{" "}
          <a
            href={SURVEY_EMBED_URL.replace("?embedded=true", "")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#177e89] underline"
          >
            Open it in a new tab instead
          </a>
          .
        </p>
      </div>
    </AppShell>
  );
}
