import type { Prisma } from "../generated/prisma";
import { recordEvents, type Actor, type NewEvent } from "./applicationEvents";
import { CARD_SELECT, STARTED_MS } from "./applicationCards";
import { OPEN_STAGES } from "./interviews";
import { prisma } from "./prisma";
import { getUserSettings, type UserSettings } from "./userSettings";

// Next actions: what to do next on each application, for the users with
// Applications on.
//   - interview: one starts in the next two days (or started in the last hour);
//   - follow_up: an Applied or Interview job's follow-up date has come;
//   - no_answer: an Applied job has had no answer for the user's "no answer"
//     days (its follow-up date has come, or it has none);
//   - apply: a job has sat in Saved for the user's "saved" days, or its
//     reminder has come.
// The follow-up date doubles as the reminder: snoozing sets it, and a job
// whose date is still ahead waits. A job with an interview coming up shows as
// that interview only.

export type NextActionKind = "interview" | "follow_up" | "no_answer" | "apply";
export const NEXT_ACTION_KINDS: NextActionKind[] = ["interview", "follow_up", "no_answer", "apply"];

type ActionUser = { id: number; settings: UserSettings };

const DAY_MS = 24 * 60 * 60_000;
const SOON_MS = 2 * DAY_MS;
// More than this many due jobs is a backlog: the list shows the oldest.
const LIST_LIMIT = 500;

function soonWhere(now: Date): Prisma.InterviewWhereInput {
  return { at: { gte: new Date(now.getTime() - STARTED_MS), lte: new Date(now.getTime() + SOON_MS) } };
}

function ago(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

/** Interviews coming up for these users, of applications still open. */
function interviewsWhere(users: ActionUser[], now: Date): Prisma.InterviewWhereInput {
  return { userId: { in: users.map((u) => u.id) }, ...soonWhere(now), job: { stage: { in: OPEN_STAGES } } };
}

/** The jobs whose next action has come (not the ones with an interview coming up). */
function dueWhere(users: ActionUser[], now: Date): Prisma.ScrapedJobWhereInput {
  return {
    OR: users.map((u) => {
      const { savedReminderDays: saved, noAnswerDays: noAnswer } = u.settings;
      const or: Prisma.ScrapedJobWhereInput[] = [{ stage: { in: ["SAVED", "APPLIED", "INTERVIEW"] }, followUpAt: { lte: now } }];
      if (saved > 0) {
        const since = ago(now, saved);
        or.push({
          stage: "SAVED",
          followUpAt: null,
          OR: [{ stageUpdatedAt: { lte: since } }, { stageUpdatedAt: null, createdAt: { lte: since } }],
        });
      }
      if (noAnswer > 0) {
        const since = ago(now, noAnswer);
        or.push({
          stage: "APPLIED",
          followUpAt: null,
          OR: [{ appliedAt: { lte: since } }, { appliedAt: null, stageUpdatedAt: { lte: since } }],
        });
      }
      return { userId: u.id, OR: or };
    }),
    interviews: { none: soonWhere(now) },
  };
}

type DueJob = Prisma.ScrapedJobGetPayload<{ select: typeof CARD_SELECT }>;

/** Which next action a due job has, and since when. */
function classify(job: DueJob, settings: UserSettings, now: Date): { kind: NextActionKind; dueAt: Date } {
  const reminder = job.followUpAt && job.followUpAt <= now ? job.followUpAt : null;
  if (job.stage === "SAVED") {
    const saved = job.stageUpdatedAt ?? job.createdAt;
    return { kind: "apply", dueAt: reminder ?? new Date(saved.getTime() + settings.savedReminderDays * DAY_MS) };
  }
  const applied = job.appliedAt ?? job.stageUpdatedAt;
  if (job.stage === "APPLIED" && settings.noAnswerDays > 0 && applied && applied <= ago(now, settings.noAnswerDays)) {
    return { kind: "no_answer", dueAt: reminder ?? new Date(applied.getTime() + settings.noAnswerDays * DAY_MS) };
  }
  return { kind: "follow_up", dueAt: reminder ?? now };
}

export type NextAction = {
  kind: NextActionKind;
  /** When it came (an interview: when it starts). */
  dueAt: Date;
  job: DueJob;
  /** The interview coming up (kind interview). */
  interview: { id: number; at: Date; kind: string; link: string | null } | null;
  /** The job's last interview before now, if any (a follow-up after it). */
  lastInterview: { at: Date; kind: string } | null;
};

/** Every next action of these users: interviews soonest first, then follow-ups, no answer and apply, oldest first. */
export async function listNextActions(
  users: ActionUser[],
  now = new Date(),
  limit = LIST_LIMIT,
): Promise<{ items: NextAction[]; total: number }> {
  if (!users.length) return { items: [], total: 0 };
  const where = dueWhere(users, now);
  const [soon, due, dueTotal] = await Promise.all([
    prisma.interview.findMany({
      where: interviewsWhere(users, now),
      orderBy: [{ at: "asc" }, { id: "asc" }],
      take: limit,
      select: { id: true, at: true, kind: true, link: true, job: { select: CARD_SELECT } },
    }),
    prisma.scrapedJob.findMany({ where, orderBy: [{ followUpAt: { sort: "asc", nulls: "first" } }, { id: "asc" }], take: limit, select: CARD_SELECT }),
    prisma.scrapedJob.count({ where }),
  ]);
  const past = due.length
    ? await prisma.interview.findMany({
        where: { jobId: { in: due.map((j) => j.id) }, at: { lt: now } },
        orderBy: [{ at: "desc" }, { id: "desc" }],
        select: { jobId: true, at: true, kind: true },
      })
    : [];
  const settings = new Map(users.map((u) => [u.id, u.settings]));

  const items: NextAction[] = soon.map((i) => ({
    kind: "interview",
    dueAt: i.at,
    job: i.job,
    interview: { id: i.id, at: i.at, kind: i.kind, link: i.link },
    lastInterview: null,
  }));
  const rank = (k: NextActionKind) => NEXT_ACTION_KINDS.indexOf(k);
  const rest = due
    .map((job): NextAction => {
      const last = past.find((p) => p.jobId === job.id);
      return {
        ...classify(job, settings.get(job.userId)!, now),
        job,
        interview: null,
        lastInterview: last ? { at: last.at, kind: last.kind } : null,
      };
    })
    .sort((a, b) => rank(a.kind) - rank(b.kind) || a.dueAt.getTime() - b.dueAt.getTime() || a.job.id - b.job.id);
  return { items: [...items, ...rest].slice(0, limit), total: soon.length + dueTotal };
}

/** How many next actions each of these users has (missing: none). */
export async function nextActionCounts(users: ActionUser[], now = new Date()): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (!users.length) return counts;
  const [soon, due] = await Promise.all([
    prisma.interview.groupBy({ by: ["userId"], where: interviewsWhere(users, now), _count: { _all: true } }),
    prisma.scrapedJob.groupBy({ by: ["userId"], where: dueWhere(users, now), _count: { _all: true } }),
  ]);
  for (const r of [...soon, ...due]) counts.set(r.userId, (counts.get(r.userId) ?? 0) + r._count._all);
  return counts;
}

