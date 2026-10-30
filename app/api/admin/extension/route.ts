import { NextRequest, NextResponse } from "next/server";
import { describeDbError } from "@/lib/dbErrors";
import { getExtensionSettings, saveExtensionSettings } from "@/lib/extensionSettings";
import { listExtensionBrowsers } from "@/lib/extensionTokens";
import { adminScope, requireOneUser, viewingUserId } from "@/lib/scope";

export const dynamic = "force-dynamic";

// Admin → Extension: the browsers signed in to the extension and each user's
// extension settings, for the user being viewed (or everyone).
export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const one = viewingUserId(scope);
  const users = one == null ? scope.users : scope.users.filter((u) => u.id === one);
  try {
    const [browsers, settings] = await Promise.all([
      listExtensionBrowsers(one == null ? null : [one]),
      Promise.all(users.map(async (u) => ({ userId: u.id, settings: await getExtensionSettings(u.id) }))),
    ]);
    return NextResponse.json({ browsers, settings });
  } catch (e) {
    return NextResponse.json({ error: describeDbError(e) }, { status: 500 });
  }
}

// PUT { easyApplyMode?, easyApplyMinScore?, jobLimit?, hideApproved?, betaMode?, sendLogs? }
// → the viewed user's extension settings; the popup picks them up when it next opens.
export async function PUT(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const userId = requireOneUser(scope);
  if (userId instanceof NextResponse) return userId;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    return NextResponse.json({ settings: await saveExtensionSettings(userId, body) });
  } catch (e) {
    return NextResponse.json({ error: describeDbError(e) }, { status: 500 });
  }
}
