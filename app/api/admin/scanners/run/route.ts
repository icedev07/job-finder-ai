import { after, NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FEED_KEYS, getFeed, runFeedScan } from "@/lib/scrapers";
import { analyzeAllPending } from "@/lib/jobAnalyzer";
import { syncApprovedJobsToSheet } from "@/lib/googleSheetsSync";
import { getAllConfig, setConfigValue } from "@/lib/config";
import { safeEqual } from "@/lib/adminAuth";
import { adminScope, viewingUserId } from "@/lib/scope";

export const dynamic = "force-dynamic";

// Vercel caps this route at 60s. The scan keeps under 52s, so sending its
// approvals to the Google Sheets after the response (about 8s) fits too.
const FUNCTION_BUDGET_MS = 52_000;
// A single board scan scrapes AND analyzes inline, so it needs a real working
// window, with headroom for the response and the sheets.
const SINGLE_BOARD_BUDGET_MS = 46_000;
// A board needs at least this much wall-clock to scrape + run one AI batch.
const MIN_BOARD_BUDGET_MS = 24_000;

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

// userIds: judge for these users only; every active user who wants the board when omitted.
async function runOne(
  board: string,
  preloadedConfig?: Record<string, string>,
  timeBudgetMs?: number,
  userIds?: number[],
): Promise<RunOutcome> {
  const startedAt = Date.now();
  let outcome: RunOutcome = blankOutcome(board, 0);
  let perUser: { userId: number | null; saved: number; warning?: string }[] = [];
  try {
    if (!getFeed(board)) {
      throw new Error(
        `Scanner "${board}" is not implemented in the cloud runner. ` +
          `Available: ${FEED_KEYS.join(", ")}.`,
      );
    }
    const result = await runFeedScan(board, preloadedConfig, { timeBudgetMs, userIds });
    perUser = result.users.map((u) => ({ userId: u.userId, saved: u.saved + u.rescanned, warning: u.warning }));
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

  // One log row per user the board was judged for (one without a user when
  // the scan failed or nobody wants this board). saved + rescanned in
  // jobsSaved so dashboards keep their meaning — both are jobs that received a
  // fresh AI verdict this run.
  const rows = perUser.length ? perUser : [{ userId: null, saved: outcome.jobsSaved + outcome.jobsRescanned }];
  await prisma.scanLog.createMany({
    data: rows.map((r) => ({
      userId: r.userId,
      board: outcome.board,
      jobsFound: outcome.jobsFound,
      jobsSaved: r.saved,
      errors: outcome.error || ("warning" in r ? r.warning : outcome.warning) || null,
      durationMs: outcome.durationMs,
    })),
  });

  return outcome;
}

// Where the next scan of every board starts: the first board the last one did not reach.
const NEXT_BOARD_KEY = "scan_next_board";

// Scrape + analyze feeds in sequence, giving each board a real working window.
// A run starts where the last one stopped, so the boards at the end of the list
// get their turn too; boards not reached are processed by the next run.
// Nothing is left half-stored, and no PENDING rows are created, so re-running
// is always safe.
async function runAllSequential(
  sharedConfig: Record<string, string>,
  functionStartedAt: number,
  userIds?: number[],
): Promise<RunOutcome[]> {
  const outcomes: RunOutcome[] = [];
  const start = Math.max(0, FEED_KEYS.indexOf(sharedConfig[NEXT_BOARD_KEY] ?? ""));
  let i = 0;
  for (; i < FEED_KEYS.length; i++) {
    const remaining = FUNCTION_BUDGET_MS - (Date.now() - functionStartedAt);
    if (remaining < MIN_BOARD_BUDGET_MS) break;
    // Cap each board so several boards get touched per run instead of one board
    // eating the whole budget.
    const budget = Math.min(30_000, remaining - 4_000);
    outcomes.push(await runOne(FEED_KEYS[(start + i) % FEED_KEYS.length], sharedConfig, budget, userIds));
  }
  await setConfigValue(NEXT_BOARD_KEY, FEED_KEYS[(start + i) % FEED_KEYS.length]).catch(() => undefined);
  return outcomes;
}

// The approved jobs go to the users' Google Sheets right after the response:
// every approved job not in a sheet yet, so one a run could not send goes with
// the next. A failure is noted for the user (Settings → Google Sheet) and
// never fails the scan.
function sendToSheetsAfter(userId?: number): void {
  after(() => syncApprovedJobsToSheet(userId).catch(() => undefined));
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

// POST { board } — for the user being viewed, or every user who wants the board.
export async function POST(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const one = viewingUserId(scope);
  const userIds = one != null ? [one] : undefined;
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
    const outcomes = await runAllSequential(sharedConfig, functionStartedAt, userIds);
    sendToSheetsAfter(one ?? undefined);
    const errors = outcomes.filter((o) => o.error).map((o) => `${o.board}: ${o.error}`);
    return NextResponse.json({
      success: errors.length === 0,
      ...sumOutcomes(outcomes),
      outcomes,
      ...(errors.length ? { error: errors.join("; ") } : {}),
    });
  }

  const outcome = await runOne(board, undefined, SINGLE_BOARD_BUDGET_MS, userIds);
  sendToSheetsAfter(one ?? undefined);
  if (outcome.error) {
    return NextResponse.json({ success: false, error: outcome.error, ...outcomeBody(outcome) }, { status: 500 });
  }
  return NextResponse.json({ success: true, ...outcomeBody(outcome) });
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

  sendToSheetsAfter();

  return NextResponse.json({
    success: true,
    ...sumOutcomes(outcomes),
    outcomes,
    analyzed,
  });
}
