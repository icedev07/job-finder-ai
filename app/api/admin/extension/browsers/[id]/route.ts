import { NextRequest, NextResponse } from "next/server";
import { describeDbError } from "@/lib/dbErrors";
import { revokeExtensionToken } from "@/lib/extensionTokens";
import { adminScope, viewingUserId } from "@/lib/scope";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// DELETE → sign one browser out of the extension. Only a browser of the user
// being viewed (any user's with all users shown), so a stale tab can't sign
// out someone else's.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Unknown browser" }, { status: 404 });
  const one = viewingUserId(scope);
  try {
    const revoked = await revokeExtensionToken(id, one == null ? undefined : [one]);
    if (!revoked) return NextResponse.json({ error: "That browser is already signed out." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: describeDbError(e) }, { status: 500 });
  }
}