type Scope = { userId?: number };

/**
 * "Followed up" on Applied or Interview jobs in scope: on the timeline, with the next reminder its user's
 * follow-up days from now (while Applications is on). The events share `now`, so Undo finds them.
 */
export async function markFollowedUp(
  ids: number[],
  opts: { scope?: Scope; actor: Actor; now?: Date },
): Promise<{ updated: number; days: number | null }> {
  const { scope = {}, actor, now = new Date() } = opts;
  const unique = Array.from(new Set(ids.filter((n) => Number.isInteger(n) && n > 0))).slice(0, 500);
  if (!unique.length) return { updated: 0, days: null };
  const rows = await prisma.scrapedJob.findMany({
    where: { id: { in: unique }, ...scope, stage: { in: ["APPLIED", "INTERVIEW"] } },
    select: { id: true, userId: true, stage: true, followUpAt: true },
  });
  const events: NewEvent[] = [];
  const days = new Set<number | null>();
  for (const userId of new Set(rows.map((r) => r.userId))) {
    const settings = await getUserSettings(userId);
    const mine = rows.filter((r) => r.userId === userId);
    const next = settings.applicationsEnabled ? new Date(now.getTime() + settings.followUpDays * DAY_MS) : null;
    days.add(next ? settings.followUpDays : null);
    if (next) await prisma.scrapedJob.updateMany({ where: { id: { in: mine.map((r) => r.id) } }, data: { followUpAt: next } });
    for (const r of mine) {
      events.push({
        jobId: r.id,
        userId,
        kind: "followed_up",
        toStage: r.stage,
        // previous: what Undo puts back.
        detail: { next: next?.toISOString() ?? null, previous: r.followUpAt?.toISOString() ?? null },
      });
    }
  }
  await recordEvents(events, actor, now);
  return { updated: rows.length, days: days.size === 1 ? [...days][0] : null };
}

/** Takes back a "Followed up": its events go, and each job's earlier follow-up date returns unless it changed since. */
export async function undoFollowedUp(ids: number[], at: Date, scope: Scope = {}): Promise<number> {
  const unique = Array.from(new Set(ids.filter((n) => Number.isInteger(n) && n > 0))).slice(0, 500);
  if (!unique.length) return 0;
  const events = await prisma.applicationEvent.findMany({
    where: { jobId: { in: unique }, kind: "followed_up", createdAt: at, ...scope },
    select: { id: true, jobId: true, detail: true },
  });
  for (const e of events) {
    let d: { next?: string | null; previous?: string | null } = {};
    try {
      d = JSON.parse(e.detail ?? "{}");
    } catch {
      // unreadable: the date stays
    }
    if (d.next) {
      await prisma.scrapedJob.updateMany({
        where: { id: e.jobId, followUpAt: new Date(d.next) },
        data: { followUpAt: d.previous ? new Date(d.previous) : null },
      });
    }
  }
  await prisma.applicationEvent.deleteMany({ where: { id: { in: events.map((e) => e.id) } } });
  return events.length;
}
