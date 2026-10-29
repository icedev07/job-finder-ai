import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FEED_KEYS, getFeed, runFeedScan } from "@/lib/scrapers";
import { analyzeAllPending } from "@/lib/jobAnalyzer";
import { syncApprovedJobsToSheet } from "@/lib/googleSheetsSync";
import { getAllConfig } from "@/lib/config";
import { safeEqual } from "@/lib/adminAuth";
import { adminOnly } from "@/lib/scope";

export const dynamic = "force-dynamic";

// Vercel caps this route at 60s. Keep the working window under that.
const FUNCTION_BUDGET_MS = 55_000;
// A single board scan now scrapes AND analyzes inline, so it needs a real
// working window — but leave headroom for the response + sheet sync.
const SINGLE_BOARD_BUDGET_MS = 48_000;
// A board needs at least this much wall-clock to scrape + run one AI batch.
const MIN_BOARD_BUDGET_MS = 24_000;
// Don't start the (optional) Google Sheets sync once we're this deep into the
// function — a slow sync must never push the request past the 60s cap.
const SYNC_CUTOFF_MS = 50_000;

type RunOutcome = {
  board: string;
  jobsFound: number;
  jobsSaved: number;
  jobsRefreshed: number;
  jobsRescanned: number;
  approved: number;
  rejected: number;
  unanalyzed: number;
  durationMs: number;
  error?: string;
  warning?: string;
};

function blankOutcome(board: string, durationMs: number): RunOutcome {
  return {
    board,
    jobsFound: 0,
    jobsSaved: 0,
    jobsRefreshed: 0,
    jobsRescanned: 0,
    approved: 0,
    rejected: 0,
    unanalyzed: 0,
    durationMs,
  };
}

async function runOne(
  board: string,
  preloadedConfig?: Record<string, string>,
  timeBudgetMs?: number,
): Promise<RunOutcome> {
  const startedAt = Date.now();
  let outcome: RunOutcome = blankOutcome(board, 0);
  try {
    if (!getFeed(board)) {
      throw new Error(
        `Scanner "${board}" is not implemented in the cloud runner. ` +
          `Available: ${FEED_KEYS.join(", ")}.`,
      );
    }
    const result = await runFeedScan(board, preloadedConfig, { timeBudgetMs });
    outcome = {
      board,
      jobsFound: result.found,
      jobsSaved: result.saved,
      jobsRefreshed: result.refreshed,
      jobsRescanned: result.rescanned,
      approved: result.approved,
      rejected: result.rejected,
      unanalyzed: result.unanalyzed,
      durationMs: Date.now() - startedAt,
      warning: result.warning,
    };
  } catch (err) {
    outcome = {
      ...blankOutcome(board, Date.now() - startedAt),
      error: (err as Error).message || String(err),
    };
  }

  await prisma.scanLog.create({
    data: {
      board: outcome.board,
      jobsFound: outcome.jobsFound,
      // saved + rescanned in jobsSaved so dashboards keep their meaning — both
      // are jobs that received a fresh AI verdict this run.
      jobsSaved: outcome.jobsSaved + outcome.jobsRescanned,
      errors: outcome.error || outcome.warning || null,
      durationMs: outcome.durationMs,
    },
  });

  return outcome;
}

// Scrape + analyze feeds in sequence, giving each board a real working window.
// Boards not reached before the function budget runs out are simply processed
// on the next run — nothing is left half-stored, and no PENDING rows are
// created, so re-running is always safe.
async function runAllSequential(
  sharedConfig: Record<string, string>,
  functionStartedAt: number,
): Promise<RunOutcome[]> {
  const outcomes: RunOutcome[] = [];
  for (const key of FEED_KEYS) {
    const remaining = FUNCTION_BUDGET_MS - (Date.now() - functionStartedAt);
    if (remaining < MIN_BOARD_BUDGET_MS) break;
    // Cap each board so several boards get touched per run instead of one board
    // eating the whole budget.
    const budget = Math.min(30_000, remaining - 4_000);
    outcomes.push(await runOne(key, sharedConfig, budget));
  }
  return outcomes;
}

// Push freshly-approved jobs to Google Sheets — but only when there is enough
// of the 60s function budget left to finish safely. When skipped, the next
// scan run (or the analyze route) picks the rows up.
async function maybeSheetSync(functionStartedAt: number): Promise<number> {
  if (Date.now() - functionStartedAt > SYNC_CUTOFF_MS) return 0;
  try {
    const r = await syncApprovedJobsToSheet();
    return r.synced;
  } catch {
    // Sheets sync is optional — never block a scan on it.
    return 0;
  }
}

