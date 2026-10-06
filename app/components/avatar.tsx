// Shared initials circle, consolidating what used to be five near-identical
// local implementations (musings, groups, people, tidings, nav) plus two
// inline copies (the profile hero on the own/public profile pages). `size`
// is a literal Tailwind size string (e.g. "h-10 w-10 text-sm") rather than
// a semantic sm/md/lg scale — the four old local components each mapped
// those names to *different* pixel sizes, so a shared semantic scale would
// have silently resized several of them. Passing the exact literal string
// each call site already resolved to keeps this a pure refactor.
//
// Two initials algorithms genuinely coexisted before this refactor, and
// disagree for 3+-word names: the five list-style avatars took the first
// two words' initials, while the two profile-hero avatars took the first
// and *last* word's initials. Preserved both via `initialsStrategy` rather
// than silently picking one.
export function getInitials(
  name: string,
  strategy: "first-two" | "first-last" = "first-two"
): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (strategy === "first-last") {
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// avatar_url (as stored on profiles) is a Storage object path, not a URL —
// the "avatars" bucket is public, so the permanent public URL is derived
// here rather than persisted. Safe to call on both server and client since
// NEXT_PUBLIC_SUPABASE_URL is inlined at build time either way.
export function getAvatarPublicUrl(avatarPath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${avatarPath}`;
}

export function Avatar({
  name,
  size,
  colorClassName = "bg-[#084c61] text-[#ffc857]",
  initialsStrategy = "first-two",
  avatarUrl,
}: {
  name: string;
  size: string;
  colorClassName?: string;
  initialsStrategy?: "first-two" | "first-last";
  // The caller decides visibility (owner-vs-viewer, show_profile_photo) —
  // this component just renders whatever path it's handed, or falls back
  // to initials when there's nothing to show.
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={getAvatarPublicUrl(avatarUrl)}
        alt={name}
        className={`${size} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${size} ${colorClassName} shrink-0 flex items-center justify-center rounded-full font-bold`}
    >
      {getInitials(name, initialsStrategy)}
    </div>
  );
}
