import { Prisma } from "../generated/prisma";
import { prisma } from "./prisma";
import { startOfUtcMonth } from "./aiUsage";

// Read-only numbers for the Dashboard. Each block fails soft so a missing
// table (before /api/setup) only blanks its own panel.

const DAY_MS = 24 * 60 * 60_000;

function dayKeys(days: number, now = new Date()): string[] {
  const out: string[] = [];
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (days - 1) * DAY_MS;
  for (let i = 0; i < days; i++) out.push(new Date(start + i * DAY_MS).toISOString().slice(0, 10));
  return out;
}

async function soft<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export type DashboardData = {
  days: string[];
  perDay: { day: string; found: number; approved: number; rejected: number; aiCalls: number }[];
  totals7: { found: number; approved: number };
  funnel: { key: string; label: string; value: number }[];
  sources: { platform: string; found: number; approved: number }[];
  recent: {
    id: number;
    userId: number;
    title: string;
    company: string;
    aiScore: number | null;
    platform: string;
    createdAt: Date;
    stage: string | null;
  }[];
  applied: number;
  interviews: number;
  /** One row per user, only when viewing all users. */
  perUser: UserSummary[] | null;
};

export type UserSummary = {
  userId: number;
  found7: number;
  approved7: number;
  applied: number;
  lastLinkedInAt: Date | null;
  aiCalls7: number;
  aiCostMonthUsd: number;
};

// For one user (userId) or every user (null).
export async function getDashboardData(windowDays = 30, userId: number | null = null): Promise<DashboardData> {
  const now = new Date();
  const since = new Date(now.getTime() - windowDays * DAY_MS);
  const days = dayKeys(windowDays, now);
  const mine = userId == null ? {} : { userId };
  // Nested in whole Prisma.sql queries (see lib/prisma.ts).
  const andMine = userId == null ? Prisma.empty : Prisma.sql`AND "userId" = ${userId}`;

  const [jobDays, aiDays, funnelRows, sourceRows, recent, applied, interviews] = await Promise.all([
    soft(
      prisma.$queryRaw<{ day: string; found: bigint; approved: bigint; rejected: bigint }[]>(Prisma.sql`
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
               COUNT(*) AS found,
               COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved,
               COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected
        FROM "ScrapedJob" WHERE "createdAt" >= ${since} ${andMine}
        GROUP BY 1`),
      [],
    ),
    soft(
      prisma.$queryRaw<{ day: string; calls: bigint }[]>(Prisma.sql`
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, COUNT(*) AS calls
        FROM "AiUsage" WHERE "createdAt" >= ${since} ${andMine}
        GROUP BY 1`),
      [],
    ),
    soft(
      prisma.$queryRaw<{ found: bigint; approved: bigint; applied: bigint; interview: bigint; offer: bigint }[]>(Prisma.sql`
        SELECT COUNT(*) AS found,
               COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved,
               COUNT(*) FILTER (WHERE "appliedAt" IS NOT NULL OR stage IN ('APPLIED','INTERVIEW','OFFER')) AS applied,
               COUNT(*) FILTER (WHERE stage IN ('INTERVIEW','OFFER')) AS interview,
               COUNT(*) FILTER (WHERE stage = 'OFFER') AS offer
        FROM "ScrapedJob" WHERE "createdAt" >= ${since} ${andMine}`),
      [],
    ),
    soft(
      prisma.$queryRaw<{ platform: string; found: bigint; approved: bigint }[]>(Prisma.sql`
        SELECT platform, COUNT(*) AS found, COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved
        FROM "ScrapedJob" WHERE "createdAt" >= ${since} ${andMine}
        GROUP BY platform ORDER BY approved DESC, found DESC LIMIT 25`),
      [],
    ),
    soft(
      prisma.scrapedJob.findMany({
        where: { ...mine, status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          userId: true,
          title: true,
          company: true,
          aiScore: true,
          platform: true,
          createdAt: true,
          stage: true,
        },
      }),
      [],
    ),
    soft(prisma.scrapedJob.count({ where: { ...mine, stage: { in: ["APPLIED", "INTERVIEW", "OFFER"] } } }), 0),
    soft(prisma.scrapedJob.count({ where: { ...mine, stage: { in: ["INTERVIEW", "OFFER"] } } }), 0),
  ]);
  const perUser = userId == null ? await perUserSummary(now) : null;

  const jobMap = new Map(jobDays.map((r) => [r.day, r]));
  const aiMap = new Map(aiDays.map((r) => [r.day, Number(r.calls)]));
  const perDay = days.map((day) => {
    const j = jobMap.get(day);
    return {
      day,
      found: Number(j?.found ?? 0),
      approved: Number(j?.approved ?? 0),
      rejected: Number(j?.rejected ?? 0),
      aiCalls: aiMap.get(day) ?? 0,
    };
  });
  const last7 = perDay.slice(-7);
  const f = funnelRows[0];

  return {
    days,
    perDay,
    totals7: {
      found: last7.reduce((s, d) => s + d.found, 0),
      approved: last7.reduce((s, d) => s + d.approved, 0),
    },
    funnel: [
      { key: "found", label: "Found & judged", value: Number(f?.found ?? 0) },
      { key: "approved", label: "Approved", value: Number(f?.approved ?? 0) },
      { key: "applied", label: "Applied", value: Number(f?.applied ?? 0) },
      { key: "interview", label: "Interview", value: Number(f?.interview ?? 0) },
      { key: "offer", label: "Offer", value: Number(f?.offer ?? 0) },
    ],
    sources: sourceRows.map((r) => ({ platform: r.platform, found: Number(r.found), approved: Number(r.approved) })),
    recent,
    applied,
    interviews,
    perUser,
  };
}