function sumOutcomes(outcomes: RunOutcome[]) {
  return {
    jobsFound: outcomes.reduce((s, o) => s + o.jobsFound, 0),
    jobsSaved: outcomes.reduce((s, o) => s + o.jobsSaved, 0),
    jobsRefreshed: outcomes.reduce((s, o) => s + o.jobsRefreshed, 0),
    jobsRescanned: outcomes.reduce((s, o) => s + o.jobsRescanned, 0),
    approved: outcomes.reduce((s, o) => s + o.approved, 0),
    rejected: outcomes.reduce((s, o) => s + o.rejected, 0),
    unanalyzed: outcomes.reduce((s, o) => s + o.unanalyzed, 0),
  };
}

function outcomeBody(o: RunOutcome) {
  return {
    jobsFound: o.jobsFound,
    jobsSaved: o.jobsSaved,
    jobsRefreshed: o.jobsRefreshed,
    jobsRescanned: o.jobsRescanned,
    approved: o.approved,
    rejected: o.rejected,
    unanalyzed: o.unanalyzed,
    durationMs: o.durationMs,
    warning: o.warning,
  };
}

export async function POST(req: NextRequest) {
  const denied = await adminOnly(req);
  if (denied) return denied;
  const functionStartedAt = Date.now();
  let body: { board?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const board = (body.board || "").trim();

  if (!board) {
    return NextResponse.json({ success: false, error: "board is required" }, { status: 400 });
  }

  if (board === "all") {
    const sharedConfig = await getAllConfig();
    const outcomes = await runAllSequential(sharedConfig, functionStartedAt);
    const sheetsSynced = await maybeSheetSync(functionStartedAt);
    const errors = outcomes.filter((o) => o.error).map((o) => `${o.board}: ${o.error}`);
    return NextResponse.json({
      success: errors.length === 0,
      ...sumOutcomes(outcomes),
      sheetsSynced,
      outcomes,
      ...(errors.length ? { error: errors.join("; ") } : {}),
    });
  }

  const outcome = await runOne(board, undefined, SINGLE_BOARD_BUDGET_MS);
  const sheetsSynced = await maybeSheetSync(functionStartedAt);
  if (outcome.error) {
    return NextResponse.json(
      { success: false, error: outcome.error, ...outcomeBody(outcome), sheetsSynced },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true, ...outcomeBody(outcome), sheetsSynced });
}

export async function GET(req: NextRequest) {
  // Vercel cron triggers this via GET and sends "Authorization: Bearer
  // $CRON_SECRET" when that env var is set. The secret is required: without it
  // anyone could start scans and spend AI quota (or Claude credit).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    await prisma.scanLog
      .create({
        data: {
          board: "cron",
          errors: "Daily scan skipped: set the CRON_SECRET environment variable in Vercel to enable it.",
          durationMs: 0,
        },
      })
      .catch(() => {});
    return NextResponse.json(
      { success: false, error: "CRON_SECRET is not set. Add it in Vercel → Settings → Environment Variables." },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization") || "";
  if (!safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const functionStartedAt = Date.now();
  const sharedConfig = await getAllConfig();
  // Each board scrapes AND analyzes inline, so a single 60s run only covers a
  // few boards. The remaining boards are picked up on the next cron tick — and
  // because unanalyzed jobs are never stored, re-running is free of side
  // effects. Run the cron more frequently (or use "Scrape all sources" in the
  // admin UI, which loops every board client-side) for full coverage.
  const outcomes = await runAllSequential(sharedConfig, functionStartedAt);

  // Drain any leftover PENDING rows (e.g. from a rescan reset or a pre-upgrade
  // backlog) with whatever budget is left.
  const remaining = FUNCTION_BUDGET_MS - (Date.now() - functionStartedAt);
  let analyzed:
    | { analyzed: number; approved: number; rejected: number; skipped: number; remaining: number; timedOut: boolean }
    | { error: string }
    | { skipped: true } = { skipped: true };
  if (remaining > 8_000) {
    try {
      analyzed = await analyzeAllPending({ timeBudgetMs: remaining });
    } catch (err) {
      analyzed = { error: (err as Error).message };
    }
  }

  const sheetsSynced = await maybeSheetSync(functionStartedAt);

  return NextResponse.json({
    success: true,
    ...sumOutcomes(outcomes),
    outcomes,
    analyzed,
    sheetsSynced,
  });
}
