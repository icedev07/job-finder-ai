'use client';

import { ChevronDownIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { CopyButton } from '@/components/common/copy-button';
import type {
  AnalysisLogRow,
  ExtensionLogRow,
  JobRow,
  LogColumn,
  ScanLogRow,
} from '@/components/logs/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDateTime, formatNumber, platformLabel, safeHref, STATUS_META } from '@/lib/format';
import { cn } from '@/lib/utils';

const OK_TONE = 'bg-tier-match/15 text-tier-match-ink';
const ERROR_TONE = 'bg-destructive/10 text-destructive';
const WARN_TONE = 'bg-tier-maybe/20 text-tier-maybe-ink';
const NEUTRAL_TONE = 'bg-muted text-muted-foreground';

const STATUS = STATUS_META as Record<string, { label: string; className: string } | undefined>;

const withSeconds = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function Muted({ children = '—' }: { children?: ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

/** Short date in the cell, the full local date and time on hover. */
function Timestamp({ iso, seconds = false }: { iso: string; seconds?: boolean }) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <Muted />;
  return (
    <time dateTime={iso} title={date.toLocaleString()} className="tabular text-xs text-muted-foreground">
      {seconds ? withSeconds.format(date) : formatDateTime(date)}
    </time>
  );
}

/** One line of a long text (reason, error); the full text shows on hover or keyboard focus. */
function LongText({ text, className }: { text: string | null; className?: string }) {
  if (!text) return <Muted />;
  if (text.length <= 32) return <span className={cn('block truncate', className)}>{text}</span>;
  return (
    <Tooltip>
      <TooltipTrigger
        delay={250}
        className={cn(
          'block cursor-default rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          className,
        )}
      >
        <span className="block truncate">{text}</span>
      </TooltipTrigger>
      <TooltipContent className="block max-w-md text-left whitespace-pre-wrap wrap-anywhere">{text}</TooltipContent>
    </Tooltip>
  );
}

/** An external link (http/https only) cut to one line, with an optional copy button for the raw URL. */
function LinkCell({
  url,
  label,
  title,
  copyLabel,
  muted = false,
  className,
}: {
  url: string;
  label: string;
  title?: string;
  copyLabel?: string;
  muted?: boolean;
  className?: string;
}) {
  const href = safeHref(url);
  return (
    <span className={cn('flex min-w-0 items-center gap-1', className)}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={title ?? label}
          className={cn(
            'min-w-0 truncate rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50',
            muted ? 'text-muted-foreground' : 'text-primary',
          )}
        >
          {label}
        </a>
      ) : (
        <span className="min-w-0 truncate" title={title ?? label}>
          {label}
        </span>
      )}
      {copyLabel && url ? <CopyButton value={url} label={copyLabel} size="icon-xs" /> : null}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string | null | undefined }) {
  if (!platform) return <Muted />;
  return <Badge variant="secondary">{platformLabel(platform)}</Badge>;
}

function JobStatusBadge({ status }: { status: string }) {
  const meta = STATUS[status];
  return <Badge className={meta?.className ?? NEUTRAL_TONE}>{meta?.label ?? status}</Badge>;
}

/** 60+ reads as a match (the threshold the jobs list has always used). */
function Score({ value }: { value: number | null }) {
  if (value === null) return <Muted />;
  return (
    <span className={cn('tabular font-semibold', value >= 60 ? 'text-tier-match-ink' : 'text-destructive')}>
      {value}
    </span>
  );
}

function ApplyCell({ job }: { job: JobRow }) {
  const apply = job.manualApplyUrl || job.url;
  if (!apply) return <Muted />;
  const fallback = !job.manualApplyUrl;
  return (
    <LinkCell
      url={apply}
      label={fallback ? `via ${platformLabel(job.platform)}` : 'Open apply'}
      title={apply}
      copyLabel={fallback ? 'Copy job URL' : 'Copy apply URL'}
      muted={fallback}
      className="max-w-44 text-xs"
    />
  );
}

function LevelBadge({ level }: { level: string }) {
  const tone =
    level === 'error'
      ? ERROR_TONE
      : level === 'warn' || level === 'warning'
        ? WARN_TONE
        : level === 'debug'
          ? NEUTRAL_TONE
          : OK_TONE;
  return <Badge className={tone}>{level}</Badge>;
}

