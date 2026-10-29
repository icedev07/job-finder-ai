'use client';

import { CalendarClockIcon, ExternalLinkIcon, MoreHorizontalIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ScoreChip } from '@/components/jobs/chips';
import { JobDetailSheet } from '@/components/jobs/job-detail-sheet';
import { patchJobs, stageLabel } from '@/components/jobs/job-commands';
import { useStatus } from '@/components/shell/status-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { api, errorMessage } from '@/lib/clientApi';
import { formatDate, JOB_STAGES, safeHref, STAGE_META, timeAgo, type JobStage } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';

type Card = {
  id: number;
  title: string;
  company: string;
  aiScore: number | null;
  stage: JobStage;
  appliedAt: string | null;
  followUpAt: string | null;
  url: string;
  manualApplyUrl: string | null;
  createdAt: string;
};

const BOARD_STAGES: JobStage[] = ['SAVED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'];
const DAY = 24 * 60 * 60_000;

function followUpTone(at: string | null): 'overdue' | 'due' | 'later' | null {
  if (!at) return null;
  const t = new Date(at).getTime() - Date.now();
  if (t < 0) return 'overdue';
  if (t < DAY) return 'due';
  return 'later';
}

function inDays(days: number): string {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export function PipelineBoard() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { refresh } = useStatus();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [focused, setFocused] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<JobStage | null>(null);
  const [truncated, setTruncated] = useState(false);
  const openId = params.get('job') ? Number(params.get('job')) : null;

  const stages = useMemo(() => (showArchived ? [...BOARD_STAGES, 'ARCHIVED' as JobStage] : BOARD_STAGES), [showArchived]);

  const load = useCallback(async () => {
    try {
      const r = await api<{ jobs: Card[]; total: number }>(
        `/api/admin/jobs?stage=${stages.join(',')}&limit=100&sort=date_desc`,
      );
      setCards(r.jobs);
      setTruncated(r.total > r.jobs.length);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [stages]);
  useLoadOnMount(load);

  const move = useCallback(
    async (card: Card, to: JobStage) => {
      if (card.stage === to) return;
      const from = card.stage;
      setCards((list) => list?.map((c) => (c.id === card.id ? { ...c, stage: to } : c)) ?? list);
      await patchJobs([card.id], { stage: to }, {
        success: `Moved to ${stageLabel(to)}`,
        undo: () => api('/api/admin/jobs', { method: 'PATCH', json: { ids: [card.id], set: { stage: from } } }),
        onDone: () => {
          void load();
          refresh();
        },
      });
    },
    [load, refresh],
  );

  // Keyboard: 1–6 move the focused card to that stage, ←/→ to the neighbouring stage.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      if (focused == null || openId != null || !cards) return;
      const card = cards.find((c) => c.id === focused);
      if (!card) return;
      const n = Number(e.key);
      if (n >= 1 && n <= JOB_STAGES.length) {
        void move(card, JOB_STAGES[n - 1]);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const i = BOARD_STAGES.indexOf(card.stage);
        const j = i + (e.key === 'ArrowRight' ? 1 : -1);
        if (i >= 0 && j >= 0 && j < BOARD_STAGES.length) void move(card, BOARD_STAGES[j]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused, cards, move, openId]);

  const openJob = (id: number | null) => {
    const next = new URLSearchParams(params.toString());
    if (id == null) next.delete('job');
    else next.set('job', String(id));
    router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
  };

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!cards) {
    return (
      <div className="grid h-40 place-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <label className="flex items-center gap-2">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          Show archived
        </label>
        <span className="hidden md:inline">
          Drag cards between columns, or focus one and press <Kbd>1</Kbd>–<Kbd>6</Kbd> or <Kbd>←</Kbd>/<Kbd>→</Kbd>.
        </span>
        {truncated ? <span className="text-amber-700 dark:text-amber-400">Showing the newest 100 jobs.</span> : null}
      </div>
      <div className="grid gap-3 overflow-x-auto pb-2 md:grid-flow-col md:auto-cols-[minmax(12.5rem,1fr)]">
        {stages.map((stage) => {
          const list = cards.filter((c) => c.stage === stage);
          return (
            <section
              key={stage}
              aria-label={STAGE_META[stage].label}
              className={cn(
                'flex min-h-40 flex-col gap-2 rounded-xl border bg-muted/30 p-2 transition-colors',
                overStage === stage && 'border-primary bg-primary/5',
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setOverStage(null);
                const card = cards.find((c) => c.id === dragging);
                if (card) void move(card, stage);
                setDragging(null);
              }}
            >
              <h2 className="flex items-center gap-2 px-1 text-sm font-medium">
                <span className={cn('size-2 rounded-full', STAGE_META[stage].dot)} aria-hidden />
                {STAGE_META[stage].label}
                <span className="tabular ml-auto text-xs text-muted-foreground">{list.length}</span>
              </h2>
              {list.map((c) => {
                const tone = c.stage === 'APPLIED' || c.stage === 'INTERVIEW' ? followUpTone(c.followUpAt) : null;
                const href = safeHref(c.manualApplyUrl) ?? safeHref(c.url);
                return (
                  <article
                    key={c.id}
                    tabIndex={0}
                    draggable
                    onDragStart={() => setDragging(c.id)}
                    onDragEnd={() => setDragging(null)}
                    onFocus={() => setFocused(c.id)}
                    onClick={() => openJob(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') openJob(c.id);
                    }}
                    className={cn(
                      'cursor-pointer space-y-1.5 rounded-lg border bg-card p-2.5 text-sm shadow-xs outline-none hover:border-ring/50 focus-visible:ring-3 focus-visible:ring-ring/50',
                      dragging === c.id && 'opacity-50',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <ScoreChip score={c.aiScore} />
                      <p className="min-w-0 flex-1 leading-snug font-medium">{c.title}</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-xs" aria-label="Card actions" onClick={(e) => e.stopPropagation()} />
                          }
                        >
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Follow up</DropdownMenuLabel>
                            {[
                              ['Tomorrow', 1],
                              ['In 3 days', 3],
                              ['In a week', 7],
                              ['In 2 weeks', 14],
                            ].map(([label, days]) => (
                              <DropdownMenuItem
                                key={String(label)}
                                onClick={() =>
                                  void patchJobs([c.id], { followUpAt: inDays(Number(days)) }, { success: `Follow-up ${String(label).toLowerCase()}`, onDone: () => void load() })
                                }
                              >
                                {label}
                              </DropdownMenuItem>
                            ))}
                            {c.followUpAt ? (
                              <DropdownMenuItem onClick={() => void patchJobs([c.id], { followUpAt: null }, { success: 'Follow-up cleared', onDone: () => void load() })}>
                                Clear follow-up
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Move to</DropdownMenuLabel>
                            {JOB_STAGES.filter((s) => s !== c.stage).map((s) => (
                              <DropdownMenuItem key={s} onClick={() => void move(c, s)}>
                                <span className={cn('size-2 rounded-full', STAGE_META[s].dot)} aria-hidden />
                                {STAGE_META[s].label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{c.company}</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {c.appliedAt ? <span>applied {timeAgo(c.appliedAt)}</span> : <span>added {timeAgo(c.createdAt)}</span>}
                      {tone ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            'gap-1',
                            tone === 'overdue' && 'border-red-500/40 text-red-700 dark:text-red-400',
                            tone === 'due' && 'border-amber-500/40 text-amber-700 dark:text-amber-400',
                          )}
                          title={`Follow up ${formatDate(c.followUpAt)}`}
                        >
                          <CalendarClockIcon />
                          {tone === 'overdue' ? 'follow-up overdue' : tone === 'due' ? 'follow up today' : formatDate(c.followUpAt)}
                        </Badge>
                      ) : null}
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="ml-auto inline-flex items-center gap-0.5 hover:text-foreground"
                          aria-label="Open the job page"
                        >
                          <ExternalLinkIcon className="size-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
              {list.length === 0 ? <p className="px-1 py-4 text-center text-xs text-muted-foreground">Drop a job here</p> : null}
            </section>
          );
        })}
      </div>
      <JobDetailSheet
        jobId={openId}
        onOpenChange={(o) => !o && openJob(null)}
        onChanged={() => {
          void load();
          refresh();
        }}
      />
    </div>
  );
}
