import { recordEvents, type Actor, type NewEvent } from "./applicationEvents";
import { STARTED_MS } from "./applicationCards";
import { INTERVIEW_KINDS, isInterviewKind, type InterviewKind } from "./format";
import { updateJobs } from "./jobActions";
import { prisma } from "./prisma";
import { getUserSettings } from "./userSettings";

// An application's interviews (Interview): when, what kind, where to join and
// notes. While Applications is on for the job's user, adding one moves the job
// to Interview (unless it is at Offer, which has no follow-ups) and the
// follow-up to the user's follow-up days after the interview (unless one is set
// later already); a new time moves the follow-up the same way. Adding, moving,
// changing the kind of and removing an interview go on the timeline.

export type InterviewInput = { at: Date; kind: InterviewKind; link: string | null; notes: string | null };

export type InterviewRow = {
  id: number;
  jobId: number;
  userId: number;
  at: Date;
  kind: string;
  link: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Scope = { userId?: number };
type Options = { scope?: Scope; actor: Actor; now?: Date };

const DAY_MS = 24 * 60 * 60_000;
// Further than this from today is a typo.
const MAX_DISTANCE_MS = 5 * 365 * DAY_MS;
// The stages an interview can be coming up in.
export const OPEN_STAGES = ["SAVED", "APPLIED", "INTERVIEW", "OFFER"];

/** A request's fields: all of them for a new interview, the ones it has for a change. */
export function parseInterviewInput(raw: unknown, partial: boolean, now = new Date()): Partial<InterviewInput> | string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "Expected an object";
  const r = raw as Record<string, unknown>;
  const out: Partial<InterviewInput> = {};
  if ("at" in r || !partial) {
    const t = typeof r.at === "string" ? Date.parse(r.at) : NaN;
    if (Number.isNaN(t)) return "at must be an ISO date and time";
    if (Math.abs(t - now.getTime()) > MAX_DISTANCE_MS) return "at must be within five years of today";
    out.at = new Date(t);
  }
  if ("kind" in r || !partial) {
    if (!isInterviewKind(r.kind)) return `kind must be one of ${INTERVIEW_KINDS.join(", ")}`;
    out.kind = r.kind;
  }
  for (const key of ["link", "notes"] as const) {
    if (!(key in r)) {
      if (!partial) out[key] = null;
      continue;
    }
    const v = r[key];
    if (v !== null && typeof v !== "string") return `${key} must be text`;
    const text = typeof v === "string" ? v.trim().slice(0, key === "link" ? 2048 : 5000) : "";
    out[key] = text || null;
  }
  return out;
}

/** followUpDays after the interview, unless the job's follow-up is that late already (null: leave it). */
function followUpAfter(at: Date, days: number, current: Date | null): Date | null {
  const due = new Date(at.getTime() + days * DAY_MS);
  return current && current.getTime() >= due.getTime() ? null : due;
}

/** The interview's event, with the follow-up it set. */
function interviewEvent(
  i: { id: number; jobId: number; userId: number; at: Date; kind: string },
  action: "added" | "changed" | "removed",
  extra: Record<string, unknown> = {},
): NewEvent {
  return {
    jobId: i.jobId,
    userId: i.userId,
    kind: "interview",
    detail: { action, id: i.id, at: i.at.toISOString(), kind: i.kind, ...extra },
  };
}

