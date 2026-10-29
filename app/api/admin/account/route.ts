import { NextRequest, NextResponse } from "next/server";
import { describeDbError } from "@/lib/dbErrors";
import { requireAdmin } from "@/lib/scope";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";
import { UserError, getUserFresh, isOwner, setUserPassword, usesDefaultPassword, verifyOwnPassword } from "@/lib/users";

export const dynamic = "force-dynamic";

// The signed-in admin's own account (Settings → Your password).

// GET → who I am, and whether my password can be changed here.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const owner = await isOwner(admin.id);
  return NextResponse.json({
    user: { id: admin.id, username: admin.username, name: admin.name },
    passwordFromEnv: owner && !!process.env.ADMIN_PASSWORD?.trim(),
    usingDefaultPassword: await usesDefaultPassword(admin.id).catch(() => false),
  });
}

// PUT { current, password } → change my password. Every other browser is
// signed out; this one gets a fresh session.
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  let body: { current?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const current = typeof body.current === "string" ? body.current : "";
  const password = typeof body.password === "string" ? body.password : "";
  try {
    if ((await isOwner(admin.id)) && process.env.ADMIN_PASSWORD?.trim()) {
      throw new UserError("Your password is set by the ADMIN_PASSWORD environment variable — change it in your hosting settings.");
    }
    if (!(await verifyOwnPassword(admin.id, current))) {
      throw new UserError("Your current password is wrong.", 403);
    }
    await setUserPassword(admin.id, password);
    const me = await getUserFresh(admin.id);
    const res = NextResponse.json({ ok: true });
    if (me) res.cookies.set(SESSION_COOKIE, await createSessionToken(me), sessionCookieOptions());
    return res;
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: describeDbError(e) }, { status: 500 });
  }
}
