import { prisma } from "./prisma";
import { isJobStage, type JobStage } from "./format";
import { getUserSettings } from "./userSettings";

// Changes the admin makes to jobs (Jobs table, Review queue, Applications
// board, extension "Mark as applied"). One place for the rules:
//   - moving to APPLIED stamps appliedAt (once) and schedules a follow-up;
//   - INTERVIEW keeps / sets a follow-up; OFFER, REJECTED and ARCHIVED clear it;
//   - a manual approve/reject overrides the AI status (and re-queues Sheets);
//   - feedback (1 / -1 / null) is stored with its time, for Evaluations.

export type JobPatch = {
  stage?: JobStage | null;
  feedback?: 1 | -1 | null;
  status?: "APPROVED" | "REJECTED";
  notes?: string | null;
  followUpAt?: string | null;
};

export function parseJobPatch(raw: unknown): JobPatch | string {
  if (!raw || typeof raw !== "object") return "Expected an object";
  const r = raw as Record<string, unknown>;
  const patch: JobPatch = {};
  if ("stage" in r) {
    if (r.stage === null || r.stage === "NONE") patch.stage = null;
    else if (isJobStage(r.stage)) patch.stage = r.stage;
    else return `Unknown stage "${String(r.stage)}"`;
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

// `scope` limits the change to one user's jobs ({} = any user's); ids outside
// it are ignored, so a stale tab can never change another user's jobs.
export async function updateJobs(ids: number[], patch: JobPatch, scope: { userId?: number } = {}): Promise<number> {
  const unique = Array.from(new Set(ids.filter((n) => Number.isInteger(n) && n > 0))).slice(0, 500);
  if (unique.length === 0) return 0;
  const rows = await prisma.scrapedJob.findMany({ where: { id: { in: unique }, ...scope }, select: { id: true, userId: true } });
  const inScope = rows.map((r) => r.id);
  if (inScope.length === 0) return 0;
  const now = new Date();

  const data: Record<string, unknown> = {};
  if (patch.notes !== undefined) data.notes = patch.notes;
  if (patch.feedback !== undefined) {
    data.feedback = patch.feedback;
    data.feedbackAt = patch.feedback === null ? null : now;
  }
  if (patch.status) {
    data.status = patch.status;
    data.sheetSynced = false;
  }
  if (patch.followUpAt !== undefined) data.followUpAt = patch.followUpAt ? new Date(patch.followUpAt) : null;
  if (patch.stage !== undefined) {
    data.stage = patch.stage;
    data.stageUpdatedAt = now;
    if (patch.stage === "OFFER" || patch.stage === "REJECTED" || patch.stage === "ARCHIVED" || patch.stage === null) {
      if (patch.followUpAt === undefined) data.followUpAt = null;
    }
  }

  let updated = 0;
  if (Object.keys(data).length > 0) {
    updated = (await prisma.scrapedJob.updateMany({ where: { id: { in: inScope } }, data })).count;
  }

  // Per-row rules that depend on the current value. The default follow-up
  // date is each job's own user's setting.
  const needsFollowUp =
    patch.followUpAt === undefined && (patch.stage === "APPLIED" || patch.stage === "INTERVIEW");
  if (patch.stage === "APPLIED") {
    await prisma.scrapedJob.updateMany({ where: { id: { in: inScope }, appliedAt: null }, data: { appliedAt: now } });
  }
  if (needsFollowUp) {
    const byUser = new Map<number, number[]>();
    for (const r of rows) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r.id]);
    for (const [userId, userIds] of byUser) {
      const days = (await getUserSettings(userId)).followUpDays;
      await prisma.scrapedJob.updateMany({
        where: { id: { in: userIds }, followUpAt: null },
        data: { followUpAt: new Date(now.getTime() + days * 24 * 60 * 60_000) },
      });
    }
  }
  // A job approved by hand enters the pipeline as Saved.
  if (patch.status === "APPROVED" && patch.stage === undefined) {
    await prisma.scrapedJob.updateMany({
      where: { id: { in: inScope }, stage: null },
      data: { stage: "SAVED", stageUpdatedAt: now },
    });
  }
  return updated || inScope.length;
}

export async function deleteJobs(ids: number[], scope: { userId?: number } = {}): Promise<number> {
  const unique = Array.from(new Set(ids.filter((n) => Number.isInteger(n) && n > 0))).slice(0, 500);
  if (unique.length === 0) return 0;
  return (await prisma.scrapedJob.deleteMany({ where: { id: { in: unique }, ...scope } })).count;
}
