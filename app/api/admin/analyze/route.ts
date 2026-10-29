import { NextRequest, NextResponse } from "next/server";
import { analyzeAllPending } from "@/lib/jobAnalyzer";
import { syncApprovedJobsToSheet } from "@/lib/googleSheetsSync";
import { adminOnly } from "@/lib/scope";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await adminOnly(req);
  if (denied) return denied;
  let body: { limit?: number; timeBudgetMs?: number } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const result = await analyzeAllPending({
      limit: body.limit,
      timeBudgetMs: body.timeBudgetMs,
    });

    // Google Sheets sync is the slow tail of this request. The admin UI calls
    // this route in a loop, so syncing after every mid-loop call repeated the
    // same work ~10×. Sync only once the run is actually terminal — the queue
    // is drained, or it stopped on a rate limit / batch error. The sync writes
    // every unsynced approved row, so one run at the end covers the backlog.
    let syncResult = { synced: 0 };
    const terminal =
      result.remaining === 0 || !!result.rateLimited || !!result.batchError;
    if (terminal) {
      try {
        syncResult = await syncApprovedJobsToSheet();
      } catch {
        // sheets sync is optional — never block the analyze cycle on it
      }
    }

    return NextResponse.json({
      success: true,
      ...result,
      sheetsSynced: syncResult.synced,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
