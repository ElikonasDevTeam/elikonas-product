// Shared thank-you screen for newsletter votes. Not a route (only page.tsx files are).
// Each vote has its own URL path (/newsletter/weekly, /newsletter/monthly) so the
// clicks can be counted in Mailchimp's click report, since Cloudflare doesn't log
// query strings.

import Link from "next/link";

export default function VoteThanks({ choice }: { choice: "weekly" | "monthly" }) {
  const label = choice === "weekly" ? "Weekly" : "Monthly";

  return (
    <main
      style={{
        maxWidth: "640px",
        margin: "0 auto",
        padding: "96px 24px 96px",
        color: "#323031",
        fontFamily: "'Crimson Pro', ui-serif, Georgia, serif",
      }}
    >
      <span
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "#084c61",
          background: "#ffc857",
          padding: "2px 8px",
          borderRadius: "3px",
        }}
      >
        {label}
      </span>

      <h1
        style={{
          fontSize: "2.25rem",
          fontWeight: 600,
          color: "#084c61",
          margin: "1rem 0 0.75rem",
        }}
      >
        Your response has been counted.
      </h1>

      <p style={{ fontSize: "1.1rem", lineHeight: 1.6, maxWidth: "48ch", marginBottom: "2rem" }}>
        Thank you for letting us know. We&apos;ll share what everyone chose in an upcoming newsletter.
      </p>

      <Link
        href="/"
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: "0.95rem",
          color: "#177e89",
        }}
      >
        Back to Elikonas
      </Link>
    </main>
  );
}
