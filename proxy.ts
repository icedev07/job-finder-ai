import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// The single gate in front of the admin (Next 16 "proxy", formerly middleware).
//   - /api/admin/**  → 401 JSON without a valid session, except /api/admin/auth
//     (sign in/out) and the Vercel cron GET on /api/admin/scanners/run, which
//     checks "Authorization: Bearer $CRON_SECRET" itself.
//   - /admin/**      → redirect to /admin/login (the login page itself is open).
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/api/admin")) {
    if (pathname === "/api/admin/auth") return NextResponse.next();
    if (pathname === "/api/admin/scanners/run" && req.method === "GET") return NextResponse.next();
    const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!ok) {
      return NextResponse.json(
        { error: "Not signed in. Open /admin and log in again.", code: "unauthenticated" },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  if (pathname === "/admin/login") return NextResponse.next();
  const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*", "/admin/:path*", "/admin"],
};
