import { NextRequest, NextResponse } from "next/server";
import {
  clearLoginFailures,
  clientIdFromHeaders,
  loginBlockedForMs,
  recordLoginFailure,
} from "@/lib/adminAuth";
import { describeDbError } from "@/lib/dbErrors";
import { SESSION_COOKIE, createSessionToken, readSessionToken, sessionCookieOptions } from "@/lib/session";
import { getUserFresh, normalizeUsername, usesDefaultPassword, verifyLogin } from "@/lib/users";

export const dynamic = "force-dynamic";

// GET → is this browser signed in, and as whom? (Also reports whether the
// default password is still active, so the admin can show a "change it" warning.)
export async function GET(req: NextRequest) {
  const payload = await readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!payload) return NextResponse.json({ authenticated: false });
  try {
    const user = await getUserFresh(payload.sub);
    if (!user || !user.active || user.role !== "ADMIN" || user.sessionVersion !== payload.ver) {
      return NextResponse.json({ authenticated: false });
    }
    const usingDefaultPassword = await usesDefaultPassword(user.id).catch(() => false);
    return NextResponse.json({
      authenticated: true,
      usingDefaultPassword,
      user: { id: user.id, username: user.username, name: user.name },
    });
  } catch {
    // Database unreachable — the signed session itself is still valid.
    return NextResponse.json({ authenticated: true, user: { id: payload.sub, username: payload.usr, name: payload.nm } });
  }
}

// POST { username, password } → sign in and set the session cookie. A request
// without a user ID (an old cached login page) signs in as "admin".
export async function POST(req: NextRequest) {
  let username = "";
  let password = "";
  try {
    const body = await req.json();
    username = normalizeUsername(body?.username ?? "admin");
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const clientId = clientIdFromHeaders(req.headers);
  const blockedMs = loginBlockedForMs(clientId);
  if (blockedMs > 0) {
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${Math.ceil(blockedMs / 60_000)} min.` },
      { status: 429 },
    );
  }

  try {
    const result = await verifyLogin(username, password);
    if (!result.ok) {
      if (result.reason === "invalid") {
        recordLoginFailure(clientId);
        // A short pause makes scripted guessing slower.
        await new Promise((r) => setTimeout(r, 400));
        return NextResponse.json({ error: "Wrong user ID or password." }, { status: 401 });
      }
      clearLoginFailures(clientId);
      return NextResponse.json(
        {
          error:
            result.reason === "disabled"
              ? "This account is disabled. Ask an admin to turn it back on."
              : "This account signs in to the Chrome extension only. Ask an admin if you need the dashboard.",
        },
        { status: 403 },
      );
    }
    clearLoginFailures(clientId);
    const token = await createSessionToken(result.user);
    const res = NextResponse.json({
      ok: true,
      usingDefaultPassword: result.usingDefaultPassword,
      user: { id: result.user.id, username: result.user.username, name: result.user.name },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (e: unknown) {
    // Usually the database: unreachable, or not upgraded yet (no User table →
    // "Open /api/setup once …").
    return NextResponse.json({ error: `Cannot sign in right now. ${describeDbError(e)}` }, { status: 503 });
  }
}

// DELETE → sign out of this browser.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return res;
}
