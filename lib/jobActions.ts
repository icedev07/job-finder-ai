import type { Prisma } from "../generated/prisma";
import { APP_ACTOR, recordEvents, type Actor, type NewEvent } from "./applicationEvents";
import { prisma } from "./prisma";
import { isCloseReason, isJobStage, type CloseReason, type JobStage } from "./format";
import { getUserSettings, type UserSettings } from "./userSettings";

// Changes the admin makes to jobs (Jobs table, Review queue, Applications
// board, extension "Mark as applied"). One place for the rules:
//   - moving to APPLIED stamps appliedAt (once) and schedules a follow-up;
//   - INTERVIEW keeps / sets a follow-up; OFFER, REJECTED and ARCHIVED clear it;
//   - REJECTED closes an application as rejected by the company, ARCHIVED with
//     the reason given (or none); back in an open stage it has no reason;
//   - a manual approve/reject overrides the AI status (the routes send a job
//     approved by hand to its user's Google Sheet if it is not there yet);
//   - a job approved by hand enters the pipeline as Saved;
//   - with Applications off for a job's user, approving leaves it out of the
//     pipeline and no follow-up is scheduled;
//   - feedback (1 / -1 / null) is stored with its time, for Evaluations;
//   - reviewedAt is set by the Review queue only (lib/review.ts);
//   - stage changes, close reasons, follow-up dates and notes go on the
//     application's timeline, with who made them.

export type JobPatch = {
  stage?: JobStage | null;
  /** With stage ARCHIVED, or alone for jobs already archived. */
  closeReason?: CloseReason | null;
  feedback?: 1 | -1 | null;
  status?: "APPROVED" | "REJECTED";
  notes?: string | null;
  followUpAt?: string | null;
  /** Not accepted from requests: the Review queue sets it. */
  reviewedAt?: Date | null;
};

/** The reasons an archived application can have (Rejected is its own stage). */
const ARCHIVE_REASONS: CloseReason[] = ["WITHDREW", "POSITION_CLOSED", "NO_RESPONSE"];

export function parseJobPatch(raw: unknown): JobPatch | string {
  if (!raw || typeof raw !== "object") return "Expected an object";
  const r = raw as Record<string, unknown>;
  const patch: JobPatch = {};
  if ("stage" in r) {
    if (r.stage === null || r.stage === "NONE") patch.stage = null;
    else if (isJobStage(r.stage)) patch.stage = r.stage;
    else return `Unknown stage "${String(r.stage)}"`;
  }
  if ("closeReason" in r && r.closeReason !== undefined) {
    if (r.closeReason !== null && !isCloseReason(r.closeReason)) return `Unknown close reason "${String(r.closeReason)}"`;
    const reason = r.closeReason as CloseReason | null;
    if (patch.stage === "REJECTED") {
      if (reason !== null && reason !== "REJECTED") return "A rejected application's reason is REJECTED";
    } else if (patch.stage === undefined || patch.stage === "ARCHIVED") {
      if (reason !== null && !ARCHIVE_REASONS.includes(reason)) {
        return `An archived application's reason is one of ${ARCHIVE_REASONS.join(", ")}`;
      }
      patch.closeReason = reason;
    } else if (reason !== null) {
      return "Only a closed application (Rejected or Archived) has a close reason";
    }
  }
  if ("feedback" in r) {
    if (r.feedback === null || r.feedback === 0) patch.feedback = null;
    else if (r.feedback === 1 || r.feedback === -1) patch.feedback = r.feedback;
    else return "feedback must be 1, -1 or null";
  }
  if ("status" in r) {
    if (r.status === "APPROVED" || r.status === "REJECTED") patch.status = r.status;
    else return "status must be APPROVED or REJECTED";
  }
  if ("notes" in r) {
    if (r.notes !== null && typeof r.notes !== "string") return "notes must be text";
    patch.notes = typeof r.notes === "string" ? r.notes.slice(0, 5000) : null;
  }
  if ("followUpAt" in r) {
    if (r.followUpAt === null || r.followUpAt === "") patch.followUpAt = null;
    else if (typeof r.followUpAt === "string" && !Number.isNaN(Date.parse(r.followUpAt))) patch.followUpAt = r.followUpAt;
    else return "followUpAt must be an ISO date or null";
  }
  return patch;
}

/** Whether the change can show in the Google Sheet: a job approved by hand is sent, a moved one gets its Stage updated. */
export function touchesSheet(patch: JobPatch): boolean {
  return patch.status === "APPROVED" || patch.stage !== undefined || patch.closeReason !== undefined;
}

export type UpdateOptions = {
  /** One user's jobs only ({} = any user's); ids outside it are ignored, so a stale tab can never change another user's jobs. */
  scope?: { userId?: number };
  now?: Date;
  /** Who makes the change, for the timeline (default: the app). */
  actor?: Actor;
  /** false: the caller records the timeline itself (Mark as applied). */
  record?: boolean;
};

const DAY_MS = 24 * 60 * 60_000;
// Stages that end the wait for an answer: no follow-up there.
const NO_FOLLOW_UP: (JobStage | null)[] = ["OFFER", "REJECTED", "ARCHIVED", null];

function sameTime(a: Date | null, b: Date | null): boolean {
  return (a?.getTime() ?? null) === (b?.getTime() ?? null);
}

