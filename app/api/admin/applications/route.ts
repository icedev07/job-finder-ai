import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { CARD_SELECT, withNextInterviews } from "@/lib/applicationCards";
import { isJobStage, type JobStage } from "@/lib/format";
import { nextActionCounts } from "@/lib/nextActions";
import { prisma } from "@/lib/prisma";
import { adminScope, scopedUsers } from "@/lib/scope";

export const dynamic = "force-dynamic";

// The Applications board of the user being viewed (or of every user with
// Applications on): each column's cards, newest move first, a page at a time,
// each with its next interview.
//
// GET ?q=&only=<userId>&platform=a,b&minScore=60&archived=1
//   → { columns: [{ stage, total, cards }], users: [{ id, on, saved, applied,
//       interview, offer, todo }], sources: [{ platform, count }] }
//   (todo: the user's next actions)
// GET …&stage=APPLIED&offset=100 → { cards, total }: more of one column.

const OPEN: JobStage[] = ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"];
const PAGE = 100;

const ORDER: Prisma.ScrapedJobOrderByWithRelationInput[] = [
  { stageUpdatedAt: { sort: "desc", nulls: "last" } },
  { id: "desc" },
];

function int(v: string | null, min: number, max: number): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : null;
}

export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const params = new URL(req.url).searchParams;
  const users = await scopedUsers(scope);
  const onUsers = users.filter((u) => u.settings.applicationsEnabled);
  const on = onUsers.map((u) => u.id);
  const only = int(params.get("only"), 1, 2 ** 31 - 1);
  const shown = only != null && on.includes(only) ? [only] : on;

  // The filters every column shares.
  const and: Prisma.ScrapedJobWhereInput[] = [{ userId: { in: shown } }];
  const q = params.get("q")?.trim().slice(0, 200);
  for (const word of q ? q.split(/\s+/).slice(0, 8) : []) {
    and.push({
      OR: [
        { title: { contains: word, mode: "insensitive" } },
        { company: { contains: word, mode: "insensitive" } },
        { location: { contains: word, mode: "insensitive" } },
        { notes: { contains: word, mode: "insensitive" } },
      ],
    });
  }
  const platforms = (params.get("platform") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 40);
  if (platforms.length) and.push({ platform: { in: platforms } });
  const minScore = int(params.get("minScore"), 0, 100);
  if (minScore != null) and.push({ aiScore: { gte: minScore } });
  const where = (stage: JobStage): Prisma.ScrapedJobWhereInput => ({ AND: [...and, { stage }] });

  // More of one column.
  const one = params.get("stage");
  if (one) {
    if (!isJobStage(one)) return NextResponse.json({ error: `Unknown stage "${one}"` }, { status: 400 });
    const offset = int(params.get("offset"), 0, 1_000_000) ?? 0;
    const [cards, total] = await Promise.all([
      prisma.scrapedJob.findMany({ where: where(one), orderBy: ORDER, skip: offset, take: PAGE, select: CARD_SELECT }),
      prisma.scrapedJob.count({ where: where(one) }),
    ]);
    return NextResponse.json({ cards: await withNextInterviews(cards), total });
  }

  const stages: JobStage[] = params.get("archived") === "1" ? [...OPEN, "ARCHIVED"] : OPEN;
  const [lists, totals, perStage, todo, sources] = await Promise.all([
    Promise.all(stages.map((stage) => prisma.scrapedJob.findMany({ where: where(stage), orderBy: ORDER, take: PAGE, select: CARD_SELECT }))),
    // Every column's total in one query.
    prisma.scrapedJob.groupBy({ by: ["stage"], where: { AND: [...and, { stage: { in: stages } }] }, _count: { _all: true } }),
    // Each user's whole pipeline, for the strip (filters don't apply).
    prisma.scrapedJob.groupBy({ by: ["userId", "stage"], where: { userId: { in: on }, stage: { not: null } }, _count: { _all: true } }),
    // The board works without them (before /api/setup added interviews).
    nextActionCounts(onUsers).catch((err) => {
      console.error(`[applications] could not count next actions: ${(err as Error)?.message || err}`);
      return new Map<number, number>();
    }),
    prisma.scrapedJob.groupBy({ by: ["platform"], where: { userId: { in: on }, stage: { not: null } }, _count: { _all: true } }),
  ]);

  // Every card's next interview in one query.
  const next = new Map((await withNextInterviews(lists.flat())).map((c) => [c.id, c.nextInterviewAt]));
  const columns = stages.map((stage, i) => ({
    stage,
    total: totals.find((t) => t.stage === stage)?._count._all ?? 0,
    cards: lists[i].map((c) => ({ ...c, nextInterviewAt: next.get(c.id) ?? null })),
  }));
  const count = (userId: number, stage: string) =>
    perStage.find((r) => r.userId === userId && r.stage === stage)?._count._all ?? 0;
  return NextResponse.json({
    columns,
    users: users.map((u) => ({
      id: u.id,
      on: u.settings.applicationsEnabled,
      saved: count(u.id, "SAVED"),
      applied: count(u.id, "APPLIED"),
      interview: count(u.id, "INTERVIEW"),
      offer: count(u.id, "OFFER"),
      todo: todo.get(u.id) ?? 0,
    })),
    sources: sources
      .map((r) => ({ platform: r.platform, count: r._count._all }))
      .sort((a, b) => b.count - a.count),
  });
}
