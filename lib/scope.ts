import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { cache } from "react";

import { describeDbError } from "./dbErrors";
import { PATH_HEADER, SESSION_COOKIE, readSessionToken, type SessionPayload } from "./session";
import { getUserFresh, invalidateUserCache, listUsers, type UserRow } from "./users";

// Who is signed in. Only ADMIN users sign in to the dashboard. proxy.ts already
// turns away requests without a validly signed cookie; these helpers also check
// the user row, so a disabled user, a changed password or "sign out
// everywhere" ends a session (within the users cache, ~10 s).

function isSignedIn(user: UserRow | null | undefined, payload: SessionPayload): user is UserRow {
  return !!user && user.active && user.role === "ADMIN" && user.sessionVersion === payload.ver;
}

// The cached list can be a few seconds behind a change made in another bundle
// or server instance: a session issued after a password change carries a newer
// version than the cache knows. Before refusing a validly signed cookie, check
// the database.
async function signedInAdmin(payload: SessionPayload, users: UserRow[]): Promise<UserRow | null> {
  const cached = users.find((u) => u.id === payload.sub);
  if (isSignedIn(cached, payload)) return cached;
  const fresh = await getUserFresh(payload.sub);
  if (!isSignedIn(fresh, payload)) return null;
  invalidateUserCache();
  return fresh;
}

const UNAUTHENTICATED = { error: "Not signed in. Open /admin and log in again.", code: "unauthenticated" };

/** For API route handlers: the signed-in admin, or the response to return (401 signed out, 503 database down). */
export async function requireAdmin(req: NextRequest): Promise<UserRow | NextResponse> {
  const payload = await readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!payload) return NextResponse.json(UNAUTHENTICATED, { status: 401 });
  let admin: UserRow | null;
  try {
    admin = await signedInAdmin(payload, await listUsers());
  } catch (e) {
    return NextResponse.json({ error: describeDbError(e) }, { status: 503 });
  }
  return admin ?? NextResponse.json(UNAUTHENTICATED, { status: 401 });
}

/** requireAdmin for routes that don't need the admin: the response to return, or null to go on. */
export async function adminOnly(req: NextRequest): Promise<NextResponse | null> {
  const admin = await requireAdmin(req);
  return admin instanceof NextResponse ? admin : null;
}

export type PageAdmin = UserRow & {
  /** The database did not answer: the admin comes from the signed cookie, and pages show their own errors. */
  degraded?: boolean;
};

// The login page, coming back to the requested page after sign-in.
async function loginRedirect(): Promise<never> {
  const path = (await headers()).get(PATH_HEADER) || "";
  redirect(path.startsWith("/admin") ? `/admin/login?next=${encodeURIComponent(path)}` : "/admin/login");
}

async function loadPageAdmin(): Promise<PageAdmin> {
  const jar = await cookies();
  const payload = await readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!payload) return loginRedirect();
  let admin: UserRow | null;
  try {
    admin = await signedInAdmin(payload, await listUsers());
  } catch {
    // Database down: draw the shell from the signed cookie; each page reports the error itself.
    return {
      id: payload.sub,
      username: payload.usr,
      name: payload.nm || payload.usr,
      role: "ADMIN",
      active: true,
      sessionVersion: payload.ver,
      lastLoginAt: null,
      createdAt: new Date(0),
      degraded: true,
    };
  }
  if (!admin) return loginRedirect();
  return admin;
}

/** For server components: the signed-in admin of this render (redirects to the login page otherwise). */
export const pageAdmin = cache(loadPageAdmin);