/** Adds an interview to a job in scope (null: no such job); moved: the job went to Interview. */
export async function addInterview(
  jobId: number,
  input: InterviewInput,
  opts: Options,
): Promise<{ interview: InterviewRow; moved: boolean } | null> {
  const { scope = {}, actor, now = new Date() } = opts;
  const job = await prisma.scrapedJob.findFirst({
    where: { id: jobId, ...scope },
    select: { id: true, userId: true, stage: true, followUpAt: true },
  });
  if (!job) return null;
  const settings = await getUserSettings(job.userId);
  const interview = await prisma.interview.create({
    data: { jobId, userId: job.userId, at: input.at, kind: input.kind, link: input.link, notes: input.notes },
  });

  const events: NewEvent[] = [];
  let due: Date | null = null;
  const moves = settings.applicationsEnabled && job.stage !== "INTERVIEW" && job.stage !== "OFFER";
  // At Offer the answer is in: no follow-up.
  if (moves || (settings.applicationsEnabled && job.stage === "INTERVIEW")) {
    // Only an Applied or Interview job's date is a follow-up (a saved job's is a reminder to apply).
    const current = job.stage === "APPLIED" || job.stage === "INTERVIEW" ? job.followUpAt : null;
    due = followUpAfter(input.at, settings.followUpDays, current);
    if (moves || due) {
      // The move is recorded here, with the interview's event saying where the follow-up went.
      await updateJobs(
        [jobId],
        { ...(moves ? { stage: "INTERVIEW" as const } : {}), ...(due ? { followUpAt: due.toISOString() } : {}) },
        { scope, actor, now, record: false },
      );
    }
    if (moves) events.push({ jobId, userId: job.userId, kind: "stage", fromStage: job.stage, toStage: "INTERVIEW" });
  }
  events.push(interviewEvent(interview, "added", due ? { followUpAt: due.toISOString() } : {}));
  await recordEvents(events, actor, now);
  return { interview, moved: moves };
}

/** Changes an interview in scope (null: no such interview). A new time moves the follow-up after it. */
export async function updateInterview(id: number, input: Partial<InterviewInput>, opts: Options): Promise<InterviewRow | null> {
  const { scope = {}, actor, now = new Date() } = opts;
  const current = await prisma.interview.findFirst({
    where: { id, ...scope },
    include: { job: { select: { stage: true, followUpAt: true } } },
  });
  if (!current) return null;
  const updated = await prisma.interview.update({ where: { id }, data: input });
  const moved = input.at !== undefined && input.at.getTime() !== current.at.getTime();
  const kindChanged = input.kind !== undefined && input.kind !== current.kind;
  if (!moved && !kindChanged) return updated;

  let due: Date | null = null;
  if (moved && current.job.stage === "INTERVIEW") {
    const settings = await getUserSettings(current.userId);
    if (settings.applicationsEnabled) {
      due = followUpAfter(updated.at, settings.followUpDays, current.job.followUpAt);
      if (due) await updateJobs([current.jobId], { followUpAt: due.toISOString() }, { scope, actor, now, record: false });
    }
  }
  await recordEvents(
    [
      interviewEvent(updated, "changed", {
        ...(moved ? { fromAt: current.at.toISOString() } : {}),
        ...(kindChanged ? { fromKind: current.kind } : {}),
        ...(due ? { followUpAt: due.toISOString() } : {}),
      }),
    ],
    actor,
    now,
  );
  return updated;
}

/** Removes an interview in scope (false: no such interview). The job stays where it is. */
export async function deleteInterview(id: number, opts: Options): Promise<boolean> {
  const { scope = {}, actor, now = new Date() } = opts;
  const current = await prisma.interview.findFirst({ where: { id, ...scope } });
  if (!current) return false;
  await prisma.interview.delete({ where: { id } });
  await recordEvents([interviewEvent(current, "removed")], actor, now);
  return true;
}

/** One job's interviews, first one first (empty when they can't be read). */
export async function jobInterviews(jobId: number): Promise<InterviewRow[]> {
  try {
    return await prisma.interview.findMany({ where: { jobId }, orderBy: [{ at: "asc" }, { id: "asc" }] });
  } catch (err) {
    console.error(`[interviews] could not read job #${jobId}'s interviews: ${(err as Error)?.message || err}`);
    return [];
  }
}

export type UpcomingInterview = {
  id: number;
  at: Date;
  kind: string;
  link: string | null;
  job: { id: number; userId: number; title: string; company: string; stage: string | null };
};

/** These users' interviews from an hour ago to `days` ahead, of applications still open, soonest first. */
export async function upcomingInterviews(userIds: number[], days: number, take: number, now = new Date()): Promise<UpcomingInterview[]> {
  if (!userIds.length) return [];
  return prisma.interview.findMany({
    where: {
      userId: { in: userIds },
      at: { gte: new Date(now.getTime() - STARTED_MS), lte: new Date(now.getTime() + days * DAY_MS) },
      job: { stage: { in: OPEN_STAGES } },
    },
    orderBy: [{ at: "asc" }, { id: "asc" }],
    take,
    select: {
      id: true,
      at: true,
      kind: true,
      link: true,
      job: { select: { id: true, userId: true, title: true, company: true, stage: true } },
    },
  });
}
