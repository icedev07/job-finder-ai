import { cn } from '@/lib/utils';

export type StatusTone = 'ok' | 'warn' | 'error' | 'idle' | 'info';

const TONE: Record<StatusTone, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  error: 'bg-red-500',
  idle: 'bg-muted-foreground/40',
  info: 'bg-sky-500',
};

/** Small colored status indicator with an optional label. */
export function StatusDot({
  tone,
  label,
  pulse = false,
  className,
}: {
  tone: StatusTone;
  label?: string;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="relative inline-flex size-2">
        {pulse ? (
          <span
            className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', TONE[tone])}
          />
        ) : null}
        <span className={cn('relative inline-flex size-2 rounded-full', TONE[tone])} />
      </span>
      {label ? <span className="text-xs">{label}</span> : null}
      <span className="sr-only">{tone}</span>
    </span>
  );
}
