import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { cache } from "react";

import type { Actor } from "./applicationEvents";
import { describeDbError } from "./dbErrors";
import { PATH_HEADER, SESSION_COOKIE, readSessionToken, type SessionPayload } from "./session";
import { isWrite, markStatusStale } from "./statusCache";
import { getUserFresh, invalidateUserCache, listUsers, listUsersWith, type UserRow } from "./users";
import { getUserSettings, type UserSettings } from "./userSettings";

// Who is signed in, and whose data a request works on.
//
// Only ADMIN users sign in to the dashboard. proxy.ts already turns away
// requests without a validly signed cookie; these helpers also check the user
// row, so a disabled user, a changed password or "sign out everywhere" ends a
// session (within the users cache, ~10 s).
//
// Admins pick whose data to see in the Viewing menu: one user, or all of them.
// The choice travels with every API request (the X-JF-View header that
// lib/clientApi adds, or ?user= on download links), so two tabs viewing
// different users never mix them up. The jf_view cookie only remembers the
// last choice for server-rendered pages and new tabs.

export const VIEW_COOKIE = "jf_view";
export const VIEW_HEADER = "x-jf-view";

export type Viewing = number | "all";

export type AdminScope = {
  admin: UserRow;
  users: UserRow[];
  /** One user's id, or "all". With a single user it is always that user. */
  viewing: Viewing;
  /** The database did not answer: the admin comes from the signed cookie, and pages show their own errors. */
  degraded?: boolean;
};

export function parseViewing(raw: string | null | undefined): Viewing | null {
  if (!raw) return null;
  if (raw === "all") return "all";
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The one user a Viewing value names, if any. */
function viewedId(raw: string | null | undefined): number | null {
  const v = parseViewing(raw);
  return typeof v === "number" ? v : null;
}

export function resolveViewing(raw: string | null | undefined, users: UserRow[]): Viewing {
  if (users.length === 1) return users[0].id;
  const v = parseViewing(raw);
  if (typeof v === "number" && users.some((u) => u.id === v)) return v;
  return "all";
}

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
  // A change is coming: the status strip and checklist read everything again.
  if (isWrite(req.method)) markStatusStale();
  let admin: UserRow | null;
  try {
    admin = await signedInAdmin(payload, await listUsers());
  } catch (e) {
    return NextResponse.json({ error: describeDbError(e) }, { status: 503 });
  }
  return admin ?? NextResponse.json(UNAUTHENTICATED, { status: 401 });
}

/** For API routes that work on users' data: the admin, the users and whose data to use. */
export async function adminScope(req: NextRequest): Promise<AdminScope | NextResponse> {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const raw = req.headers.get(VIEW_HEADER) ?? req.nextUrl.searchParams.get("user") ?? req.cookies.get(VIEW_COOKIE)?.value;
  let users: UserRow[];
  try {
    users = await listUsersWith(viewedId(raw));
  } catch (e) {
    return NextResponse.json({ error: describeDbError(e) }, { status: 503 });
  }
  return { admin, users, viewing: resolveViewing(raw, users) };
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

async function loadPageScope(): Promise<AdminScope> {
  const admin = await pageAdmin();
  if (admin.degraded) return { admin, users: [admin], viewing: admin.id, degraded: true };
  const jar = await cookies();
  const raw = jar.get(VIEW_COOKIE)?.value;
  let users: UserRow[];
  try {
    users = await listUsersWith(viewedId(raw));
  } catch {
    return { admin, users: [admin], viewing: admin.id, degraded: true };
  }
  return { admin, users, viewing: resolveViewing(raw, users) };
}

/** For server components: the admin and whose data this render shows (from the jf_view cookie). */
export const pageScope = cache(loadPageScope);

/** The viewed user's id, or null when viewing all users. */
/** The signed-in admin, as who made a change (an application's timeline). */
export function adminActor(scope: AdminScope): Actor {
  return { id: scope.admin.id, via: "dashboard" };
}

export function viewingUserId(scope: AdminScope): number | null {
  return scope.viewing === "all" ? null : scope.viewing;
}

/** A Prisma filter for the viewed user's rows ({} for all users). */
export function userWhere(scope: AdminScope): { userId?: number } {
  const id = viewingUserId(scope);
  return id == null ? {} : { userId: id };
}

export type ScopedUser = { id: number; user: UserRow; settings: UserSettings };

/** The users a scope covers, with their settings: the viewed one, or every user. */
export async function scopedUsers(scope: AdminScope): Promise<ScopedUser[]> {
  const list = scope.viewing === "all" ? scope.users : scope.users.filter((u) => u.id === scope.viewing);
  return Promise.all(list.map(async (user) => ({ id: user.id, user, settings: await getUserSettings(user.id) })));
}

export function inScope(scope: AdminScope, userId: number): boolean {
  return scope.viewing === "all" || scope.viewing === userId;
}

export const CHOOSE_USER_MESSAGE = "Pick a user in the Viewing menu first: this works on one user's data.";

/** The viewed user's id, or a 400 response when viewing all users. */
export function requireOneUser(scope: AdminScope): number | NextResponse {
  const id = viewingUserId(scope);
  if (id != null) return id;
  return NextResponse.json({ error: CHOOSE_USER_MESSAGE, code: "choose_user" }, { status: 400 });
}
