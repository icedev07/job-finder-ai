'use client';

import { CircleAlertIcon, PlayIcon, SparklesIcon, WorkflowIcon } from 'lucide-react';
import { useId } from 'react';

import { MiniStats, NoteLine } from '@/components/sources/run-summary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { formatNumber } from '@/lib/format';

export type ScrapeAllProgress = {
  status: 'running' | 'done';
  /** Boards finished so far. */
  done: number;
  total: number;
  /** Label of the board being scanned. */
  current: string | null;
  found: number;
  saved: number;
  approved: number;
  rejected: number;
  unanalyzed: number;
  errors: { board: string; message: string }[];
};

function ScrapeAllStatus({ progress: p }: { progress: ScrapeAllProgress }) {
  if (p.status === 'running') {
    return (
      <div className="space-y-2 rounded-lg bg-muted/50 p-3">
        <Progress value={p.total ? (p.done / p.total) * 100 : 0} className="gap-2">
          <ProgressLabel className="text-xs font-normal">
            Scanning {p.current} ({p.done + 1}/{p.total})…
          </ProgressLabel>
          <ProgressValue className="text-xs" />
        </Progress>
        <p className="tabular text-xs text-muted-foreground">
          So far: {formatNumber(p.saved)} stored · {formatNumber(p.approved)} suitable ·{' '}
          {formatNumber(p.rejected)} not suitable · {formatNumber(p.found)} found
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5 rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">
        Last full scrape · {p.total} {p.total === 1 ? 'source' : 'sources'}
      </p>
      <MiniStats
        className="grid-cols-2 @sm:grid-cols-4"
        items={[
          { label: 'Stored', value: formatNumber(p.saved) },
          {
            label: 'Suitable',
            value: formatNumber(p.approved),
            className: p.approved ? 'text-tier-match-ink' : undefined,
          },
          { label: 'Not suitable', value: formatNumber(p.rejected) },
          { label: 'Found', value: formatNumber(p.found) },
        ]}
      />
      {p.unanalyzed > 0 ? (
        <NoteLine tone="warning">{`${formatNumber(p.unanalyzed)} not yet checked: run again to continue.`}</NoteLine>
      ) : null}
      {p.errors.length ? (
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <CircleAlertIcon className="size-3.5" aria-hidden />
            {p.errors.length} {p.errors.length === 1 ? 'source' : 'sources'} failed
          </p>
          <ul className="max-h-36 space-y-1 overflow-y-auto text-xs text-destructive">
            {p.errors.map((e) => (
              <li key={e.board} className="break-words">
                <code className="font-mono font-medium">{e.board}</code>: {e.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Scrape every enabled source (one request per board), with the shared re-scan setting. */
export function PipelineCard({
  enabledCount,
  totalCount,
  rescanDays,
  ready,
  busy,
  runningAll,
  progress,
  onRescanDaysChange,
  onRescanDaysBlur,
  onScrapeAll,
  onScrapeAndAnalyze,
}: {
  enabledCount: number;
  totalCount: number;
  rescanDays: string;
  /** The scanner settings are loaded. */
  ready: boolean;
  /** A scan or the analysis is running. */
  busy: boolean;
  runningAll: boolean;
  progress: ScrapeAllProgress | null;
  onRescanDaysChange: (value: string) => void;
  onRescanDaysBlur: () => void;
  onScrapeAll: () => void;
  onScrapeAndAnalyze: () => void;
}) {
  const id = useId();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WorkflowIcon className="size-4 text-muted-foreground" aria-hidden />
          One-click pipeline
        </CardTitle>
        <CardDescription>
          Scrapes every enabled source and checks each job with AI inline: only the checked result (suitable / not
          suitable) is stored, never a raw pending list.
        </CardDescription>
      </CardHeader>
      <CardContent className="@container flex flex-1 flex-col gap-4">
        <Field>
          <FieldLabel htmlFor={`${id}-rescan`}>Re-scan duplicates after</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id={`${id}-rescan`}
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              value={rescanDays}
              onChange={(e) => onRescanDaysChange(e.target.value)}
              onBlur={onRescanDaysBlur}
              disabled={!ready}
              className="tabular w-24"
            />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
          <FieldDescription className="text-xs">
            0 = never re-analyze; existing rows still get their description and location refreshed on every run.
          </FieldDescription>
        </Field>
        {progress ? <ScrapeAllStatus progress={progress} /> : null}
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {enabledCount} of {totalCount} sources enabled
        </span>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={!ready || busy} onClick={onScrapeAndAnalyze}>
            <SparklesIcon />
            Scrape + analyze
          </Button>
          <Button size="sm" disabled={!ready || busy} onClick={onScrapeAll}>
            {runningAll ? <Spinner /> : <PlayIcon />}
            {runningAll ? 'Running…' : 'Scrape all sources'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
