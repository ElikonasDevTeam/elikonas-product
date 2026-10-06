"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/app/components/avatar";

// sessionStorage, not a prop — nav renders on every page and no page
// currently fetches the signed-in user's own avatar_url just for this.
// Cleared by app/profile/avatar-modal.tsx on upload/remove. Own avatar
// always shows regardless of show_profile_photo (the viewer IS the owner).
const AVATAR_CACHE_KEY = "avatar_url";
// Distinguishes "cached: no avatar" from "not cached yet" in sessionStorage,
// which can only hold strings.
const NO_AVATAR_SENTINEL = "__none__";

// Raw sessionStorage read, or null if nothing is cached yet — kept
// separate from the "no avatar" sentinel decoding below.
function readRawAvatarCache(): string | null {
  try {
    return sessionStorage.getItem(AVATAR_CACHE_KEY);
  } catch {
    return null; // Private/locked-down browser contexts can throw — treat as uncached.
  }
}

export function NavUserMenu({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);
  // Lazy initializer, not an effect — a cache hit then shows the real
  // avatar on the very first paint instead of a flash of initials, and
  // avoids a cascading-render setState-in-effect.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    const raw = readRawAvatarCache();
    return raw && raw !== NO_AVATAR_SENTINEL ? raw : null;
  });
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (readRawAvatarCache() !== null) return; // already seeded from the initializer above

    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      const url = (data?.avatar_url as string | null) ?? null;
      setAvatarUrl(url);
      try {
        sessionStorage.setItem(AVATAR_CACHE_KEY, url ?? NO_AVATAR_SENTINEL);
      } catch {
        // Worst case this just refetches next mount — not worth failing over.
      }
    })();
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Account menu"
        className="rounded-full transition-opacity hover:opacity-85"
      >
        <Avatar
          name={userName}
          size="h-8 w-8 text-[11px]"
          colorClassName="bg-[#ffc857] text-[#084c61]"
          avatarUrl={avatarUrl}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-[#323031] transition-colors hover:bg-gray-50"
          >
            Account settings
          </Link>
          <div className="mx-4 border-t border-gray-100" />
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2.5 text-left text-sm text-[#323031] transition-colors hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
