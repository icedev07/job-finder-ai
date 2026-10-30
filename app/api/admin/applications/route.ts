import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { isJobStage, type JobStage } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { adminScope, scopedUsers } from "@/lib/scope";

export const dynamic = "force-dynamic";

// The Applications board of the user being viewed (or of every user with
// Applications on): each column's cards, newest move first, a page at a time.
//
// GET ?q=&only=<userId>&platform=a,b&minScore=60&archived=1
//   → { columns: [{ stage, total, cards }], users: [{ id, on, saved, applied,
//       interview, offer, followUpsDue }], sources: [{ platform, count }] }
// GET …&stage=APPLIED&offset=100 → { cards, total }: more of one column.

const OPEN: JobStage[] = ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"];
const PAGE = 100;
const DAY_MS = 24 * 60 * 60_000;

const CARD_SELECT = {
  id: true,
  userId: true,
  title: true,
  company: true,
  location: true,
  platform: true,
  aiScore: true,
  stage: true,
  closeReason: true,
  stageUpdatedAt: true,
  appliedAt: true,
  followUpAt: true,
  url: true,
  manualApplyUrl: true,
  applyMethod: true,
  createdAt: true,
} satisfies Prisma.ScrapedJobSelect;

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
  const on = users.filter((u) => u.settings.applicationsEnabled).map((u) => u.id);
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
    return NextResponse.json({ cards, total });
  }

  const stages: JobStage[] = params.get("archived") === "1" ? [...OPEN, "ARCHIVED"] : OPEN;
  const soon = new Date(Date.now() + DAY_MS);
  const [columns, perStage, due, sources] = await Promise.all([
    Promise.all(
      stages.map(async (stage) => {
        const [cards, total] = await Promise.all([
          prisma.scrapedJob.findMany({ where: where(stage), orderBy: ORDER, take: PAGE, select: CARD_SELECT }),
          prisma.scrapedJob.count({ where: where(stage) }),
        ]);
        return { stage, total, cards };
      }),
    ),
    // Each user's whole pipeline, for the strip (filters don't apply).
    prisma.scrapedJob.groupBy({ by: ["userId", "stage"], where: { userId: { in: on }, stage: { not: null } }, _count: { _all: true } }),
    prisma.scrapedJob.groupBy({
      by: ["userId"],
      where: { userId: { in: on }, stage: { in: ["APPLIED", "INTERVIEW"] }, followUpAt: { lte: soon } },
      _count: { _all: true },
    }),
    prisma.scrapedJob.groupBy({ by: ["platform"], where: { userId: { in: on }, stage: { not: null } }, _count: { _all: true } }),
  ]);

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
      followUpsDue: due.find((r) => r.userId === u.id)?._count._all ?? 0,
    })),
    sources: sources
      .map((r) => ({ platform: r.platform, count: r._count._all }))
      .sort((a, b) => b.count - a.count),
  });
}
