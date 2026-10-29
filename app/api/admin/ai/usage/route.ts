import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { startOfNextUtcMonth, startOfUtcMonth } from "@/lib/aiUsage";
import { adminOnly } from "@/lib/scope";

export const dynamic = "force-dynamic";

type DayRow = { day: Date; provider: string; calls: bigint; failures: bigint; cost: number | null; tokens: bigint | null };

// Usage & cost for the AI page: month-to-date Claude spend vs the budget cap,
// a per-day series, per task/provider/model totals, and 24h provider health.
export async function GET(req: NextRequest) {
  const denied = await adminOnly(req);
  if (denied) return denied;
  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60_000);
  const since24h = new Date(Date.now() - 24 * 60 * 60_000);
  const config = await getConfig();

  try {
    const [monthAgg, byDay, byKey, health, lastErrors] = await Promise.all([
      prisma.aiUsage.aggregate({
        _sum: { costUsd: true },
        _count: { _all: true },
        where: { provider: "claude", createdAt: { gte: startOfUtcMonth() } },
      }),
      prisma.$queryRaw<DayRow[]>`
        SELECT date_trunc('day', "createdAt") AS day, provider,
               COUNT(*) AS calls,
               COUNT(*) FILTER (WHERE NOT ok) AS failures,
               SUM("costUsd") AS cost,
               SUM("inputTokens" + "outputTokens" + "cacheReadTokens" + "cacheWriteTokens") AS tokens
        FROM "AiUsage"
        WHERE "createdAt" >= ${since}
        GROUP BY 1, 2
        ORDER BY 1 ASC`,
      prisma.aiUsage.groupBy({
        by: ["task", "provider", "model"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        _sum: { costUsd: true, inputTokens: true, outputTokens: true, cacheReadTokens: true, cacheWriteTokens: true },
        _avg: { durationMs: true },
      }),
      prisma.aiUsage.groupBy({
        by: ["provider", "ok"],
        where: { createdAt: { gte: since24h } },
        _count: { _all: true },
        _avg: { durationMs: true },
        _max: { createdAt: true },
      }),
      prisma.aiUsage.findMany({
        where: { ok: false, createdAt: { gte: since24h } },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: { provider: true, model: true, task: true, error: true, createdAt: true },
      }),
    ]);

    // Per-provider health over the last 24h.
    const healthMap = new Map<
      string,
      { provider: string; ok: number; failed: number; avgMs: number | null; lastCall: Date | null; lastError: string | null }
    >();
    for (const row of health) {
      const h = healthMap.get(row.provider) ?? {
        provider: row.provider,
        ok: 0,
        failed: 0,
        avgMs: null,
        lastCall: null,
        lastError: null,
      };
      if (row.ok) {
        h.ok += row._count._all;
        h.avgMs = row._avg.durationMs != null ? Math.round(row._avg.durationMs) : h.avgMs;
      } else {
        h.failed += row._count._all;
      }
      const last = row._max.createdAt;
      if (last && (!h.lastCall || last > h.lastCall)) h.lastCall = last;
      healthMap.set(row.provider, h);
    }
    for (const err of lastErrors) {
      const h = healthMap.get(err.provider);
      if (h && !h.lastError) h.lastError = err.error;
    }

    return NextResponse.json({
      ok: true,
      days,
      month: {
        claudeSpendUsd: monthAgg._sum.costUsd || 0,
        claudeCalls: monthAgg._count._all,
        budgetUsd: config.claudeMonthlyBudgetUsd,
        resetsAt: startOfNextUtcMonth().toISOString(),
      },
      byDay: byDay.map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        provider: r.provider,
        calls: Number(r.calls),
        failures: Number(r.failures),
        costUsd: r.cost || 0,
        tokens: Number(r.tokens || 0),
      })),
      byKey: byKey
        .map((r) => ({
          task: r.task,
          provider: r.provider,
          model: r.model,
          calls: r._count._all,
          costUsd: r._sum.costUsd || 0,
          inputTokens: r._sum.inputTokens || 0,
          outputTokens: r._sum.outputTokens || 0,
          cacheReadTokens: r._sum.cacheReadTokens || 0,
          cacheWriteTokens: r._sum.cacheWriteTokens || 0,
          avgMs: r._avg.durationMs != null ? Math.round(r._avg.durationMs) : null,
        }))
        .sort((a, b) => b.costUsd - a.costUsd || b.calls - a.calls),
      health: [...healthMap.values()].map((h) => ({
        ...h,
        successRate: h.ok + h.failed > 0 ? h.ok / (h.ok + h.failed) : null,
      })),
      recentErrors: lastErrors.slice(0, 15),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: `Usage data unavailable — run /api/setup once to create the AiUsage table. (${(e as Error).message})`,
      },
      { status: 200 },
    );
  }
}
