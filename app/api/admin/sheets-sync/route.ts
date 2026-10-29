import { NextRequest, NextResponse } from "next/server";
import { fullSyncToSheet } from "@/lib/googleSheetsSync";
import { adminScope, viewingUserId } from "@/lib/scope";
import { sheetTargetFor } from "@/lib/googleSheetsSync";

// Rewrite the "Jobs" tab of the user being viewed; with all users, of every
// user whose sheet is set up.
export async function POST(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  try {
    const one = viewingUserId(scope);
    if (one != null) return NextResponse.json({ success: true, ...(await fullSyncToSheet(one)) });
    let synced = 0;
    let sheets = 0;
    for (const user of scope.users.filter((u) => u.active)) {
      if (!(await sheetTargetFor(user.id))) continue;
      synced += (await fullSyncToSheet(user.id)).synced;
      sheets++;
    }
    if (!sheets) throw new Error("No user has a Google Sheet set up yet (Settings → Google Sheets).");
    const result = { synced, sheets };
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
