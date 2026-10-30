'use client';

import {
  CalendarClockIcon,
  CheckIcon,
  ChevronDownIcon,
  MessageSquareReplyIcon,
  MoreHorizontalIcon,
  NotebookPenIcon,
  SendIcon,
  UsersRoundIcon,
  XIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { markFollowedUp, once, plural, restoreJobs, UNDO_TOAST_MS, type Before } from '@/components/applications/application-commands';
import { FOLLOW_UPS, inDays } from '@/components/applications/board-card';
import { CLOSE_CHOICES } from '@/components/applications/close-dialog';
import { InterviewLink } from '@/components/applications/interviews';
import type { BoardCard, Destination } from '@/components/applications/types';
import type { WritingRequest } from '@/components/applications/writing';
import { ScoreChip } from '@/components/jobs/chips';
import { JobDetailSheet } from '@/components/jobs/job-detail-sheet';
import { useStatus } from '@/components/shell/status-provider';
import { UserChip, useViewing } from '@/components/shell/viewing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Kbd } from '@/components/ui/kbd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';
import { api, errorMessage } from '@/lib/clientApi';
import {
  CLOSE_REASON_LABEL,
  formatDate,
  formatNumber,
  formatWhen,
  INTERVIEW_KIND_LABEL,
  interviewName,
  isInterviewKind,
  timeAgo,
  type DraftKind,
} from '@/lib/format';
import { cn } from '@/lib/utils';

// Next actions (lib/nextActions.ts): interviews in the next two days, follow-ups
// that are due, applications with no answer for weeks and saved jobs not applied
// to yet, for the user being viewed (or every user with Applications on). Each
// row has its main action, Snooze and a menu (with a draft of what to send);
// several rows at once from the selection bar. Every change can be undone from
// its message (or u).

type Kind = 'interview' | 'follow_up' | 'no_answer' | 'apply';
type ActionJob = Omit<BoardCard, 'nextInterviewAt'>;
type ActionItem = {
  kind: Kind;
  dueAt: string;
  job: ActionJob;
  interview: { id: number; at: string; kind: string; link: string | null } | null;
  lastInterview: { at: string; kind: string } | null;
};
type ActionUser = { id: number; on: boolean; count: number };
type NextActionsData = { items: ActionItem[]; total: number; users: ActionUser[] };

const ALL = 'all';
const DAY = 24 * 60 * 60_000;

const SECTIONS: { kind: Kind; title: string; hint: string; count: (n: number) => string }[] = [
  {
    kind: 'interview',
    title: 'Interviews coming up',
    hint: 'In the next two days. Open one for its notes and timeline.',
    count: (n) => plural(n, 'interview'),
  },
  {
    kind: 'follow_up',
    title: 'Follow up',
    hint: 'Their follow-up date has come: write to the company, then mark it followed up.',
    count: (n) => plural(n, 'follow-up'),
  },
  {
    kind: 'no_answer',
    title: 'No answer',
    hint: 'No answer for weeks after applying: close them as no response, or follow up once more.',
    count: (n) => `${formatNumber(n)} without an answer`,
  },
  {
    kind: 'apply',
    title: 'Apply or archive',
    hint: 'Saved a while ago and not applied to yet.',
    count: (n) => `${formatNumber(n)} to apply to`,
  },
];

/** Why the row is here, in one line. */
function whyText(item: ActionItem, now: number): string {
  const j = item.job;
  switch (item.kind) {
    case 'interview': {
      const i = item.interview!;
      return `${interviewName(i.kind)} · ${formatWhen(i.at)} (${timeAgo(i.at, now)})`;
    }
    case 'follow_up': {
      const due = j.followUpAt ? `Follow-up due ${timeAgo(j.followUpAt, now)}` : 'Follow-up due';
      const last = item.lastInterview;
      const since = last
        ? `${isInterviewKind(last.kind) && last.kind !== 'OTHER' ? `${INTERVIEW_KIND_LABEL[last.kind]} interview` : 'interviewed'} ${timeAgo(last.at, now)}`
        : j.appliedAt
          ? `applied ${timeAgo(j.appliedAt, now)}`
          : null;
      return since ? `${due} · ${since}` : due;
    }
    case 'no_answer': {
      const applied = j.appliedAt ?? j.stageUpdatedAt;
      const days = applied ? Math.floor((now - new Date(applied).getTime()) / DAY) : null;
      return days != null ? `No answer ${plural(days, 'day')} after applying` : 'No answer since applying';
    }
    case 'apply':
      return j.followUpAt
        ? `Reminder to apply, set for ${formatDate(j.followUpAt)}`
        : `Saved ${timeAgo(j.stageUpdatedAt ?? j.createdAt, now)}, not applied yet`;
  }
}

function beforeOf(items: ActionItem[]): Before[] {
  return items.map((i) => ({ id: i.job.id, stage: i.job.stage, closeReason: i.job.closeReason, followUpAt: i.job.followUpAt }));
}

const canFollowUp = (i: ActionItem) => i.job.stage === 'APPLIED' || i.job.stage === 'INTERVIEW';
const isSaved = (i: ActionItem) => i.job.stage === 'SAVED';

export function NextActionsView() {
  const { viewing, multiUser, userName } = useViewing();
  const { refresh } = useStatus();
  const [data, setData] = useState<NextActionsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [only, setOnly] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [active, setActive] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);
  // Opened from Draft a follow-up / cover letter or Prepare: the panel's Writing writes it.
  const [writing, setWriting] = useState<WritingRequest | null>(null);
  // The last change's undo, for u and the toast.
  const lastUndo = useRef<(() => Promise<void>) | null>(null);
  // Times are relative to when the list loaded.
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      setData(await api<NextActionsData>(`/api/admin/next-actions${only == null ? '' : `?only=${only}`}`));
      setNow(Date.now());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [only]);
  useLoadOnMount(load);

  const changed = useCallback(() => {
    void load();
    refresh();
  }, [load, refresh]);

  const items = useMemo(() => data?.items ?? [], [data]);
  // Rows in the order shown (by section), for j / k.
  const ordered = useMemo(() => SECTIONS.flatMap((s) => items.filter((i) => i.kind === s.kind)), [items]);
  const chosen = ordered.filter((i) => i.kind !== 'interview' && selected.has(i.job.id));
  const current = Math.min(active, Math.max(0, ordered.length - 1));

  const toggle = (id: number, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  /** Runs a change, then offers its undo. */
  const run = useCallback(
    async (list: ActionItem[], change: () => Promise<string>, undo: () => Promise<void>) => {
      if (!list.length) return;
      setBusy(true);
      try {
        const message = await change();
        lastUndo.current = undo;
        toast.success(message, { action: { label: 'Undo', onClick: () => void undo() }, duration: UNDO_TOAST_MS });
        setSelected((s) => new Set([...s].filter((id) => !list.some((i) => i.job.id === id))));
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setBusy(false);
      }
      changed();
    },
    [changed],
  );

  const restoring = useCallback(
    (list: ActionItem[]) => {
      const before = beforeOf(list);
      return once(async () => {
        await restoreJobs(before);
        changed();
      });
    },
    [changed],
  );

  const patch = (list: ActionItem[], set: Record<string, unknown>) =>
    api('/api/admin/jobs', { method: 'PATCH', json: { ids: list.map((i) => i.job.id), set } });

  const followedUp = useCallback(
    async (list: ActionItem[]) => {
      const ids = list.filter(canFollowUp).map((i) => i.job.id);
      if (!ids.length) return;
      setBusy(true);
      const undo = await markFollowedUp(ids, changed);
      setBusy(false);
      if (undo) {
        lastUndo.current = undo;
        setSelected((s) => new Set([...s].filter((id) => !ids.includes(id))));
      }
    },
    [changed],
  );

  const snooze = (list: ActionItem[], days: number) =>
    void run(
      list,
      async () => {
        const at = inDays(days);
        await patch(list, { followUpAt: at });
        return `Snoozed ${list.length === 1 ? '' : `${formatNumber(list.length)} `}until ${formatDate(at)}`;
      },
      restoring(list),
    );

  const close = (list: ActionItem[], to: Destination) =>
    void run(
      list,
      async () => {
        await patch(list, { stage: to.stage, ...(to.stage === 'ARCHIVED' ? { closeReason: to.closeReason ?? null } : {}) });
        const what = list.length === 1 ? 'Closed' : `Closed ${formatNumber(list.length)}`;
        if (to.stage === 'REJECTED') return `${what}: rejected by the company`;
        return to.closeReason ? `${what}: ${CLOSE_REASON_LABEL[to.closeReason].toLowerCase()}` : `${what} (archived)`;
      },
      restoring(list),
    );

  const applied = (list: ActionItem[]) => {
    const saved = list.filter(isSaved);
    void run(
      saved,
      async () => {
        await patch(saved, { stage: 'APPLIED' });
        return saved.length === 1 ? 'Moved to Applied' : `Moved ${formatNumber(saved.length)} to Applied`;
      },
      restoring(saved),
    );
  };

  // Keys: j / k move, x selects, Enter opens, u undoes, Esc clears.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey || openId != null) return;
      if (e.key === 'Enter' && el?.closest('button, a, [role=checkbox], [role=option], [role=menuitem]')) return;
      const row = ordered[current];
      if (e.key === 'j') setActive(Math.min(ordered.length - 1, current + 1));
      else if (e.key === 'k') setActive(Math.max(0, current - 1));
      else if (e.key === 'x' && row && row.kind !== 'interview') toggle(row.job.id, !selected.has(row.job.id));
      else if (e.key === 'Enter' && row) {
        setWriting(null);
        setOpenId(row.job.id);
      }
      else if (e.key === 'u' && lastUndo.current) void lastUndo.current();
      else if (e.key === 'Escape') setSelected(new Set());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ordered, current, selected, openId]);

  if (!data) {
    return error ? (
      <p className="text-sm text-destructive">{error}</p>
    ) : (
      <div className="grid h-40 place-items-center">
        <Spinner />
      </div>
    );
  }

  const on = data.users.filter((u) => u.on);
  if (on.length === 0) {
    const title = !multiUser
      ? 'Applications is off'
      : data.users.length === 1
        ? `Applications is off for ${userName(data.users[0].id)}`
        : 'Applications is off for every user';
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Next actions come from the Applications board: follow-ups, interviews and reminders. Turn it on in Settings →
            Applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" nativeButton={false} render={<Link href="/admin/settings#applications" />}>
            Open Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  const showFilter = multiUser && viewing === 'all' && on.length > 1;
  const summary = SECTIONS.map((s) => [s, items.filter((i) => i.kind === s.kind).length] as const)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => s.count(n))
    .join(' · ');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {showFilter ? (
          <Select
            items={[
              { value: ALL, label: `All users · ${formatNumber(on.reduce((n, u) => n + u.count, 0))}` },
              ...on.map((u) => ({ value: String(u.id), label: `${userName(u.id)} · ${formatNumber(u.count)}` })),
            ]}
            value={only == null ? ALL : String(only)}
            onValueChange={(v) => {
              setOnly(v === ALL || v == null ? null : Number(v));
              setSelected(new Set());
            }}
          >
            <SelectTrigger size="sm" aria-label="Whose next actions">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All users · {formatNumber(on.reduce((n, u) => n + u.count, 0))}</SelectItem>
              {on.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {userName(u.id)} · {formatNumber(u.count)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <p className="text-sm text-muted-foreground">
          <span className="tabular">{items.length ? `${plural(data.total, 'next action')}: ${summary}` : 'Nothing to do right now'}</span>
          {items.length ? (
            <span className="ml-3 hidden md:inline">
              <Kbd>j</Kbd>/<Kbd>k</Kbd> move · <Kbd>x</Kbd> select · <Kbd>Enter</Kbd> open · <Kbd>u</Kbd> undo
            </span>
          ) : null}
        </p>
      </div>
      {data.total > items.length ? (
        <p className="text-xs text-muted-foreground">
          Showing the first {formatNumber(items.length)}. Snooze or close some to see the rest.
        </p>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All caught up</CardTitle>
            <CardDescription>
              Follow-ups, interviews in the next two days, applications with no answer and saved jobs waiting to be applied to
              show up here when they are due.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" nativeButton={false} render={<Link href="/admin/applications" />}>
              Open the Applications board
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {SECTIONS.map((section) => {
        const rows = ordered.filter((i) => i.kind === section.kind);
        if (!rows.length) return null;
        const selectable = section.kind !== 'interview';
        const picked = rows.filter((i) => selected.has(i.job.id)).length;
        return (
          <section key={section.kind} aria-labelledby={`section-${section.kind}`} className="space-y-2">
            <div className="flex items-start gap-2">
              {selectable ? (
                <Checkbox
                  className="mt-1"
                  checked={picked > 0 && picked === rows.length}
                  indeterminate={picked > 0 && picked < rows.length}
                  onCheckedChange={(v) =>
                    setSelected((s) => {
                      const next = new Set(s);
                      for (const i of rows) {
                        if (v) next.add(i.job.id);
                        else next.delete(i.job.id);
                      }
                      return next;
                    })
                  }
                  aria-label={`Select every row in ${section.title}`}
                />
              ) : null}
              <div>
                <h2 id={`section-${section.kind}`} className="text-sm font-semibold">
                  {section.title} <span className="tabular font-normal text-muted-foreground">· {formatNumber(rows.length)}</span>
                </h2>
                <p className="text-xs text-muted-foreground">{section.hint}</p>
              </div>
            </div>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {rows.map((item) => {
                const index = ordered.indexOf(item);
                return (
                  <ActionRow
                    key={`${item.kind}-${item.interview?.id ?? item.job.id}`}
                    item={item}
                    now={now}
                    active={index === current}
                    selected={selected.has(item.job.id)}
                    busy={busy}
                    onSelect={(v) => toggle(item.job.id, v)}
                    onOpen={() => {
                      setActive(index);
                      setWriting(null);
                      setOpenId(item.job.id);
                    }}
                    onDraft={(kind) => {
                      setActive(index);
                      setWriting({ kind, write: true });
                      setOpenId(item.job.id);
                    }}
                    onFollowedUp={() => void followedUp([item])}
                    onApplied={() => applied([item])}
                    onSnooze={(days) => snooze([item], days)}
                    onClose={(to) => close([item], to)}
                  />
                );
              })}
            </ul>
          </section>
        );
      })}

      {chosen.length ? (
        <SelectionBar
          items={chosen}
          busy={busy}
          onClear={() => setSelected(new Set())}
          onFollowedUp={() => void followedUp(chosen)}
          onApplied={() => applied(chosen)}
          onSnooze={(days) => snooze(chosen, days)}
          onClose={(to) => close(chosen, to)}
        />
      ) : null}

      <JobDetailSheet jobId={openId} onOpenChange={(o) => !o && setOpenId(null)} onChanged={changed} writing={writing} />
    </div>
  );
}

/** The close reasons that fit: a saved job was never sent, so the company can't have rejected it. */
function closeChoices(item: ActionItem) {
  return isSaved(item) ? CLOSE_CHOICES.filter((c) => c.reason !== 'REJECTED' && c.reason !== 'NO_RESPONSE') : CLOSE_CHOICES;
}

function ActionRow({
  item,
  now,
  active,
  selected,
  busy,
  onSelect,
  onOpen,
  onDraft,
  onFollowedUp,
  onApplied,
  onSnooze,
  onClose,
}: {
  item: ActionItem;
  now: number;
  active: boolean;
  selected: boolean;
  busy: boolean;
  onSelect: (on: boolean) => void;
  onOpen: () => void;
  /** Open the job on Writing and draft this. */
  onDraft: (kind: DraftKind) => void;
  onFollowedUp: () => void;
  onApplied: () => void;
  onSnooze: (days: number) => void;
  onClose: (to: Destination) => void;
}) {
  const j = item.job;
  const interview = item.kind === 'interview';
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  return (
    <li
      data-job-id={j.id}
      className={cn(
        'flex cursor-pointer flex-col gap-2 p-3 hover:bg-muted/40 sm:flex-row sm:items-center',
        selected && 'bg-primary/5',
        active && 'ring-1 ring-ring/40 ring-inset',
      )}
      onClick={onOpen}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        {interview ? (
          <UsersRoundIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        ) : (
          <Checkbox
            className="mt-0.5"
            checked={selected}
            onCheckedChange={(v) => onSelect(!!v)}
            onClick={stop}
            aria-label={`Select ${j.title}`}
          />
        )}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <ScoreChip score={j.aiScore} />
            <span className="font-medium leading-snug">{j.title}</span>
            <span className="text-sm text-muted-foreground">{j.company}</span>
            <UserChip userId={j.userId} />
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span>{whyText(item, now)}</span>
            {item.interview?.link ? <InterviewLink link={item.interview.link} className="max-w-64" /> : null}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 pl-6 sm:pl-0" onClick={stop}>
        {item.kind === 'follow_up' ? (
          <Button size="sm" variant="outline" onClick={onFollowedUp} disabled={busy}>
            <MessageSquareReplyIcon />
            Followed up
          </Button>
        ) : null}
        {item.kind === 'no_answer' ? (
          <Button size="sm" variant="outline" onClick={() => onClose({ stage: 'ARCHIVED', closeReason: 'NO_RESPONSE' })} disabled={busy}>
            <XIcon />
            Close: no response
          </Button>
        ) : null}
        {item.kind === 'apply' ? (
          <Button size="sm" variant="outline" onClick={onApplied} disabled={busy}>
            <SendIcon />
            Applied
          </Button>
        ) : null}
        {interview ? (
          <>
            <Button size="sm" variant="outline" onClick={() => onDraft('interview_prep')} aria-label={`Prepare for the interview for ${j.title}`}>
              <NotebookPenIcon />
              Prepare
            </Button>
            <Button size="sm" variant="outline" onClick={onOpen}>
              Open
            </Button>
          </>
        ) : (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" variant="ghost" disabled={busy} aria-label={`Snooze ${j.title}`} />}>
                <CalendarClockIcon />
                Snooze
                <ChevronDownIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {FOLLOW_UPS.map(([label, days]) => (
                  <DropdownMenuItem key={label} onClick={() => onSnooze(days)}>
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" disabled={busy} aria-label={`More for ${j.title}`} />}>
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={onOpen}>Open the job</DropdownMenuItem>
                {item.kind === 'apply' ? (
                  <DropdownMenuItem onClick={() => onDraft('cover_letter')}>Draft a cover letter</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onDraft('follow_up')}>Draft a follow-up</DropdownMenuItem>
                )}
                {item.kind === 'no_answer' ? <DropdownMenuItem onClick={onFollowedUp}>Followed up</DropdownMenuItem> : null}
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Close as</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-52">
                    {closeChoices(item).map((c) => (
                      <DropdownMenuItem key={c.reason} onClick={() => onClose(c.to)}>
                        {CLOSE_REASON_LABEL[c.reason]}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onClose({ stage: 'ARCHIVED', closeReason: null })}>Archive without a reason</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </li>
  );
}

/** The bar for the selected rows: followed up, applied, snooze or close all of them. */
function SelectionBar({
  items,
  busy,
  onClear,
  onFollowedUp,
  onApplied,
  onSnooze,
  onClose,
}: {
  items: ActionItem[];
  busy: boolean;
  onClear: () => void;
  onFollowedUp: () => void;
  onApplied: () => void;
  onSnooze: (days: number) => void;
  onClose: (to: Destination) => void;
}) {
  const n = items.length;
  const followUps = items.filter(canFollowUp).length;
  const saved = items.filter(isSaved).length;
  return (
    <div
      role="toolbar"
      aria-label={`${n} selected next actions`}
      className="sticky bottom-3 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border bg-popover/95 p-1.5 text-sm shadow-lg backdrop-blur supports-backdrop-filter:bg-popover/80"
    >
      <span className="tabular px-2 font-medium" aria-live="polite">
        {n} selected
      </span>
      <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Clear selection">
        <XIcon />
      </Button>
      <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
      {followUps ? (
        <Button variant="ghost" size="sm" onClick={onFollowedUp} disabled={busy}>
          <CheckIcon />
          Followed up{followUps < n ? ` (${followUps})` : ''}
        </Button>
      ) : null}
      {saved ? (
        <Button variant="ghost" size="sm" onClick={onApplied} disabled={busy}>
          <SendIcon />
          Applied{saved < n ? ` (${saved})` : ''}
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" disabled={busy} />}>
          Snooze
          <ChevronDownIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {FOLLOW_UPS.map(([label, days]) => (
            <DropdownMenuItem key={label} onClick={() => onSnooze(days)}>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" disabled={busy} />}>
          Close as
          <ChevronDownIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          {CLOSE_CHOICES.map((c) => (
            <DropdownMenuItem key={c.reason} onClick={() => onClose(c.to)}>
              {CLOSE_REASON_LABEL[c.reason]}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onClose({ stage: 'ARCHIVED', closeReason: null })}>Archive without a reason</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
