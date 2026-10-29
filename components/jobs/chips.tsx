import { APPLY_METHOD_LABEL, ELIGIBILITY_LABEL, STAGE_META, STATUS_META, scoreTier, TIER_META, type JobStage, type JobStatus } from '@/lib/format';
import { cn } from '@/lib/utils';

const chip = 'inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs font-medium whitespace-nowrap';

/** AI score with its tier colour (≥80 strong, ≥60 match, ≥40 maybe). */
export function ScoreChip({ score, className }: { score: number | null | undefined; className?: string }) {
  const tier = scoreTier(score);
  return (
    <span
      className={cn(chip, 'tabular min-w-9 justify-center', TIER_META[tier].className, className)}
      title={`${TIER_META[tier].label}${score != null ? ` · ${score}/100` : ''}`}
    >
      {score ?? '—'}
    </span>
  );
}

export function StatusChip({ status }: { status: JobStatus }) {
  return <span className={cn(chip, STATUS_META[status].className)}>{STATUS_META[status].label}</span>;
}

export function StageChip({ stage }: { stage: JobStage | null }) {
  const meta = STAGE_META[stage ?? 'NONE'];
  return (
    <span className={cn(chip, 'bg-muted text-foreground')}>
      <span className={cn('size-2 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}

export function ApplyMethodChip({ method }: { method: string | null }) {
  if (!method) return null;
  return (
    <span
      className={cn(
        chip,
        method === 'EASY_APPLY' ? 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300' : 'bg-muted text-muted-foreground',
      )}
    >
      {APPLY_METHOD_LABEL[method] ?? method}
    </span>
  );
}

export function EligibilityChip({ value }: { value: string | null }) {
  if (!value) return null;
  const good = value === 'worldwide' || value === 'europe' || value === 'emea';
  return (
    <span
      className={cn(
        chip,
        good ? 'bg-tier-match/12 text-tier-match-ink' : value === 'unclear' ? 'bg-muted text-muted-foreground' : 'bg-tier-maybe/20 text-tier-maybe-ink',
      )}
      title="Where the company can hire, as judged by the AI"
    >
      {ELIGIBILITY_LABEL[value] ?? value}
    </span>
  );
}