/** Returns how many of the jobs were in scope (0: none found). */
export async function updateJobs(ids: number[], patch: JobPatch, opts: UpdateOptions = {}): Promise<number> {
  const { scope = {}, now = new Date(), actor = APP_ACTOR, record = true } = opts;
  const unique = Array.from(new Set(ids.filter((n) => Number.isInteger(n) && n > 0))).slice(0, 500);
  if (unique.length === 0) return 0;
  const rows = await prisma.scrapedJob.findMany({
    where: { id: { in: unique }, ...scope },
    select: { id: true, userId: true, stage: true, closeReason: true, followUpAt: true, notes: true },
  });
  if (rows.length === 0) return 0;
  const inScope = rows.map((r) => r.id);
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const settings = new Map<number, UserSettings>(
    await Promise.all(userIds.map(async (id) => [id, await getUserSettings(id)] as const)),
  );
  const events: NewEvent[] = [];

  // What every job gets.
  const data: Prisma.ScrapedJobUpdateManyMutationInput = {};
  if (patch.notes !== undefined) data.notes = patch.notes;
  if (patch.feedback !== undefined) {
    data.feedback = patch.feedback;
    data.feedbackAt = patch.feedback === null ? null : now;
  }
  // sheetSynced stays: a job already in the sheet keeps its one row.
  if (patch.status) data.status = patch.status;
  if (patch.reviewedAt !== undefined) data.reviewedAt = patch.reviewedAt;
  const followUp = patch.followUpAt === undefined ? undefined : patch.followUpAt ? new Date(patch.followUpAt) : null;
  if (followUp !== undefined) data.followUpAt = followUp;
  if (Object.keys(data).length > 0) await prisma.scrapedJob.updateMany({ where: { id: { in: inScope } }, data });

  if (followUp !== undefined) {
    for (const r of rows) {
      if (!sameTime(r.followUpAt, followUp)) {
        events.push({ jobId: r.id, userId: r.userId, kind: "follow_up", detail: { at: followUp?.toISOString() ?? null } });
      }
    }
  }
  if (patch.notes !== undefined) {
    for (const r of rows) {
      if ((r.notes ?? "") !== (patch.notes ?? "")) {
        events.push({
          jobId: r.id,
          userId: r.userId,
          kind: "note",
          detail: patch.notes ? { text: patch.notes.slice(0, 300), more: patch.notes.length > 300 } : { cleared: true },
        });
      }
    }
  }

  if (patch.stage !== undefined) {
    const to = patch.stage;
    // Only the jobs it moves: one already there keeps its dates.
    const moving = rows.filter((r) => r.stage !== to);
    const reason: CloseReason | null = to === "REJECTED" ? "REJECTED" : to === "ARCHIVED" ? (patch.closeReason ?? null) : null;
    if (moving.length) {
      const ids = moving.map((r) => r.id);
      await prisma.scrapedJob.updateMany({
        where: { id: { in: ids } },
        data: {
          stage: to,
          stageUpdatedAt: now,
          closeReason: reason,
          ...(NO_FOLLOW_UP.includes(to) && followUp === undefined ? { followUpAt: null } : {}),
        },
      });
      if (to === "APPLIED") {
        await prisma.scrapedJob.updateMany({ where: { id: { in: ids }, appliedAt: null }, data: { appliedAt: now } });
      }
      // The follow-up date each job gets: its own user's setting, while Applications is on for them.
      const due = new Map<number, Date>();
      if ((to === "APPLIED" || to === "INTERVIEW") && followUp === undefined) {
        for (const userId of userIds) {
          const s = settings.get(userId)!;
          const waiting = moving.filter((r) => r.userId === userId && r.followUpAt == null).map((r) => r.id);
          if (!s.applicationsEnabled || waiting.length === 0) continue;
          const at = new Date(now.getTime() + s.followUpDays * DAY_MS);
          await prisma.scrapedJob.updateMany({ where: { id: { in: waiting }, followUpAt: null }, data: { followUpAt: at } });
          for (const id of waiting) due.set(id, at);
        }
      }
      for (const r of moving) {
        const detail: Record<string, unknown> = {};
        if (reason && to === "ARCHIVED") detail.reason = reason;
        if (due.has(r.id)) detail.followUpAt = due.get(r.id)!.toISOString();
        events.push({ jobId: r.id, userId: r.userId, kind: "stage", fromStage: r.stage, toStage: to, detail });
      }
    }
  }
  // An archived job can get (or change) its reason without moving.
  if ((patch.stage === undefined || patch.stage === "ARCHIVED") && patch.closeReason !== undefined) {
    const reason = patch.closeReason;
    const archived = rows.filter((r) => r.stage === "ARCHIVED" && r.closeReason !== reason);
    if (archived.length) {
      await prisma.scrapedJob.updateMany({ where: { id: { in: archived.map((r) => r.id) } }, data: { closeReason: reason } });
      for (const r of archived) {
        events.push({ jobId: r.id, userId: r.userId, kind: "reason", fromStage: "ARCHIVED", toStage: "ARCHIVED", detail: { reason } });
      }
    }
  }

  // A job approved by hand enters the pipeline as Saved (Applications on).
  if (patch.status === "APPROVED" && patch.stage === undefined) {
    const saving = rows.filter((r) => r.stage == null && settings.get(r.userId)!.applicationsEnabled);
    if (saving.length) {
      await prisma.scrapedJob.updateMany({
        where: { id: { in: saving.map((r) => r.id) }, stage: null },
        data: { stage: "SAVED", stageUpdatedAt: now, closeReason: null },
      });
      for (const r of saving) {
        events.push({ jobId: r.id, userId: r.userId, kind: "stage", fromStage: null, toStage: "SAVED", detail: { approved: true } });
      }
    }
  }

  if (record) await recordEvents(events, actor, now);
  return inScope.length;
}

export async function deleteJobs(ids: number[], scope: { userId?: number } = {}): Promise<number> {
  const unique = Array.from(new Set(ids.filter((n) => Number.isInteger(n) && n > 0))).slice(0, 500);
  if (unique.length === 0) return 0;
  return (await prisma.scrapedJob.deleteMany({ where: { id: { in: unique }, ...scope } })).count;
}
