"use client";

import { useState } from "react";
import { AppShell } from "@/app/components/app-shell";

const TEASER_CARDS = [
  {
    icon: "📚",
    title: "Learning Resources",
    description: "Curated books and study materials for your pathway — hand-picked by educators and industry experts.",
  },
  {
    icon: "🛠️",
    title: "Supplies & Tools",
    description: "Everything you need to learn effectively, from notebooks and lab kits to software and hardware.",
  },
  {
    icon: "👕",
    title: "Elikonas Gear",
    description: "T-shirts, hoodies, mugs, and more with the Elikonas logo. Wear your learning with pride.",
  },
];

function TeaserCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <span className="mb-3 text-3xl">{icon}</span>
      <h3 className="mb-2 text-base font-semibold text-[#323031]">{title}</h3>
      <p className="text-sm leading-relaxed text-[#323031]/60">{description}</p>
    </div>
  );
}

function NotifyForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4">
        <span className="text-emerald-600">✓</span>
        <p className="text-sm font-medium text-emerald-700">
          Thanks! We'll let you know when the Book Store launches.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#177e89] focus:ring-1 focus:ring-[#177e89]"
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-[#084c61] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#177e89]"
      >
        Notify me when it's live
      </button>
    </form>
  );
}

export function BookstoreView({
  currentUserName,
  unreadCount,
  unreadTidingsCount,
  pendingConnectionsCount,
}: {
  currentUserName: string;
  unreadCount: number;
  unreadTidingsCount: number;
  pendingConnectionsCount: number;
}) {
  return (
    <AppShell
      currentUserName={currentUserName}
      unreadCount={unreadCount}
      unreadTidingsCount={unreadTidingsCount}
      pendingConnectionsCount={pendingConnectionsCount}
      activePage="bookstore"
    >
      <main className="mx-auto max-w-4xl px-6 py-16">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center rounded-full bg-[#084c61]/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#084c61]">
            Coming Soon
          </div>
          <h1 className="mb-3 text-3xl font-bold text-[#323031]">Book Store</h1>
          <p className="text-base text-[#323031]/55">
            Books, supplies, and Elikonas gear — coming soon.
          </p>
        </div>

        {/* Teaser cards */}
        <div className="mb-12 grid gap-5 sm:grid-cols-3">
          {TEASER_CARDS.map((card) => (
            <TeaserCard key={card.title} {...card} />
          ))}
        </div>

        {/* Email signup */}
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h2 className="mb-1.5 text-base font-semibold text-[#323031]">Be the first to know</h2>
          <p className="mb-5 text-sm text-[#323031]/55">
            Enter your email and we'll notify you the moment the store goes live.
          </p>
          <NotifyForm />
        </div>
      </main>
    </AppShell>
  );
}
