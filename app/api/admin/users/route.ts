import { NextRequest, NextResponse } from "next/server";
import { describeDbError } from "@/lib/dbErrors";
import { requireAdmin } from "@/lib/scope";
import { UserError, createUser, listUsers, toListItems } from "@/lib/users";

export const dynamic = "force-dynamic";

// GET → every user, oldest first.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  return NextResponse.json({ users: await toListItems(await listUsers(), admin.id) });
}

// POST { username, name, password, role } → add a user.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const user = await createUser({
      username: body.username,
      name: body.name,
      password: typeof body.password === "string" ? body.password : "",
      role: body.role,
    });
    return NextResponse.json({ ok: true, user: (await toListItems([user], admin.id))[0] });
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: describeDbError(e) }, { status: 500 });
  }
}
