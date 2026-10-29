'use client';

import { StatusDot } from '@/components/common/status-dot';
import { formatDuration, formatPercent, timeAgo } from '@/lib/format';

export type ProviderHealth = {
  provider: string;
  ok: number;
  failed: number;
  avgMs: number | null;
  lastCall: string | null;
  lastError: string | null;
  successRate: number | null;
};

export type UsageResponse = {
  ok: boolean;
  error?: string;
  days: number;
  month: { claudeSpendUsd: number; claudeCalls: number; budgetUsd: number; resetsAt: string };
  byDay: { day: string; provider: string; calls: number; failures: number; costUsd: number; tokens: number }[];
  byKey: {
    task: string;
    provider: string;
    model: string;
    calls: number;
    costUsd: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    avgMs: number | null;
  }[];
  health: ProviderHealth[];
  recentErrors: { provider: string; model: string; task: string; error: string | null; createdAt: string }[];
};

export type TestResult = ({ ok: boolean } & Record<string, unknown>) | null;

/** "24h: 98% ok · 1.2s avg · last 3m ago" for a provider card. */
export function HealthLine({ health }: { health: ProviderHealth | undefined }) {
  if (!health || health.ok + health.failed === 0) {
    return <p className="text-xs text-muted-foreground">No calls in the last 24 hours.</p>;
  }
  const rate = health.successRate ?? 0;
  return (
    <div className="space-y-0.5 text-xs text-muted-foreground">
      <p className="flex flex-wrap items-center gap-x-2">
        <StatusDot tone={rate >= 0.9 ? 'ok' : rate >= 0.6 ? 'warn' : 'error'} />
        <span>
          24h: {formatPercent(rate)} ok ({health.ok + health.failed} calls)
        </span>
        {health.avgMs != null ? <span>· {formatDuration(health.avgMs)} avg</span> : null}
        {health.lastCall ? <span>· last {timeAgo(health.lastCall)}</span> : null}
      </p>
      {health.lastError ? (
        <p className="truncate text-destructive/90" title={health.lastError}>
          Last error: {health.lastError}
        </p>
      ) : null}
    </div>
  );
}

/** Result box of a connection test. */
export function TestResultBox({ result }: { result: TestResult }) {
  if (!result) return null;
  const entries = Object.entries(result).filter(([k]) => k !== 'ok');
  return (
    <div
      className={
        result.ok
          ? 'rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-xs'
          : 'rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs'
      }
      role="status"
    >
      <p className={result.ok ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'font-medium text-destructive'}>
        {result.ok ? 'Connection OK' : 'Test failed'}
      </p>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono">
        {entries.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
