'use client';

import { CheckCheckIcon, CheckIcon, ExternalLinkIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ApplyMethodChip, ScoreChip, StatusChip } from '@/components/jobs/chips';
import { JobDetailSheet } from '@/components/jobs/job-detail-sheet';
import type { ReviewAction, ReviewJob } from '@/components/review/types';
import { UserChip } from '@/components/shell/viewing';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Kbd } from '@/components/ui/kbd';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, platformLabel, safeHref, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Every close call in one table, newest first: approve, reject or keep the AI verdict for one row or for the
 * selected ones. A click opens the job. Keys: j / k move, x select, Enter open, u undo, Esc clear.
 */
export function ReviewList({
  jobs,
  total,
  busy,
  showUser,
  onAct,
  onUndo,
  onChanged,
}: {
  jobs: ReviewJob[];
  total: number;
  busy: boolean;
  showUser: boolean;
  onAct: (jobs: ReviewJob[], action: ReviewAction) => Promise<boolean>;
  onUndo: () => void;
  /** A change made in the job panel: the queue may have changed. */
  onChanged: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [active, setActive] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);

  // Jobs that left the list drop out of the selection by themselves.
  const chosen = jobs.filter((j) => selected.has(j.id));
  const allChosen = jobs.length > 0 && chosen.length === jobs.length;
  const current = Math.min(active, Math.max(0, jobs.length - 1));

  const toggle = (id: number, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  async function act(list: ReviewJob[], action: ReviewAction) {
    if (await onAct(list, action)) {
      setSelected((s) => new Set([...s].filter((id) => !list.some((j) => j.id === id))));
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey || openId != null) return;
      // Enter on a focused button or link is that control's own click, not "open the job".
      if (e.key === 'Enter' && el?.closest('button, a, [role=checkbox], [role=option], [role=menuitem]')) return;
      const row = jobs[current];
      if (e.key === 'j') setActive(Math.min(jobs.length - 1, current + 1));
      else if (e.key === 'k') setActive(Math.max(0, current - 1));
      else if (e.key === 'x' && row) toggle(row.id, !selected.has(row.id));
      else if (e.key === 'Enter' && row) setOpenId(row.id);
      else if (e.key === 'u') onUndo();
      else if (e.key === 'Escape') setSelected(new Set());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jobs, current, selected, openId, onUndo]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              {/* A phone decides row by row (or Mark all): no selection column, so the buttons fit. */}
              <TableHead className="hidden h-9 w-8 sm:table-cell">
                <Checkbox
                  checked={allChosen}
                  indeterminate={chosen.length > 0 && !allChosen}
                  onCheckedChange={(v) => setSelected(v ? new Set(jobs.map((j) => j.id)) : new Set())}
                  aria-label="Select all shown"
                />
              </TableHead>
              <TableHead className="h-9 text-xs">Score</TableHead>
              <TableHead className="hidden h-9 text-xs sm:table-cell">AI verdict</TableHead>
              <TableHead className="h-9 text-xs">Job and why the AI was unsure</TableHead>
              {showUser ? <TableHead className="hidden h-9 text-xs sm:table-cell">User</TableHead> : null}
              <TableHead className="hidden h-9 text-xs md:table-cell">Source</TableHead>
              <TableHead className="hidden h-9 text-xs md:table-cell">Found</TableHead>
              <TableHead className="h-9 text-right text-xs">Decide</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((j, i) => {
              const href = safeHref(j.manualApplyUrl) ?? safeHref(j.url);
              return (
                <TableRow
                  key={j.id}
                  data-state={selected.has(j.id) ? 'selected' : undefined}
                  className={cn('cursor-pointer', i === current && 'ring-1 ring-ring/40 ring-inset')}
                  onClick={() => {
                    setActive(i);
                    setOpenId(j.id);
                  }}
                >
                  <TableCell className="hidden py-2 sm:table-cell">
                    <Checkbox
                      checked={selected.has(j.id)}
                      onCheckedChange={(v) => toggle(j.id, !!v)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${j.title}`}
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    {/* On a phone the AI verdict sits under the score, so the decide buttons fit. */}
                    <div className="flex flex-col items-start gap-1">
                      <ScoreChip score={j.aiScore} />
                      <span className="sm:hidden">
                        <StatusChip status={j.status} />
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden py-2 sm:table-cell">
                    <StatusChip status={j.status} />
                  </TableCell>
                  <TableCell className="py-2 whitespace-normal">
                    {/* On a phone the title wraps and the user's name sits here, so the row fits the screen. */}
                    <div className="max-w-[36rem] min-w-36 sm:min-w-56">
                      <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 sm:flex-nowrap">
                        <span className="font-medium sm:truncate" title={j.title}>
                          {j.title}
                        </span>
                        <ApplyMethodChip method={j.applyMethod} />
                      </p>
                      <p className="text-xs text-muted-foreground sm:truncate">
                        {j.company}
                        {j.location ? ` · ${j.location}` : ''}
                        {j.salary ? ` · ${j.salary}` : ''}
                      </p>
                      {showUser ? <UserChip userId={j.userId} className="mt-1 sm:hidden" /> : null}
                      {j.aiReason ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground/90" title={j.aiReason}>
                          {j.aiReason}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  {showUser ? (
                    <TableCell className="hidden py-2 sm:table-cell">
                      <UserChip userId={j.userId} />
                    </TableCell>
                  ) : null}
                  <TableCell className="hidden py-2 text-xs md:table-cell">{platformLabel(j.platform)}</TableCell>
                  <TableCell className="hidden py-2 md:table-cell">
                    <span className="text-xs whitespace-nowrap text-muted-foreground" title={new Date(j.createdAt).toLocaleString()}>
                      {timeAgo(j.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Approve ${j.title}`}
                        title="Approve: good match"
                        className="text-approve hover:bg-approve/10 hover:text-approve"
                        disabled={busy}
                        onClick={() => void act([j], 'approve')}
                      >
                        <CheckIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Reject ${j.title}`}
                        title="Reject: not a match"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        disabled={busy}
                        onClick={() => void act([j], 'reject')}
                      >
                        <XIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Keep the AI verdict on ${j.title}`}
                        title="Keep the AI verdict"
                        disabled={busy}
                        onClick={() => void act([j], 'keep')}
                      >
                        <CheckCheckIcon />
                      </Button>
                      {href ? (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Open the apply page"
                          title="Open the apply page"
                          className="hidden sm:inline-flex"
                          nativeButton={false}
                          render={<a href={href} target="_blank" rel="noopener noreferrer" />}
                        >
                          <ExternalLinkIcon />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="tabular">
          {jobs.length < total ? `${formatNumber(jobs.length)} of ${formatNumber(total)} shown` : `${formatNumber(total)} waiting`}
        </span>
        <span className="ml-3 hidden md:inline">
          <Kbd>j</Kbd>/<Kbd>k</Kbd> move · <Kbd>x</Kbd> select · <Kbd>Enter</Kbd> open · <Kbd>u</Kbd> undo
        </span>
      </p>
      <p className="text-xs text-muted-foreground">
        Approve: approved, saved to Applications and sent to the user&apos;s Google Sheet, if they have one. Approve and
        Reject teach AI → Evaluations; Keep leaves the AI verdict as it is.
      </p>

      {chosen.length ? (
        <div
          role="toolbar"
          aria-label={`${chosen.length} selected jobs`}
          className="sticky bottom-3 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border bg-popover/95 p-1.5 text-sm shadow-lg backdrop-blur supports-backdrop-filter:bg-popover/80"
        >
          <span className="tabular px-2 font-medium" aria-live="polite">
            {chosen.length} selected
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => setSelected(new Set())} aria-label="Clear selection">
            <XIcon />
          </Button>
          <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void act(chosen, 'approve')}>
            <CheckIcon />
            Approve
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void act(chosen, 'reject')}>
            <XIcon />
            Reject
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void act(chosen, 'keep')}>
            <CheckCheckIcon />
            Keep AI verdict
          </Button>
        </div>
      ) : null}

      <JobDetailSheet jobId={openId} onOpenChange={(o) => !o && setOpenId(null)} onChanged={onChanged} />
    </div>
  );
}
