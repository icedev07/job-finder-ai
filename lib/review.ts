import { APP_ACTOR, recordEvents, type Actor } from "./applicationEvents";
import { updateJobs } from "./jobActions";
import { prisma } from "./prisma";
import type { UserSettings } from "./userSettings";

// The Review queue: recent verdicts close to the approval line, waiting for a
// person's yes or no. Each user has their own score band and can have Review
// turned off (their close calls just keep the AI verdict). A job leaves the
// queue when it is approved, rejected or kept as the AI judged it here
// (reviewedAt; "Mark all reviewed" keeps the whole queue at once), or when it
// is rated or put in the pipeline anywhere else. Approve and Reject are
// answers for AI → Evaluations; Keep is not.

export const REVIEW_WINDOW_DAYS = 30;

type QueueUser = { id: number; settings: UserSettings };

export type ReviewAction = "approve" | "reject" | "keep";

/** What Undo needs. The client keeps it and sends it back unchanged. */
export type ReviewUndo =
  | { kind: "keep"; at: string }
  | { kind: "decide"; at: string; jobs: { id: number; status: "APPROVED" | "REJECTED"; inSheet: boolean }[] };

export const MAX_REVIEW_IDS = 500;

export function hasReview(users: QueueUser[]): boolean {
  return users.some((u) => u.settings.reviewEnabled);
}

/** The queue's filter: these users' close calls (only users with Review on). */
export function reviewQueueWhere(users: QueueUser[], now = new Date()) {
  return {
    status: { in: ["APPROVED", "REJECTED"] as ("APPROVED" | "REJECTED")[] },
    feedback: null,
    stage: null,
    reviewedAt: null,
    createdAt: { gte: new Date(now.getTime() - REVIEW_WINDOW_DAYS * 24 * 60 * 60_000) },
    OR: users
      .filter((u) => u.settings.reviewEnabled)
      .map((u) => ({ userId: u.id, aiScore: { gte: u.settings.reviewBandMin, lte: u.settings.reviewBandMax } })),
  };
}

/**
 * Approve, reject or keep these jobs (or, for keep, the whole queue) while
 * they still wait in these users' queue: a job decided meanwhile in another
 * tab is left as it is. Returns the approved ids, for the Google Sheet.
 */
export async function reviewJobs(
  users: QueueUser[],
  ids: number[] | "all",
  action: ReviewAction,
  actor: Actor = APP_ACTOR,
): Promise<{ updated: number; undo: ReviewUndo | null; approved: { id: number; userId: number; inSheet: boolean }[] }> {
  const none = { updated: 0, undo: null, approved: [] };
  if (!hasReview(users) || (ids !== "all" && ids.length === 0)) return none;
  const at = new Date();
  const where = { ...reviewQueueWhere(users, at), ...(ids === "all" ? {} : { id: { in: ids.slice(0, MAX_REVIEW_IDS) } }) };

  if (action === "keep") {
    // One timestamp for the whole batch: it is how Undo finds them.
    const updated = (await prisma.scrapedJob.updateMany({ where, data: { reviewedAt: at } })).count;
    return { updated, undo: updated ? { kind: "keep", at: at.toISOString() } : null, approved: [] };
  }

  const rows = await prisma.scrapedJob.findMany({ where, select: { id: true, userId: true, status: true, sheetSynced: true } });
  if (rows.length === 0) return none;
  const approve = action === "approve";
  const updated = await updateJobs(
    rows.map((r) => r.id),
    { feedback: approve ? 1 : -1, status: approve ? "APPROVED" : "REJECTED", reviewedAt: at },
    { now: at, actor },
  );
  return {
    updated,
    undo: {
      kind: "decide",
      at: at.toISOString(),
      jobs: rows.map((r) => ({ id: r.id, status: r.status === "APPROVED" ? "APPROVED" : "REJECTED", inSheet: r.sheetSynced })),
    },
    approved: approve ? rows.map((r) => ({ id: r.id, userId: r.userId, inSheet: r.sheetSynced })) : [],
  };
}

/** Checks an Undo sent back by the client: the value, or an error message. */
export function parseReviewUndo(raw: unknown): ReviewUndo | string {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.at !== "string" || Number.isNaN(Date.parse(r.at))) return "undo.at must be the time Review returned";
  if (r.kind === "keep") return { kind: "keep", at: r.at };
  if (r.kind !== "decide" || !Array.isArray(r.jobs) || r.jobs.length > MAX_REVIEW_IDS) return "Unknown undo";
  const jobs: { id: number; status: "APPROVED" | "REJECTED"; inSheet: boolean }[] = [];
  for (const j of r.jobs as Record<string, unknown>[]) {
    if (!j || !Number.isInteger(j.id) || (j.id as number) <= 0) return "undo.jobs[].id must be a job id";
    if (j.status !== "APPROVED" && j.status !== "REJECTED") return "undo.jobs[].status must be APPROVED or REJECTED";
    jobs.push({ id: j.id as number, status: j.status, inSheet: j.inSheet === true });
  }
  return { kind: "decide", at: r.at, jobs };
}

/**
 * Reverse a Review action for these users' jobs: they go back to the queue
 * with the AI verdict they had. Jobs changed since (another decision, a
 * pipeline move) are left alone. A row the approval added to the Google Sheet
 * stays there: leftInSheet counts them. unsaved: the jobs that left Saved
 * again (their Stage in the sheet is cleared).
 */
export async function undoReview(
  userIds: number[],
  undo: ReviewUndo,
  actor: Actor = APP_ACTOR,
): Promise<{ updated: number; leftInSheet: number; unsaved: number[] }> {
  const at = new Date(undo.at);
  if (undo.kind === "keep") {
    const r = await prisma.scrapedJob.updateMany({
      where: { reviewedAt: at, feedback: null, userId: { in: userIds } },
      data: { reviewedAt: null },
    });
    return { updated: r.count, leftInSheet: 0, unsaved: [] };
  }

  const current = await prisma.scrapedJob.findMany({
    where: { id: { in: undo.jobs.map((j) => j.id) }, reviewedAt: at, userId: { in: userIds } },
    select: { id: true, userId: true, sheetSynced: true, stage: true },
  });
  const live = new Map(current.map((r) => [r.id, r.sheetSynced]));
  if (live.size === 0) return { updated: 0, leftInSheet: 0, unsaved: [] };
  // An approval put the job in Applications as Saved; it leaves again, unless moved on since.
  const saved = current.filter((r) => r.stage === "SAVED");
  if (saved.length) {
    await prisma.scrapedJob.updateMany({
      where: { id: { in: saved.map((r) => r.id) }, stage: "SAVED" },
      data: { stage: null, stageUpdatedAt: null },
    });
    await recordEvents(
      saved.map((r) => ({ jobId: r.id, userId: r.userId, kind: "stage" as const, fromStage: "SAVED", toStage: null, detail: { undone: true } })),
      actor,
    );
  }
  let updated = 0;
  for (const status of ["APPROVED", "REJECTED"] as const) {
    const ids = undo.jobs.filter((j) => j.status === status && live.has(j.id)).map((j) => j.id);
    if (ids.length === 0) continue;
    const r = await prisma.scrapedJob.updateMany({
      where: { id: { in: ids } },
      data: { status, feedback: null, feedbackAt: null, reviewedAt: null },
    });
    updated += r.count;
  }
  const leftInSheet = undo.jobs.filter((j) => j.status === "REJECTED" && !j.inSheet && live.get(j.id) === true).length;
  return { updated, leftInSheet, unsaved: saved.map((r) => r.id) };
}
