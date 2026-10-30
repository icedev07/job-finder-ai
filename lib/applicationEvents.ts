import { prisma } from "./prisma";

// An application's timeline (ApplicationEvent): what happened, when, and who
// did it. lib/jobActions.ts records stage changes, follow-up dates, notes and
// close reasons; lib/applications.ts records the extension's "Mark as
// applied". Recording never fails the change it describes: a write that fails
// (say, before /api/setup added the table) is logged and dropped.

export type EventVia = "dashboard" | "extension" | "app";

/** Who makes a change: an admin on the dashboard, whoever is signed in to the extension, or the app itself. */
export type Actor = { id: number | null; via: EventVia };

export const APP_ACTOR: Actor = { id: null, via: "app" };

export type EventKind = "stage" | "reason" | "follow_up" | "note" | "applied";

export type NewEvent = {
  jobId: number;
  userId: number;
  kind: EventKind;
  fromStage?: string | null;
  toStage?: string | null;
  detail?: Record<string, unknown>;
};

export async function recordEvents(events: NewEvent[], actor: Actor, at = new Date()): Promise<void> {
  if (!events.length) return;
  try {
    await prisma.applicationEvent.createMany({
      data: events.map((e) => ({
        jobId: e.jobId,
        userId: e.userId,
        kind: e.kind,
        fromStage: e.fromStage ?? null,
        toStage: e.toStage ?? null,
        detail: e.detail && Object.keys(e.detail).length ? JSON.stringify(e.detail) : null,
        actorId: actor.id,
        via: actor.via,
        createdAt: at,
      })),
    });
  } catch (err) {
    console.error(`[timeline] could not record ${events.length} event(s): ${(err as Error)?.message || err}`);
  }
}

export type TimelineEvent = {
  id: number;
  kind: EventKind;
  fromStage: string | null;
  toStage: string | null;
  detail: Record<string, unknown>;
  actorId: number | null;
  via: EventVia;
  createdAt: Date;
};

function parseDetail(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/** One job's timeline, newest first (empty when it can't be read). */
export async function jobTimeline(jobId: number, take = 100): Promise<TimelineEvent[]> {
  try {
    const rows = await prisma.applicationEvent.findMany({
      where: { jobId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
    });
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind as EventKind,
      fromStage: r.fromStage,
      toStage: r.toStage,
      detail: parseDetail(r.detail),
      actorId: r.actorId,
      via: r.via as EventVia,
      createdAt: r.createdAt,
    }));
  } catch (err) {
    console.error(`[timeline] could not read job #${jobId}'s timeline: ${(err as Error)?.message || err}`);
    return [];
  }
}
