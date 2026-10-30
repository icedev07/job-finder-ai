'use client';

import { CheckCheckIcon, CheckIcon, ExternalLinkIcon, SkipForwardIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ApplyMethodChip, EligibilityChip, ScoreChip, StatusChip } from '@/components/jobs/chips';
import type { ReviewAction, ReviewJob } from '@/components/review/types';
import { UserChip } from '@/components/shell/viewing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Kbd } from '@/components/ui/kbd';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { platformLabel, safeHref, timeAgo } from '@/lib/format';

/**
 * One close call at a time. Good match → 👍, approved, saved to Applications and sent to the Google Sheet; Not a
 * match → 👎 and rejected; Keep → the AI verdict stays, unrated; Skip → later in this visit. Keys: y / → good,
 * n / ← not, k keep, s skip, o open, u undo.
 */
export function ReviewFocus({
  jobs,
  left,
  reviewed,
  busy,
  skipped,
  onAct,
  onSkip,
  onUndo,
}: {
  /** In the order to show them: the first one is on the card. */
  jobs: ReviewJob[];
  /** Waiting in the queue, beyond the loaded ones too. */
  left: number;
  /** Decided this visit. */
  reviewed: number;
  busy: boolean;
  skipped: number[];
  onAct: (job: ReviewJob, action: ReviewAction) => void;
  onSkip: (job: ReviewJob) => void;
  onUndo: () => void;
}) {
  const current = jobs[0];
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'u') return onUndo();
      if (!current || busy) return;
      if (e.key === 'y' || e.key === 'ArrowRight') onAct(current, 'approve');
      else if (e.key === 'n' || e.key === 'ArrowLeft') onAct(current, 'reject');
      else if (e.key === 'k') onAct(current, 'keep');
      else if (e.key === 's') onSkip(current);
      else if (e.key === 'o') {
        const href = safeHref(current.manualApplyUrl) ?? safeHref(current.url);
        if (href) window.open(href, '_blank', 'noopener');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, busy, onAct, onSkip, onUndo]);

  if (!current) {
    return (
      <div className="grid h-40 place-items-center">
        <Spinner />
      </div>
    );
  }

  const progress = left + reviewed > 0 ? (reviewed / (left + reviewed)) * 100 : 100;
  const href = safeHref(current.manualApplyUrl) ?? safeHref(current.url);
  const description = current.description ?? '';
  const full = expanded === current.id;

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="tabular whitespace-nowrap">{left} left</span>
        <Progress value={progress} className="flex-1" aria-label="Review progress" />
      </div>
      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <ScoreChip score={current.aiScore} />
            <StatusChip status={current.status} />
            <EligibilityChip value={current.eligibility} />
            <ApplyMethodChip method={current.applyMethod} />
            <Badge variant="outline">{platformLabel(current.platform)}</Badge>
            <UserChip userId={current.userId} />
            {skipped.includes(current.id) ? <Badge variant="secondary">Skipped earlier</Badge> : null}
            <span className="ml-auto text-xs text-muted-foreground">found {timeAgo(current.createdAt)}</span>
          </div>
          <h2 className="text-lg leading-snug font-semibold">{current.title}</h2>
          <p className="text-sm text-muted-foreground">
            {current.company}
            {current.location ? ` · ${current.location}` : ''}
            {current.salary ? ` · ${current.salary}` : ''}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Why the AI was unsure</p>
            {current.aiReason || '—'}
          </div>
          {current.techStack ? (
            <div className="flex flex-wrap gap-1">
              {current.techStack.split(',').map((t) => (
                <Badge key={t.trim()} variant="secondary">
                  {t.trim()}
                </Badge>
              ))}
            </div>
          ) : null}
          {description ? (
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {full || description.length <= 900 ? description : `${description.slice(0, 900)}…`}
              {description.length > 900 ? (
                <Button variant="link" size="sm" className="h-auto px-1" onClick={() => setExpanded(full ? null : current.id)}>
                  {full ? 'Show less' : 'Show more'}
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onAct(current, 'reject')} disabled={busy}>
            <XIcon />
            Not a match <Kbd>n</Kbd>
          </Button>
          <Button variant="ghost" onClick={() => onAct(current, 'keep')} disabled={busy}>
            <CheckCheckIcon />
            Keep AI verdict <Kbd>k</Kbd>
          </Button>
          <Button variant="ghost" onClick={() => onSkip(current)} disabled={busy}>
            <SkipForwardIcon />
            Skip <Kbd>s</Kbd>
          </Button>
          {href ? (
            <Button variant="ghost" nativeButton={false} render={<a href={href} target="_blank" rel="noopener noreferrer" />}>
              <ExternalLinkIcon />
              Open <Kbd>o</Kbd>
            </Button>
          ) : null}
          <Button className="ml-auto bg-approve text-approve-foreground hover:bg-approve/90" onClick={() => onAct(current, 'approve')} disabled={busy}>
            {busy ? <Spinner /> : <CheckIcon />}
            Good match <Kbd className="bg-approve-foreground/15 text-approve-foreground">y</Kbd>
          </Button>
        </CardFooter>
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        Good match → approved, saved to Applications and sent to the user&apos;s Google Sheet, if they have one. Your yes
        and no answers become the truth set for AI → Evaluations; Keep leaves the AI verdict unrated.
      </p>
    </div>
  );
}
