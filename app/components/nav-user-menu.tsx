"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function NavUserMenu({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
    router.push("/login");
  }

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Account menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffc857] text-[11px] font-bold text-[#084c61] transition-opacity hover:opacity-85"
      >
        {initials(userName)}
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
