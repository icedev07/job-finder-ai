import { NextRequest, NextResponse } from "next/server";
import { fullSyncToSheet, syncApprovedJobsToSheet, userSheetPlan } from "@/lib/googleSheetsSync";
import { adminScope, viewingUserId } from "@/lib/scope";

// Sync Sheets: rewrite the Jobs tab of the user being viewed and add their
// missing LinkedIn rows; with all users, of every user whose jobs go to a
// sheet (one failing does not stop the others). { pending: true } only sends
// the approved jobs not in a sheet yet (Settings → Google Sheet → Send now):
// nothing is rewritten.
export async function POST(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  let body: { pending?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  try {
    const one = viewingUserId(scope);
    if (body?.pending === true) {
      return NextResponse.json({ success: true, ...(await syncApprovedJobsToSheet(one ?? undefined)) });
    }
    if (one != null) return NextResponse.json({ success: true, ...(await fullSyncToSheet(one)) });
    let synced = 0;
    let sheets = 0;
    const failed: string[] = [];
    for (const user of scope.users.filter((u) => u.active)) {
      if (!(await userSheetPlan(user.id)).ok) continue;
      sheets++;
      try {
        synced += (await fullSyncToSheet(user.id)).synced;
      } catch (err) {
        failed.push(`${user.name}: ${(err as Error)?.message || err}`);
      }
    }
    if (!sheets) throw new Error("No user's jobs go to a Google Sheet yet (Settings → Google Sheets).");
    if (failed.length === sheets) throw new Error(failed.join(" "));
    return NextResponse.json({ success: true, synced, sheets, ...(failed.length ? { failed } : {}) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
