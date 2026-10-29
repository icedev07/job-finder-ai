import { formatCompact, formatNumber, formatPercent, ratio } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface FunnelStep {
  key: string;
  label: string;
  value: number;
}

/**
 * Job funnel (found → judged → approved → applied → interview → offer). Bars use a square-root scale so the
 * small late steps stay visible next to thousands of found jobs; exact values and step conversion are printed
 * beside each bar.
 */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <ol className="space-y-2" aria-label="Job funnel">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1] : undefined;
        const conv = prev ? ratio(s.value, prev.value) : null;
        const width = s.value > 0 ? Math.max(1.5, Math.sqrt(s.value / max) * 100) : 0;
        return (
          <li
            key={s.key}
            className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 text-sm max-sm:grid-cols-[7rem_1fr_auto]"
          >
            <span className="truncate text-muted-foreground">{s.label}</span>
            <span className="h-2.5 rounded-full bg-muted" title={`${s.label}: ${formatNumber(s.value)}`}>
              <span
                className={cn('block h-full rounded-full', i >= 3 ? 'bg-chart-3' : 'bg-chart-1')}
                style={{ width: `${width}%` }}
              />
            </span>
            <span className="tabular flex w-24 items-baseline justify-end gap-1.5 text-right">
              <span className="font-semibold">{formatCompact(s.value)}</span>
              <span className="w-10 text-xs text-muted-foreground">{conv === null ? '' : formatPercent(conv)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