// The "All users" table: the last 7 days of jobs, applications so far, the
// last LinkedIn job and AI use per user.
async function perUserSummary(now: Date): Promise<UserSummary[]> {
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const [jobs, applied, linkedIn, aiWeek, aiMonth] = await Promise.all([
    soft(
      prisma.$queryRaw<{ userId: number; found: bigint; approved: bigint }[]>`
        SELECT "userId", COUNT(*) AS found, COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved
        FROM "ScrapedJob" WHERE "createdAt" >= ${weekAgo}
        GROUP BY "userId"`,
      [],
    ),
    soft(
      prisma.scrapedJob.groupBy({
        by: ["userId"],
        where: { stage: { in: ["APPLIED", "INTERVIEW", "OFFER"] } },
        _count: { _all: true },
      }),
      [] as { userId: number; _count: { _all: number } }[],
    ),
    soft(
      prisma.scrapedJob.groupBy({ by: ["userId"], where: { platform: "linkedin" }, _max: { createdAt: true } }),
      [] as { userId: number; _max: { createdAt: Date | null } }[],
    ),
    soft(
      prisma.aiUsage.groupBy({ by: ["userId"], where: { createdAt: { gte: weekAgo } }, _count: { _all: true } }),
      [] as { userId: number | null; _count: { _all: number } }[],
    ),
    soft(
      prisma.aiUsage.groupBy({ by: ["userId"], where: { createdAt: { gte: startOfUtcMonth(now) } }, _sum: { costUsd: true } }),
      [] as { userId: number | null; _sum: { costUsd: number | null } }[],
    ),
  ]);
  const ids = new Set<number>([
    ...jobs.map((r) => r.userId),
    ...applied.map((r) => r.userId),
    ...linkedIn.map((r) => r.userId),
    ...aiWeek.flatMap((r) => (r.userId == null ? [] : [r.userId])),
    ...aiMonth.flatMap((r) => (r.userId == null ? [] : [r.userId])),
  ]);
  return [...ids].map((userId) => {
    const j = jobs.find((r) => r.userId === userId);
    return {
      userId,
      found7: Number(j?.found ?? 0),
      approved7: Number(j?.approved ?? 0),
      applied: applied.find((r) => r.userId === userId)?._count._all ?? 0,
      lastLinkedInAt: linkedIn.find((r) => r.userId === userId)?._max.createdAt ?? null,
      aiCalls7: aiWeek.find((r) => r.userId === userId)?._count._all ?? 0,
      aiCostMonthUsd: aiMonth.find((r) => r.userId === userId)?._sum.costUsd ?? 0,
    };
  });
}
