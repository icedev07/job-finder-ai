import Link from 'next/link';
import type { ReactNode } from 'react';

import { Sparkline } from '@/components/dashboard/sparkline';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Stat tile: label · big tabular value · secondary line · optional 14-day sparkline or a meter (e.g. quota).
 */
export function KpiTile({
  label,
  value,
  sub,
  series,
  seriesLabels,
  meter,
  href,
  icon,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  series?: number[];
  seriesLabels?: string[];
  /** { value 0..100, tone } — replaces the sparkline. */
  meter?: { percent: number; tone: 'ok' | 'warn' | 'error' };
  href?: string;
  icon?: ReactNode;
}) {
  const body = (
    <Card size="sm" className={cn('h-full gap-2 px-4', href && 'transition-colors hover:bg-accent/40')}>
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
        <span className="truncate">{label}</span>
        {icon ? <span className="text-muted-foreground/70 [&_svg]:size-3.5">{icon}</span> : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="tabular text-2xl leading-none font-semibold tracking-tight">{value}</p>
          {sub ? <p className="mt-1.5 truncate text-xs text-muted-foreground">{sub}</p> : null}
        </div>
        {meter ? null : series && series.some((v) => v > 0) ? (
          <Sparkline
            values={series}
            labels={seriesLabels}
            ariaLabel={`${label} per day`}
            width={96}
            height={30}
            className="hidden shrink-0 sm:block"
          />
        ) : null}
      </div>
      {meter ? (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-primary/12"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={meter.percent}
          aria-label={`${label} used`}
        >
          <div
            className={cn(
              'h-full rounded-full',
              meter.tone === 'error'
                ? 'bg-destructive'
                : meter.tone === 'warn'
                  ? 'bg-amber-500'
                  : 'bg-primary',
            )}
            style={{ width: `${Math.min(100, Math.max(0, meter.percent))}%` }}
          />
        </div>
      ) : null}
    </Card>
  );
  return href ? (
    <Link
      href={href}
      className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {body}
    </Link>
  ) : (
    body
  );
}
