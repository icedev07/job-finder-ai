'use client';

import { CheckIcon, ExternalLinkIcon, SkipForwardIcon, Undo2Icon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ApplyMethodChip, EligibilityChip, ScoreChip, StatusChip } from '@/components/jobs/chips';
import { useStatus } from '@/components/shell/status-provider';
import { UserChip } from '@/components/shell/viewing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Kbd } from '@/components/ui/kbd';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { api, errorMessage } from '@/lib/clientApi';
import { platformLabel, safeHref, timeAgo, type JobStatus } from '@/lib/format';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';

type ReviewJob = {
  id: number;
  userId: number;
  platform: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  manualApplyUrl: string | null;
  applyMethod: string | null;
  salary: string | null;
  techStack: string | null;
  status: JobStatus;
  aiScore: number | null;
  aiReason: string | null;
  eligibility: string | null;
  description: string | null;
  createdAt: string;
};

type Decision = { job: ReviewJob; kind: 'good' | 'bad' | 'skip' };

/**
 * One close call at a time. Good match → 👍 + approved + Saved in the pipeline; Not a match → 👎 + rejected;
 * Skip leaves it for later. Every decision can be undone. Keys: y / → good, n / ← not, s skip, o open, u undo.
 */
export function ReviewDeck() {
  const [queue, setQueue] = useState<ReviewJob[] | null>(null);
  const [total, setTotal] = useState(0);
  // One user's score band (null with all users: each has their own).
  const [band, setBand] = useState<{ min: number; max: number } | null>(null);
  const [done, setDone] = useState<Decision[]>([]);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { refresh } = useStatus();

  const load = useCallback(async () => {
    try {
      const r = await api<{ jobs: ReviewJob[]; total: number; band: { min: number; max: number } | null }>('/api/admin/review');
      setQueue(r.jobs);
      setTotal(r.total);
      setBand(r.band);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);
  useLoadOnMount(load);

  const current = queue?.[0];

  const decide = useCallback(
    async (kind: Decision['kind']) => {
      if (!current || busy) return;
      setBusy(true);
      try {
        if (kind !== 'skip') {
          await api('/api/admin/jobs', {
            method: 'PATCH',
            json: {
              ids: [current.id],
              set: kind === 'good' ? { feedback: 1, status: 'APPROVED' } : { feedback: -1, status: 'REJECTED' },
            },
          });
        }
        setDone((d) => [...d, { job: current, kind }]);
        setQueue((q) => (q ? q.slice(1) : q));
        setExpanded(false);
        refresh();
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [current, busy, refresh],
  );

  const undo = useCallback(async () => {
    const last = done[done.length - 1];
    if (!last || busy) return;
    setBusy(true);
    try {
      if (last.kind !== 'skip') {
        // Restore the AI verdict and clear the feedback / pipeline entry.
        await api('/api/admin/jobs', {
          method: 'PATCH',
          json: { ids: [last.job.id], set: { feedback: null, status: last.job.status, stage: null } },
        });
      }
      setDone((d) => d.slice(0, -1));
      setQueue((q) => [last.job, ...(q ?? [])]);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [done, busy, refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'y' || e.key === 'ArrowRight') void decide('good');
      else if (e.key === 'n' || e.key === 'ArrowLeft') void decide('bad');
      else if (e.key === 's') void decide('skip');
      else if (e.key === 'u') void undo();
      else if (e.key === 'o' && current) {
        const href = safeHref(current.manualApplyUrl) ?? safeHref(current.url);
        if (href) window.open(href, '_blank', 'noopener');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decide, undo, current]);

  if (!queue) {
    return (
      <div className="grid h-40 place-items-center">
        <Spinner />
      </div>
    );
  }

  const reviewed = done.filter((d) => d.kind !== 'skip').length;
  const progress = total + reviewed > 0 ? (reviewed / (total + reviewed)) * 100 : 100;

  if (!current) {
    return (
      <Empty className="rounded-xl border py-12">
        <EmptyHeader>
          <EmptyTitle>Queue is empty</EmptyTitle>
          <EmptyDescription>
            {reviewed ? `You reviewed ${reviewed} job${reviewed === 1 ? '' : 's'}. ` : ''}New close calls (score{' '}
            {band ? `${band.min}–${band.max}` : 'near 60'}) land here after each scan.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          {done.length ? (
            <Button variant="outline" onClick={() => void undo()}>
              <Undo2Icon />
              Undo last
            </Button>
          ) : null}
          <Button variant="outline" nativeButton={false} render={<Link href="/admin/jobs?status=APPROVED" />}>
            Approved jobs
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const href = safeHref(current.manualApplyUrl) ?? safeHref(current.url);
  const description = current.description ?? '';

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="tabular whitespace-nowrap">{queue.length} left</span>
        <Progress value={progress} className="flex-1" aria-label="Review progress" />
        <Button size="sm" variant="ghost" onClick={() => void undo()} disabled={!done.length || busy}>
          <Undo2Icon />
          Undo
        </Button>
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
              {expanded || description.length <= 900 ? description : `${description.slice(0, 900)}…`}
              {description.length > 900 ? (
                <Button variant="link" size="sm" className="h-auto px-1" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? 'Show less' : 'Show more'}
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void decide('bad')} disabled={busy}>
            <XIcon />
            Not a match <Kbd>n</Kbd>
          </Button>
          <Button variant="ghost" onClick={() => void decide('skip')} disabled={busy}>
            <SkipForwardIcon />
            Skip <Kbd>s</Kbd>
          </Button>
          {href ? (
            <Button variant="ghost" nativeButton={false} render={<a href={href} target="_blank" rel="noopener noreferrer" />}>
              <ExternalLinkIcon />
              Open <Kbd>o</Kbd>
            </Button>
          ) : null}
          <Button className="ml-auto bg-approve text-approve-foreground hover:bg-approve/90" onClick={() => void decide('good')} disabled={busy}>
            {busy ? <Spinner /> : <CheckIcon />}
            Good match <Kbd className="bg-approve-foreground/15 text-approve-foreground">y</Kbd>
          </Button>
        </CardFooter>
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        Good match → approved and saved to Applications. Your answers become the truth set for AI → Evaluations.
      </p>
    </div>
  );
}
