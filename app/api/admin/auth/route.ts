import { NextRequest, NextResponse } from "next/server";
import {
  clearLoginFailures,
  clientIdFromHeaders,
  isDefaultPasswordActive,
  loginBlockedForMs,
  recordLoginFailure,
  verifyAdminPassword,
} from "@/lib/adminAuth";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/session";

export const dynamic = "force-dynamic";

// GET → is this browser signed in? (Also reports whether the default password
// is still active, so the admin can show a "change it" warning.)
export async function GET(req: NextRequest) {
  const authenticated = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!authenticated) return NextResponse.json({ authenticated: false });
  let usingDefaultPassword = false;
  try {
    usingDefaultPassword = await isDefaultPasswordActive();
  } catch {
    // Database unreachable — the session itself is still valid.
  }
  return NextResponse.json({ authenticated: true, usingDefaultPassword });
}

// POST { password } → sign in and set the session cookie.
export async function POST(req: NextRequest) {
  const clientId = clientIdFromHeaders(req.headers);
  const blockedMs = loginBlockedForMs(clientId);
  if (blockedMs > 0) {
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${Math.ceil(blockedMs / 60_000)} min.` },
      { status: 429 },
    );
  }

  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const check = await verifyAdminPassword(password);
    if (!check.ok) {
      recordLoginFailure(clientId);
      // A short pause makes scripted guessing slower.
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    clearLoginFailures(clientId);
    const token = await createSessionToken();
    const res = NextResponse.json({ ok: true, usingDefaultPassword: check.usingDefault });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      {
        error:
          "Cannot verify login (database may be unreachable). Check DATABASE_URL on Vercel and run prisma migrate deploy.",
        detail: message,
      },
      { status: 503 },
    );
  }
}

// DELETE → sign out.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return res;
}
