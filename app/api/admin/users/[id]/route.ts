import { NextRequest, NextResponse } from "next/server";
import { describeDbError } from "@/lib/dbErrors";
import { requireAdmin } from "@/lib/scope";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";
import {
  UserError,
  deleteUser,
  getUser,
  getUserFresh,
  isOwner,
  setUserPassword,
  signOutEverywhere,
  toListItems,
  updateUser,
} from "@/lib/users";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function fail(e: unknown) {
  if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: describeDbError(e) }, { status: 500 });
}

// PATCH, one of:
//   { name?, role?, active? }  → rename, change the role, disable / enable
//   { password }               → set a new password (signs them out everywhere)
//   { signOut: true }          → sign them out of every browser
// Your own password is changed in Settings (it asks for the current one).
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const id = Number((await params).id);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    if (!Number.isInteger(id) || !(await getUser(id))) throw new UserError("User not found.", 404);

    if (typeof body.password === "string") {
      if (id === admin.id) throw new UserError("Change your own password in Settings → Your password.");
      if ((await isOwner(id)) && process.env.ADMIN_PASSWORD?.trim()) {
        throw new UserError("This admin's password is set by the ADMIN_PASSWORD environment variable — change it there.");
      }
      await setUserPassword(id, body.password);
      return NextResponse.json({ ok: true });
    }

    if (body.signOut === true) {
      await signOutEverywhere(id);
      const res = NextResponse.json({ ok: true });
      // Signing yourself out everywhere keeps this browser signed in.
      if (id === admin.id) {
        const me = await getUserFresh(id);
        if (me) res.cookies.set(SESSION_COOKIE, await createSessionToken(me), sessionCookieOptions());
      }
      return res;
    }

    const user = await updateUser(id, { name: body.name, role: body.role, active: body.active }, admin.id);
    return NextResponse.json({ ok: true, user: (await toListItems([user], admin.id))[0] });
  } catch (e) {
    return fail(e);
  }
}

// DELETE → remove the user.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const id = Number((await params).id);
  try {
    if (!Number.isInteger(id)) throw new UserError("User not found.", 404);
    await deleteUser(id, admin.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
