import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// test.elikonas.com is retired — the app now lives at elikonas.com. This
// catches anyone who still lands on the old domain (stale bookmark, cached
// link, an old email) and bounces them to the same path on the real one.
// 308 (not 301/302) preserves the request method and body across the
// redirect, so a Server Action POST mid-flight on the old domain still
// completes correctly instead of silently becoming a broken GET.
const CANONICAL_HOST = "elikonas.com";
const LEGACY_HOSTS = new Set(["test.elikonas.com"]);

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  if (LEGACY_HOSTS.has(host)) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/signup");
  const isDashboardRoute =
    pathname.startsWith("/learner") ||
    pathname.startsWith("/provider") ||
    pathname === "/profile" || // /profile/<slug> is the public profile view — no auth required
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/ai-guide") ||
    pathname.startsWith("/musings") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/tidings") ||
    pathname.startsWith("/people") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/groups") ||
    pathname.startsWith("/bookstore") ||
    pathname.startsWith("/learning-library");

  if (!user && isDashboardRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
