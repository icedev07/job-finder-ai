'use client';

import { CircleCheckIcon, SparklesIcon } from 'lucide-react';
import { useId } from 'react';

import { NoteLine } from '@/components/sources/run-summary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export type AnalysisProgress = {
  /** "waiting" = counting down through a short rate limit. */
  status: 'running' | 'waiting' | 'done' | 'stopped' | 'error';
  message: string;
  analyzed: number;
  remaining: number;
};

function AnalysisStatus({ progress: p }: { progress: AnalysisProgress }) {
  if (p.status === 'running' || p.status === 'waiting') {
    const total = p.analyzed + p.remaining;
    return (
      <div className="rounded-lg bg-muted/50 p-3">
        <Progress value={total ? (p.analyzed / total) * 100 : 0} className="gap-2">
          <ProgressLabel className={cn('tabular text-xs font-normal', p.status === 'waiting' && 'text-tier-maybe-ink')}>
            {p.message}
          </ProgressLabel>
          <ProgressValue className="text-xs" />
        </Progress>
      </div>
    );
  }
  if (p.status === 'done') {
    return (
      <p className="flex items-start gap-1.5 rounded-lg bg-muted/50 p-3 text-xs">
        <CircleCheckIcon className="mt-px size-3.5 shrink-0 text-tier-match-ink" aria-hidden />
        <span>{p.message}</span>
      </p>
    );
  }
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <NoteLine tone={p.status === 'error' ? 'error' : 'warning'}>{p.message}</NoteLine>
    </div>
  );
}

/** Drains leftover PENDING jobs through /api/admin/analyze, batch after batch. */
export function AnalysisCard({
  pending,
  batchSize,
  ready,
  analyzing,
  progress,
  onBatchSizeChange,
  onBatchSizeBlur,
  onAnalyze,
}: {
  /** Null until the stats are loaded. */
  pending: number | null;
  batchSize: string;
  /** The scanner settings are loaded. */
  ready: boolean;
  analyzing: boolean;
  progress: AnalysisProgress | null;
  onBatchSizeChange: (value: string) => void;
  onBatchSizeBlur: () => void;
  onAnalyze: () => void;
}) {
  const id = useId();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="size-4 text-muted-foreground" aria-hidden />
          Pending AI analysis
        </CardTitle>
        <CardDescription>
          Scans now check every job inline and store only the result, so this stays at 0 in normal use. It clears any
          leftovers (a rescan reset, or a pre-upgrade backlog), syncs approved jobs to Google Sheets and auto-waits
          through transient rate limits.
        </CardDescription>
        <CardAction>
          {pending === null ? (
            <Skeleton className="h-5 w-20 rounded-full" />
          ) : (
            <Badge
              variant="outline"
              className={cn(
                'tabular',
                pending > 0 ? 'border-transparent bg-tier-maybe/20 text-tier-maybe-ink' : 'text-muted-foreground',
              )}
            >
              {formatNumber(pending)} pending
            </Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <Field>
          <FieldLabel htmlFor={`${id}-batch`}>Jobs per AI call</FieldLabel>
          <Input
            id={`${id}-batch`}
            type="number"
            inputMode="numeric"
            min={1}
            max={12}
            value={batchSize}
            onChange={(e) => onBatchSizeChange(e.target.value)}
            onBlur={onBatchSizeBlur}
            disabled={!ready || analyzing}
            className="tabular w-24"
          />
          <FieldDescription className="text-xs">
            How many jobs to pack into one LLM request. Higher = fewer requests = faster on the free tier (max 12).
          </FieldDescription>
        </Field>
        {progress ? <AnalysisStatus progress={progress} /> : null}
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" disabled={analyzing || !pending} onClick={onAnalyze}>
          {analyzing ? <Spinner /> : <SparklesIcon />}
          {analyzing ? 'Analyzing…' : 'Analyze pending'}
        </Button>
      </CardFooter>
    </Card>
  );
}
