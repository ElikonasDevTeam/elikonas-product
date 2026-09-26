type Entry = {
  version: string;
  date: string;
  items: string[];
};

const entries: Entry[] = [
  {
    version: "1.0.0",
    date: "August 28, 2026",
    items: [
      "Elikonas is live. You can start building your learning record and talking with Eli.",
    ],
  },
];

export default function UpdatesPage() {
  return (
    <main
      style={{
        maxWidth: "640px",
        margin: "0 auto",
        padding: "72px 24px 96px",
        color: "#323031",
        fontFamily: "'Crimson Pro', ui-serif, Georgia, serif",
      }}
    >
      <h1 style={{ fontSize: "2.25rem", fontWeight: 600, color: "#084c61", marginBottom: "0.5rem" }}>
        What's new
      </h1>
      <p style={{ fontSize: "1.05rem", color: "#323031", opacity: 0.75, marginBottom: "3rem", maxWidth: "48ch" }}>
        A running log of what's changed on Elikonas, in plain language.
      </p>
      <div>
        {entries.map((entry, i) => (
          <section
            key={entry.version}
            style={{
              paddingBottom: "2rem",
              marginBottom: "2rem",
              borderBottom: i === entries.length - 1 ? "none" : "1px solid rgba(23, 126, 137, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.75rem" }}>
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
                v{entry.version}
              </span>
              <span
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontSize: "0.85rem",
                  color: "#323031",
                  opacity: 0.6,
                }}
              >
                {entry.date}
              </span>
            </div>
            <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
              {entry.items.map((item, idx) => (
                <li key={idx} style={{ fontSize: "1.05rem", lineHeight: 1.6, marginBottom: "0.4rem" }}>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
