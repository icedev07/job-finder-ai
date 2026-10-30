'use client';

import { CalendarClockIcon, ExternalLinkIcon, MoreHorizontalIcon, UsersRoundIcon } from 'lucide-react';

import { ScoreChip } from '@/components/jobs/chips';
import { UserChip } from '@/components/shell/viewing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CLOSE_REASON_LABEL, formatDate, formatWhen, safeHref, STAGE_META, timeAgo, type JobStage } from '@/lib/format';
import { cn } from '@/lib/utils';

import { CLOSE_CHOICES } from './close-dialog';
import type { BoardCard, Destination } from './types';

const DAY = 24 * 60 * 60_000;

export const BOARD_STAGES: JobStage[] = ['SAVED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'ARCHIVED'];

export const FOLLOW_UPS: [label: string, days: number][] = [
  ['Tomorrow', 1],
  ['In 3 days', 3],
  ['In a week', 7],
  ['In 2 weeks', 14],
];

/** 9:00 local time, `days` from today. */
export function inDays(days: number): string {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

function followUpTone(at: string | null): 'overdue' | 'due' | 'later' | null {
  if (!at) return null;
  const t = new Date(at).getTime() - Date.now();
  if (t < 0) return 'overdue';
  if (t < DAY) return 'due';
  return 'later';
}

/** A follow-up date on a card (on a saved job, the reminder to apply). */
function followUpText(tone: 'overdue' | 'due' | 'later', reminder: boolean, at: string | null): string {
  if (tone === 'overdue') return reminder ? 'reminder due' : 'follow-up overdue';
  if (tone === 'due') return reminder ? 'reminder today' : 'follow up today';
  return formatDate(at);
}

export function BoardCardView({
  card,
  selected,
  dragging,
  onSelect,
  onOpen,
  onFocus,
  onMove,
  onFollowUp,
  onDragStart,
  onDragEnd,
}: {
  card: BoardCard;
  selected: boolean;
  dragging: boolean;
  onSelect: (on: boolean) => void;
  onOpen: () => void;
  onFocus: () => void;
  /** Archived without a reason asks for one. */
  onMove: (to: Destination) => void;
  /** Days from today; null clears it. */
  onFollowUp: (days: number | null) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const c = card;
  // A saved job's date is a reminder to apply.
  const reminder = c.stage === 'SAVED';
  const tone = c.stage === 'APPLIED' || c.stage === 'INTERVIEW' || reminder ? followUpTone(c.followUpAt) : null;
  const interview = c.nextInterviewAt && c.stage !== 'REJECTED' && c.stage !== 'ARCHIVED' ? c.nextInterviewAt : null;
  const href = safeHref(c.manualApplyUrl) ?? safeHref(c.url);
  const closed = c.stage === 'ARCHIVED' && c.closeReason ? CLOSE_REASON_LABEL[c.closeReason] : null;
  return (
    <article
      tabIndex={0}
      draggable
      data-job-id={c.id}
      aria-label={`${c.title} at ${c.company}`}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onFocus={onFocus}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) onOpen();
      }}
      className={cn(
        'cursor-pointer space-y-1.5 rounded-lg border bg-card p-2.5 text-sm shadow-xs outline-none hover:border-ring/50 focus-visible:ring-3 focus-visible:ring-ring/50',
        selected && 'border-primary/60 bg-primary/5',
        dragging && 'opacity-50',
      )}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelect(!!v)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${c.title}`}
          className="mt-0.5"
        />
        <ScoreChip score={c.aiScore} />
        <p className="min-w-0 flex-1 leading-snug font-medium">{c.title}</p>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-xs" aria-label={`Actions for ${c.title}`} onClick={(e) => e.stopPropagation()} />}
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-40">
                {BOARD_STAGES.filter((s) => s !== c.stage).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => onMove({ stage: s })}>
                    <span className={cn('size-2 rounded-full', STAGE_META[s].dot)} aria-hidden />
                    {STAGE_META[s].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Close as</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-52">
                {CLOSE_CHOICES.map((choice) => (
                  <DropdownMenuItem key={choice.reason} onClick={() => onMove(choice.to)}>
                    {CLOSE_REASON_LABEL[choice.reason]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Follow up</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-40">
                {FOLLOW_UPS.map(([label, days]) => (
                  <DropdownMenuItem key={label} onClick={() => onFollowUp(days)}>
                    {label}
                  </DropdownMenuItem>
                ))}
                {c.followUpAt ? <DropdownMenuItem onClick={() => onFollowUp(null)}>Clear follow-up</DropdownMenuItem> : null}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
        <span className="truncate">{c.company}</span>
        <UserChip userId={c.userId} className="ml-auto shrink-0" />
      </p>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {c.appliedAt ? <span>applied {timeAgo(c.appliedAt)}</span> : <span>added {timeAgo(c.stageUpdatedAt ?? c.createdAt)}</span>}
        {closed ? <Badge variant="outline">{closed}</Badge> : null}
        {interview ? (
          <Badge variant="outline" className="gap-1 border-amber-500/40" title={`Next interview: ${formatWhen(interview)}`}>
            <UsersRoundIcon />
            {formatWhen(interview)}
          </Badge>
        ) : null}
        {tone ? (
          <Badge
            variant="outline"
            className={cn(
              'gap-1',
              tone === 'overdue' && 'border-red-500/40 text-red-700 dark:text-red-400',
              tone === 'due' && 'border-amber-500/40 text-amber-700 dark:text-amber-400',
            )}
            title={`${reminder ? 'Reminder to apply' : 'Follow up'} ${formatDate(c.followUpAt)}`}
          >
            <CalendarClockIcon />
            {followUpText(tone, reminder, c.followUpAt)}
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
}
