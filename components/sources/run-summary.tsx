import { CircleAlertIcon, TriangleAlertIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { runYield, type RunSummary } from '@/components/sources/scan-results';
import { Spinner } from '@/components/ui/spinner';
import { formatDuration, formatNumber, formatPercent, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

export type MiniStat = { label: string; value: ReactNode; className?: string };

/** A row of small label-over-value stats; the caller sets the grid columns. */
export function MiniStats({ items, className }: { items: MiniStat[]; className?: string }) {
  return (
    <dl className={cn('grid gap-x-2 gap-y-2', className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="truncate text-[11px] leading-4 text-muted-foreground">{item.label}</dt>
          <dd className={cn('truncate text-sm leading-5 font-medium', item.className)}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A warning or error line: icon + text, clamped with the full text on hover. */
export function NoteLine({ tone, children }: { tone: 'warning' | 'error'; children: string }) {
  const Icon = tone === 'error' ? CircleAlertIcon : TriangleAlertIcon;
  return (
    <p
      className={cn(
        'flex items-start gap-1.5 text-xs',
        tone === 'error' ? 'text-destructive' : 'text-tier-maybe-ink',
      )}
      title={children}
    >
      <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
      <span className="line-clamp-3 min-w-0 break-words">{children}</span>
    </p>
  );
}

/** "Yield ▰▱▱ 33%  2 of 6 suitable": the share of AI-checked jobs judged suitable. */
function YieldLine({ summary }: { summary: RunSummary }) {
  const y = runYield(summary);
  if (!y) return null;
  const pct = Math.round(y.ratio * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">Yield</span>
      <div
        role="meter"
        aria-label="Yield"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${pct}% of the checked jobs were suitable`}
        className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-tier-match/15"
      >
        <div className="h-full rounded-full bg-tier-match" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-medium">{formatPercent(y.ratio)}</span>
      <span className="whitespace-nowrap text-muted-foreground">
        {formatNumber(y.approved)} of {formatNumber(y.checked)} suitable
      </span>
    </div>
  );
}

/** The last run of one source: compact stats, yield, warnings, or the error. */
export function RunResult({
  summary,
  scanning,
  now,
  className,
}: {
  summary: RunSummary | null;
  scanning: boolean;
  /** Clock for the relative time; null before hydration. */
  now: number | null;
  className?: string;
}) {
  const extras = summary
    ? [
        summary.refreshed ? `${formatNumber(summary.refreshed)} refreshed` : null,
        summary.rescanned ? `${formatNumber(summary.rescanned)} re-analyzed` : null,
      ].filter(Boolean)
    : [];

  return (
    <section aria-label="Last run" className={cn('@container space-y-2.5 rounded-lg bg-muted/50 p-3', className)}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
        {scanning ? (
          <>
            <Spinner className="size-3.5" />
            <span className="text-foreground">Scanning… this can take up to a minute</span>
          </>
        ) : summary ? (
          <>Last run{now !== null ? ` · ${timeAgo(summary.at, now)}` : ''}</>
        ) : (
          'Never run'
        )}
      </p>

      {summary?.error ? (
        <div className={cn(scanning && 'opacity-50')}>
          <NoteLine tone="error">{summary.error}</NoteLine>
        </div>
      ) : summary ? (
        <div className={cn('space-y-2.5', scanning && 'opacity-50')}>
          <MiniStats
            className="grid-cols-3 @3xs:grid-cols-5"
            items={[
              { label: 'Found', value: formatNumber(summary.found) },
              { label: 'New', value: formatNumber(summary.saved) },
              {
                label: 'Approved',
                value: summary.approved === null ? '—' : formatNumber(summary.approved),
                className: summary.approved ? 'text-tier-match-ink' : undefined,
              },
              { label: 'Rejected', value: summary.rejected === null ? '—' : formatNumber(summary.rejected) },
              { label: 'Time', value: formatDuration(summary.durationMs) },
            ]}
          />
          <YieldLine summary={summary} />
          {extras.length ? <p className="text-xs text-muted-foreground">{extras.join(' · ')}</p> : null}
          {summary.note ? <NoteLine tone="warning">{summary.note}</NoteLine> : null}
        </div>
      ) : null}
    </section>
  );
}
