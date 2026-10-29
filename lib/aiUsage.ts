import { prisma } from "./prisma";

export type AiUsageEntry = {
  task: string;
  provider: string;
  model: string;
  ok: boolean;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  costUsd?: number | null;
  durationMs?: number;
  error?: string;
};

// Record one AI call. Never throws: usage tracking must not break analysis
// (e.g. on a database that has not run /api/setup since the AiUsage table was
// added).
export async function recordAiUsage(entry: AiUsageEntry): Promise<void> {
  try {
    await prisma.aiUsage.create({
      data: {
        task: entry.task.slice(0, 30),
        provider: entry.provider.slice(0, 30),
        model: (entry.model || "unknown").slice(0, 120),
        ok: entry.ok,
        inputTokens: Math.max(0, Math.round(entry.inputTokens || 0)),
        outputTokens: Math.max(0, Math.round(entry.outputTokens || 0)),
        cacheReadTokens: Math.max(0, Math.round(entry.cacheReadTokens || 0)),
        cacheWriteTokens: Math.max(0, Math.round(entry.cacheWriteTokens || 0)),
        costUsd: entry.costUsd && Number.isFinite(entry.costUsd) ? entry.costUsd : 0,
        durationMs: entry.durationMs != null ? Math.round(entry.durationMs) : null,
        error: entry.error ? entry.error.slice(0, 1000) : null,
      },
    });
    if (entry.provider === "claude" && entry.costUsd) {
      if (spendCache && spendCache.month === monthKey()) spendCache.usd += entry.costUsd;
    }
  } catch (e) {
    console.warn(`[aiUsage] could not record usage: ${(e as Error)?.message || e}`);
  }
}

function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
}

export function startOfUtcMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function startOfNextUtcMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

let spendCache: { month: string; usd: number; expiresAt: number } | null = null;
const SPEND_TTL_MS = 30_000;

// Claude spend for the current calendar month (UTC), in USD. Cached briefly so
// a scan does not run one aggregate query per AI call.
export async function claudeSpendThisMonth(): Promise<number> {
  const month = monthKey();
  if (spendCache && spendCache.month === month && spendCache.expiresAt > Date.now()) {
    return spendCache.usd;
  }
  try {
    const agg = await prisma.aiUsage.aggregate({
      _sum: { costUsd: true },
      where: { provider: "claude", createdAt: { gte: startOfUtcMonth() } },
    });
    const usd = agg._sum.costUsd || 0;
    spendCache = { month, usd, expiresAt: Date.now() + SPEND_TTL_MS };
    return usd;
  } catch {
    // No AiUsage table yet → nothing has been spent through this app.
    return 0;
  }
}

export function invalidateSpendCache(): void {
  spendCache = null;
}