/** Up to two lines of the message; long or multi-line messages can be expanded in place. */
function Message({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 160 || text.includes('\n');
  return (
    <div className="flex max-w-3xl min-w-80 items-start gap-1">
      <p
        className={cn(
          'min-w-0 flex-1 font-mono text-xs wrap-anywhere',
          open ? 'whitespace-pre-wrap' : 'line-clamp-2 whitespace-normal',
        )}
      >
        {text}
      </p>
      {long ? (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-expanded={open}
          aria-label="Full message"
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDownIcon className={cn('transition-transform', open && 'rotate-180')} />
        </Button>
      ) : null}
    </div>
  );
}

function scanDuration(ms: number | null): string {
  return ms ? `${(ms / 1000).toFixed(1)}s` : '—';
}

const NUMERIC = 'text-right';

export const JOB_COLUMNS: LogColumn<JobRow>[] = [
  { id: 'platform', header: 'Platform', cell: (j) => <PlatformBadge platform={j.platform} /> },
  {
    id: 'title',
    header: 'Title',
    cell: (j) => (
      <LinkCell url={j.url} label={j.title} copyLabel="Copy job URL" className="max-w-56 font-medium" />
    ),
  },
  {
    id: 'company',
    header: 'Company',
    cell: (j) => (
      <span className="block max-w-40 truncate" title={j.company}>
        {j.company}
      </span>
    ),
  },
  {
    id: 'location',
    header: 'Location',
    cell: (j) =>
      j.location ? (
        <span className="block max-w-36 truncate text-xs text-muted-foreground" title={j.location}>
          {j.location}
        </span>
      ) : (
        <Muted />
      ),
  },
  { id: 'apply', header: 'Manual apply', cell: (j) => <ApplyCell job={j} /> },
  { id: 'status', header: 'Status', cell: (j) => <JobStatusBadge status={j.status} /> },
  { id: 'score', header: 'Score', className: NUMERIC, cell: (j) => <Score value={j.aiScore} /> },
  {
    id: 'reason',
    header: 'Reason',
    cell: (j) => <LongText text={j.aiReason} className="max-w-64 text-xs text-muted-foreground" />,
  },
  { id: 'date', header: 'Date', cell: (j) => <Timestamp iso={j.createdAt} /> },
];

export const ANALYSIS_COLUMNS: LogColumn<AnalysisLogRow>[] = [
  { id: 'platform', header: 'Platform', cell: (l) => <PlatformBadge platform={l.scrapedJob?.platform} /> },
  {
    id: 'title',
    header: 'Title',
    cell: (l) =>
      l.scrapedJob ? (
        <LinkCell url={l.scrapedJob.url} label={l.scrapedJob.title} className="max-w-52 font-medium" />
      ) : (
        <span className="tabular text-muted-foreground">#{l.scrapedJobId}</span>
      ),
  },
  {
    id: 'company',
    header: 'Company',
    cell: (l) =>
      l.scrapedJob?.company ? (
        <span className="block max-w-40 truncate" title={l.scrapedJob.company}>
          {l.scrapedJob.company}
        </span>
      ) : (
        <Muted />
      ),
  },
  {
    id: 'model',
    header: 'Model',
    cell: (l) => (
      <span className="block max-w-44 truncate font-mono text-xs" title={l.model}>
        {l.model}
      </span>
    ),
  },
  {
    id: 'score',
    header: 'Score',
    className: NUMERIC,
    cell: (l) => (l.score === null ? <Muted /> : <span className="tabular font-semibold">{l.score}</span>),
  },
  {
    id: 'result',
    header: 'Result',
    cell: (l) => <JobStatusBadge status={l.approved ? 'APPROVED' : 'REJECTED'} />,
  },
  {
    id: 'reason',
    header: 'Reason',
    cell: (l) => <LongText text={l.reason} className="max-w-60 text-xs text-muted-foreground" />,
  },
  {
    id: 'tokens',
    header: 'Tokens',
    className: NUMERIC,
    cell: (l) => (l.tokensUsed === null ? <Muted /> : <span className="tabular">{formatNumber(l.tokensUsed)}</span>),
  },
  { id: 'date', header: 'Date', cell: (l) => <Timestamp iso={l.createdAt} /> },
];

export const SCAN_COLUMNS: LogColumn<ScanLogRow>[] = [
  {
    id: 'board',
    header: 'Board',
    cell: (l) => (
      <span className="font-medium" title={l.board}>
        {platformLabel(l.board)}
      </span>
    ),
  },
  {
    id: 'found',
    header: 'Found',
    className: NUMERIC,
    cell: (l) => <span className="tabular">{formatNumber(l.jobsFound)}</span>,
  },
  {
    id: 'saved',
    header: 'Saved',
    className: NUMERIC,
    cell: (l) => <span className="tabular">{formatNumber(l.jobsSaved)}</span>,
  },
  {
    id: 'duration',
    header: 'Duration',
    className: NUMERIC,
    cell: (l) => <span className="tabular text-muted-foreground">{scanDuration(l.durationMs)}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: (l) => <Badge className={l.errors ? ERROR_TONE : OK_TONE}>{l.errors ? 'Error' : 'OK'}</Badge>,
  },
  {
    id: 'errors',
    header: 'Errors',
    cell: (l) => <LongText text={l.errors} className="max-w-80 text-xs text-destructive" />,
  },
  { id: 'date', header: 'Date', cell: (l) => <Timestamp iso={l.createdAt} /> },
];

export const EXTENSION_COLUMNS: LogColumn<ExtensionLogRow>[] = [
  { id: 'level', header: 'Level', cell: (l) => <LevelBadge level={l.level} /> },
  { id: 'message', header: 'Message', className: 'w-full whitespace-normal', cell: (l) => <Message text={l.message} /> },
  {
    id: 'session',
    header: 'Session',
    cell: (l) =>
      l.sessionId ? (
        <span className="block max-w-36 truncate font-mono text-xs text-muted-foreground" title={l.sessionId}>
          {l.sessionId}
        </span>
      ) : (
        <Muted />
      ),
  },
  { id: 'date', header: 'Date', cell: (l) => <Timestamp iso={l.createdAt} seconds /> },
];

// Accessible names for the row checkboxes ("Select …").
export const jobRowLabel = (j: JobRow) => `${j.title} at ${j.company}`;
export const analysisRowLabel = (l: AnalysisLogRow) =>
  `analysis of ${l.scrapedJob?.title ?? `job #${l.scrapedJobId}`}`;
export const scanRowLabel = (l: ScanLogRow) => `${platformLabel(l.board)} scan, ${formatDateTime(l.createdAt)}`;
export const extensionRowLabel = (l: ExtensionLogRow) => `${l.level} log, ${formatDateTime(l.createdAt)}`;
