'use client';

import { ChevronDownIcon, SearchIcon, XIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { BOARD_STAGES, BoardCardView, FOLLOW_UPS, inDays } from '@/components/applications/board-card';
import { CLOSE_CHOICES, CloseDialog } from '@/components/applications/close-dialog';
import { plural, restoreJobs, UNDO_TOAST_MS, type Before } from '@/components/applications/application-commands';
import type { Board, BoardCard, BoardColumn, BoardUser, Destination } from '@/components/applications/types';
import { JobDetailSheet } from '@/components/jobs/job-detail-sheet';
import { useStatus } from '@/components/shell/status-provider';
import { useViewing } from '@/components/shell/viewing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Kbd } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';
import { api, errorMessage } from '@/lib/clientApi';
import { CLOSE_REASON_LABEL, formatNumber, platformLabel, STAGE_META, type JobStage } from '@/lib/format';
import { cn } from '@/lib/utils';

// The Applications board of the user being viewed, or of every user with
// Applications on (a strip on top shows each one's numbers and filters the
// board to them). Search and filters narrow every column; each column loads
// 100 cards at a time. Cards move by drag and drop, their menu, the keys or
// several at once from the selection bar; a move to Archived asks why it
// closed. Every move can be undone from its message.

const ALL = 'all';
const ANY = 'any';
const SCORES = [
  { value: ANY, label: 'Any score' },
  { value: '40', label: 'Score 40+' },
  { value: '60', label: 'Score 60+' },
  { value: '80', label: 'Score 80+' },
];
// The columns ← / → step through (Archived only by 6, the menu or a drop).
const ARROW_STAGES: JobStage[] = ['SAVED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'];

function destinationText(to: Destination, n: number): string {
  const what = n === 1 ? '' : ` ${formatNumber(n)}`;
  if (to.stage === 'REJECTED') return `Closed${what}: rejected by the company`;
  if (to.stage === 'ARCHIVED') return to.closeReason ? `Closed${what}: ${CLOSE_REASON_LABEL[to.closeReason].toLowerCase()}` : `Archived${what}`;
  return `Moved${what} to ${STAGE_META[to.stage].label}`;
}

/** The board after cards moved: out of their columns, at the top of the new one (when it is shown). */
function moveLocally(board: Board, cards: BoardCard[], to: Destination): Board {
  const ids = new Set(cards.map((c) => c.id));
  const now = new Date().toISOString();
  const moved = cards.map((c) => ({
    ...c,
    stage: to.stage,
    closeReason: to.stage === 'REJECTED' ? ('REJECTED' as const) : to.stage === 'ARCHIVED' ? (to.closeReason ?? null) : null,
    stageUpdatedAt: now,
  }));
  return {
    ...board,
    columns: board.columns.map((col) => {
      const kept = col.cards.filter((c) => !ids.has(c.id));
      const left = col.cards.length - kept.length;
      if (col.stage === to.stage) return { ...col, cards: [...moved, ...kept], total: col.total - left + moved.length };
      return { ...col, cards: kept, total: col.total - left };
    }),
  };
}

export function ApplicationsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { viewing, multiUser, userName } = useViewing();
  const { refresh } = useStatus();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [only, setOnly] = useState<number | null>(null);
  const [source, setSource] = useState(ALL);
  const [minScore, setMinScore] = useState(ANY);
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [focused, setFocused] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<JobStage | null>(null);
  // Cards waiting for "why did it close?".
  const [closing, setClosing] = useState<BoardCard[]>([]);
  const [loadingMore, setLoadingMore] = useState<JobStage | null>(null);
  // A card moved with the keys gets the focus back in its new column.
  const refocus = useRef<number | null>(null);
  const openId = params.get('job') ? Number(params.get('job')) : null;

  // Search as you type, once the typing pauses.
  useEffect(() => {
    const id = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (only != null) qs.set('only', String(only));
    if (source !== ALL) qs.set('platform', source);
    if (minScore !== ANY) qs.set('minScore', minScore);
    if (showArchived) qs.set('archived', '1');
    return qs;
  }, [q, only, source, minScore, showArchived]);

  const load = useCallback(async () => {
    try {
      setBoard(await api<Board>(`/api/admin/applications?${query.toString()}`));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [query]);
  useLoadOnMount(load);

  useEffect(() => {
    if (refocus.current == null) return;
    const el = document.querySelector<HTMLElement>(`[data-job-id="${refocus.current}"]`);
    if (el) {
      el.focus();
      refocus.current = null;
    }
  }, [board]);

  const cards = useMemo(() => board?.columns.flatMap((c) => c.cards) ?? [], [board]);
  const chosen = useMemo(() => cards.filter((c) => selected.has(c.id)), [cards, selected]);

  const changed = useCallback(() => {
    void load();
    refresh();
  }, [load, refresh]);

  const restore = useCallback(
    async (before: Before[]) => {
      await restoreJobs(before);
      changed();
    },
    [changed],
  );
  // A toast's Undo is clicked later: it must call the current restore.
  const restoreRef = useRef(restore);
  useEffect(() => {
    restoreRef.current = restore;
  }, [restore]);

  const move = useCallback(
    async (list: BoardCard[], to: Destination) => {
      const moving = list.filter(
        (c) => c.stage !== to.stage || (to.stage === 'ARCHIVED' && to.closeReason !== undefined && c.closeReason !== to.closeReason),
      );
      if (!moving.length || !board) return;
      // Archived asks why first.
      if (to.stage === 'ARCHIVED' && to.closeReason === undefined) {
        setClosing(moving);
        return;
      }
      const before: Before[] = moving.map((c) => ({ id: c.id, stage: c.stage, closeReason: c.closeReason, followUpAt: c.followUpAt }));
      setBoard((b) => (b ? moveLocally(b, moving, to) : b));
      setSelected((s) => new Set([...s].filter((id) => !moving.some((c) => c.id === id))));
      setBusy(true);
      try {
        await api('/api/admin/jobs', {
          method: 'PATCH',
          json: {
            ids: moving.map((c) => c.id),
            set: { stage: to.stage, ...(to.stage === 'ARCHIVED' ? { closeReason: to.closeReason ?? null } : {}) },
          },
        });
        toast.success(destinationText(to, moving.length), {
          action: { label: 'Undo', onClick: () => void restoreRef.current(before) },
          duration: UNDO_TOAST_MS,
        });
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setBusy(false);
      }
      changed();
    },
    [board, changed],
  );

  /** days: from today (null clears the follow-up). */
  const followUp = useCallback(
    async (list: BoardCard[], days: number | null) => {
      if (!list.length) return;
      const before: Before[] = list.map((c) => ({ id: c.id, stage: c.stage, closeReason: c.closeReason, followUpAt: c.followUpAt }));
      setBusy(true);
      try {
        await api('/api/admin/jobs', {
          method: 'PATCH',
          json: { ids: list.map((c) => c.id), set: { followUpAt: days == null ? null : inDays(days) } },
        });
        const label = FOLLOW_UPS.find(([, d]) => d === days)?.[0].toLowerCase();
        const many = list.length > 1 ? ` for ${formatNumber(list.length)}` : '';
        toast.success(days == null ? `Follow-up cleared${many}` : `Follow-up ${label ?? `in ${days} days`}${many}`, {
          action: { label: 'Undo', onClick: () => void restoreRef.current(before) },
          duration: UNDO_TOAST_MS,
        });
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setBusy(false);
      }
      changed();
    },
    [changed],
  );

  // The selection when the card is part of it, else just the card.
  const withSelection = useCallback(
    (card: BoardCard) => (selected.has(card.id) && chosen.length > 1 ? chosen : [card]),
    [selected, chosen],
  );

  // Keys: 1–6 move the focused card (or the selection it is in), ← / → to the next column, x selects, Esc clears.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey || openId != null || closing.length) return;
      if (e.key === 'Escape') {
        setSelected(new Set());
        return;
      }
      const card = cards.find((c) => c.id === focused);
      if (!card || !el?.closest('[data-job-id]')) return;
      const n = Number(e.key);
      if (e.key === 'x') {
        setSelected((s) => {
          const next = new Set(s);
          if (next.has(card.id)) next.delete(card.id);
          else next.add(card.id);
          return next;
        });
      } else if (n >= 1 && n <= BOARD_STAGES.length) {
        refocus.current = card.id;
        void move(withSelection(card), { stage: BOARD_STAGES[n - 1] });
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const i = ARROW_STAGES.indexOf(card.stage);
        const j = i + (e.key === 'ArrowRight' ? 1 : -1);
        if (i >= 0 && j >= 0 && j < ARROW_STAGES.length) {
          e.preventDefault();
          refocus.current = card.id;
          void move(withSelection(card), { stage: ARROW_STAGES[j] });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cards, focused, openId, closing.length, move, withSelection]);

  const openJob = (id: number | null) => {
    const next = new URLSearchParams(params.toString());
    if (id == null) next.delete('job');
    else next.set('job', String(id));
    router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
  };

  async function showMore(col: BoardColumn) {
    setLoadingMore(col.stage);
    try {
      const qs = new URLSearchParams(query);
      qs.set('stage', col.stage);
      qs.set('offset', String(col.cards.length));
      const r = await api<{ cards: BoardCard[]; total: number }>(`/api/admin/applications?${qs.toString()}`);
      setBoard((b) =>
        b
          ? {
              ...b,
              columns: b.columns.map((c) =>
                c.stage === col.stage
                  ? { ...c, total: r.total, cards: [...c.cards, ...r.cards.filter((x) => !c.cards.some((y) => y.id === x.id))] }
                  : c,
              ),
            }
          : b,
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoadingMore(null);
    }
  }

  const setApplications = useCallback(
    async (userId: number, on: boolean) => {
      setBusy(true);
      try {
        // One user's setting: sent as theirs whatever this page shows.
        await api('/api/admin/user-settings', {
          method: 'PUT',
          json: { applications_enabled: on ? 'true' : 'false' },
          headers: { 'X-JF-View': String(userId) },
        });
        const whose = multiUser ? ` for ${userName(userId)}` : '';
        toast.success(on ? `Applications is on${whose}` : `Applications is off${whose}`);
        changed();
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [changed, multiUser, userName],
  );

  if (!board) {
    return error ? (
      <p className="text-sm text-destructive">{error}</p>
    ) : (
      <div className="grid h-40 place-items-center">
        <Spinner />
      </div>
    );
  }

  const on = board.users.filter((u) => u.on);
  if (on.length === 0) return <ApplicationsOff users={board.users} busy={busy} onTurnOn={(id) => void setApplications(id, true)} />;
  const off = board.users.filter((u) => !u.on);
  const one = viewing === 'all' ? null : (board.users.find((u) => u.id === viewing) ?? null);
  const showStrip = multiUser && viewing === 'all';
  const filtered = !!q || source !== ALL || minScore !== ANY || only != null;
  const shown = board.columns.reduce((n, c) => n + c.total, 0);
  const sources = [{ value: ALL, label: 'All sources' }, ...board.sources.map((s) => ({ value: s.platform, label: `${platformLabel(s.platform)} · ${formatNumber(s.count)}` }))];

  return (
    <div className="space-y-3">
      {showStrip ? <UserStrip users={on} only={only} onOnly={setOnly} /> : null}
      {showStrip && off.length ? (
        <p className="text-xs text-muted-foreground">
          Applications is off for {off.map((u) => userName(u.id)).join(', ')}: their approved jobs stay out of Saved.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-64">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, company, notes"
            aria-label="Search applications"
          />
          {search ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label="Clear the search" onClick={() => setSearch('')}>
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
        <Select items={sources} value={source} onValueChange={(v) => setSource(v == null ? ALL : String(v))}>
          <SelectTrigger size="sm" aria-label="Source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sources.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select items={SCORES} value={minScore} onValueChange={(v) => setMinScore(v == null ? ANY : String(v))}>
          <SelectTrigger size="sm" aria-label="Minimum score">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCORES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 pl-1">
          <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="show-archived" className="text-sm font-normal">
            Show archived
          </Label>
        </div>
        {one ? (
          <div className="flex items-center gap-2 pl-1 sm:ml-auto">
            <Switch id="applications-on" checked onCheckedChange={(v) => !v && void setApplications(one.id, false)} disabled={busy} />
            <Label htmlFor="applications-on" className="text-sm font-normal">
              Applications{multiUser ? ` for ${userName(one.id)}` : ''}
            </Label>
          </div>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="tabular">{filtered ? `${plural(shown, 'application')} match` : plural(shown, 'application')}</span>
        <span className="ml-3 hidden md:inline">
          Drag cards between columns, or focus one and press <Kbd>1</Kbd>–<Kbd>6</Kbd> or <Kbd>←</Kbd>/<Kbd>→</Kbd> · <Kbd>x</Kbd>{' '}
          selects
        </span>
      </p>

      <div className="grid gap-3 overflow-x-auto pb-2 md:grid-flow-col md:auto-cols-[minmax(12.5rem,1fr)]">
        {board.columns.map((col) => {
          const meta = STAGE_META[col.stage];
          const picked = col.cards.filter((c) => selected.has(c.id)).length;
          return (
            <section
              key={col.stage}
              aria-label={meta.label}
              className={cn(
                'flex min-h-24 flex-col gap-2 rounded-xl border bg-muted/30 p-2 transition-colors md:min-h-40',
                overStage === col.stage && 'border-primary bg-primary/5',
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(col.stage);
              }}
              onDragLeave={() => setOverStage((s) => (s === col.stage ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setOverStage(null);
                const card = cards.find((c) => c.id === dragging);
                if (card) void move(withSelection(card), { stage: col.stage });
                setDragging(null);
              }}
            >
              <h2 className="flex items-center gap-2 px-1 text-sm font-medium">
                {col.cards.length ? (
                  <Checkbox
                    checked={picked > 0 && picked === col.cards.length}
                    indeterminate={picked > 0 && picked < col.cards.length}
                    onCheckedChange={(v) =>
                      setSelected((s) => {
                        const next = new Set(s);
                        for (const c of col.cards) {
                          if (v) next.add(c.id);
                          else next.delete(c.id);
                        }
                        return next;
                      })
                    }
                    aria-label={`Select every card in ${meta.label}`}
                  />
                ) : null}
                <span className={cn('size-2 rounded-full', meta.dot)} aria-hidden />
                {meta.label}
                <span className="tabular ml-auto text-xs text-muted-foreground">{formatNumber(col.total)}</span>
              </h2>
              {col.cards.map((c) => (
                <BoardCardView
                  key={c.id}
                  card={c}
                  selected={selected.has(c.id)}
                  dragging={dragging === c.id}
                  onSelect={(v) =>
                    setSelected((s) => {
                      const next = new Set(s);
                      if (v) next.add(c.id);
                      else next.delete(c.id);
                      return next;
                    })
                  }
                  onOpen={() => openJob(c.id)}
                  onFocus={() => setFocused(c.id)}
                  onMove={(to) => void move(withSelection(c), to)}
                  onFollowUp={(days) => void followUp(withSelection(c), days)}
                  onDragStart={() => setDragging(c.id)}
                  onDragEnd={() => setDragging(null)}
                />
              ))}
              {col.cards.length < col.total ? (
                <Button variant="ghost" size="sm" onClick={() => void showMore(col)} disabled={loadingMore === col.stage}>
                  {loadingMore === col.stage ? <Spinner /> : null}
                  Show more ({formatNumber(col.total - col.cards.length)} left)
                </Button>
              ) : null}
              {col.total === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                  {filtered ? (
                    'No matches'
                  ) : (
                    <>
                      <span className="md:hidden">No jobs here</span>
                      <span className="hidden md:inline">Drop a job here</span>
                    </>
                  )}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>

      {chosen.length ? (
        <SelectionBar
          cards={chosen}
          busy={busy}
          onClear={() => setSelected(new Set())}
          onMove={(to) => void move(chosen, to)}
          onFollowUp={(days) => void followUp(chosen, days)}
        />
      ) : null}

      <CloseDialog
        count={closing.length}
        onClose={() => setClosing([])}
        onChoose={(to) => {
          const list = closing;
          setClosing([]);
          void move(list, to);
        }}
      />
      <JobDetailSheet jobId={openId} onOpenChange={(o) => !o && openJob(null)} onChanged={changed} />
    </div>
  );
}

/** Each user's pipeline and next actions at a glance; a click shows only their cards (again: everyone's). */
function UserStrip({ users, only, onOnly }: { users: BoardUser[]; only: number | null; onOnly: (id: number | null) => void }) {
  const { userName } = useViewing();
  const total = users.reduce(
    (t, u) => ({
      saved: t.saved + u.saved,
      applied: t.applied + u.applied,
      interview: t.interview + u.interview,
      todo: t.todo + u.todo,
    }),
    { saved: 0, applied: 0, interview: 0, todo: 0 },
  );
  const rows = [{ id: null as number | null, name: 'All users', ...total }, ...users.map((u) => ({ ...u, id: u.id as number | null, name: userName(u.id) }))];
  return (
    // One row that scrolls sideways on a phone; it wraps on wider screens.
    <div role="group" aria-label="Whose applications" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap">
      {rows.map((r) => {
        const active = only === r.id;
        return (
          <button
            key={r.id ?? 'all'}
            type="button"
            aria-pressed={active}
            onClick={() => onOnly(active || r.id == null ? null : r.id)}
            className={cn(
              'flex shrink-0 flex-col items-start gap-0.5 rounded-lg border bg-card px-3 py-1.5 text-left text-xs outline-none hover:border-ring/50 focus-visible:ring-3 focus-visible:ring-ring/50',
              active && 'border-primary bg-primary/5',
            )}
          >
            <span className="text-sm font-medium">{r.name}</span>
            <span className="tabular text-muted-foreground">
              {formatNumber(r.saved)} saved · {formatNumber(r.applied)} applied · {formatNumber(r.interview)} interview
              {r.todo ? <span className="text-amber-700 dark:text-amber-400"> · {formatNumber(r.todo)} to do</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The bar for the selected cards: move, close or set a follow-up for all of them. */
function SelectionBar({
  cards,
  busy,
  onClear,
  onMove,
  onFollowUp,
}: {
  cards: BoardCard[];
  busy: boolean;
  onClear: () => void;
  onMove: (to: Destination) => void;
  onFollowUp: (days: number | null) => void;
}) {
  const n = cards.length;
  return (
    <div
      role="toolbar"
      aria-label={`${n} selected applications`}
      className="sticky bottom-3 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border bg-popover/95 p-1.5 text-sm shadow-lg backdrop-blur supports-backdrop-filter:bg-popover/80"
    >
      <span className="tabular px-2 font-medium" aria-live="polite">
        {n} selected
      </span>
      <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Clear selection">
        <XIcon />
      </Button>
      <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" disabled={busy} />}>
          Move to
          <ChevronDownIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {BOARD_STAGES.map((s) => (
            <DropdownMenuItem key={s} onClick={() => onMove({ stage: s })}>
              <span className={cn('size-2 rounded-full', STAGE_META[s].dot)} aria-hidden />
              {STAGE_META[s].label}
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
            <DropdownMenuItem key={c.reason} onClick={() => onMove(c.to)}>
              {CLOSE_REASON_LABEL[c.reason]}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onMove({ stage: 'ARCHIVED', closeReason: null })}>Archive without a reason</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" disabled={busy} />}>
          Follow up
          <ChevronDownIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {FOLLOW_UPS.map(([label, days]) => (
            <DropdownMenuItem key={label} onClick={() => onFollowUp(days)}>
              {label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onFollowUp(null)}>Clear follow-up</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Applications is off for everyone in view: what that means, and a way to turn it on. */
function ApplicationsOff({ users, busy, onTurnOn }: { users: BoardUser[]; busy: boolean; onTurnOn: (userId: number) => void }) {
  const { multiUser, userName } = useViewing();
  const title = !multiUser
    ? 'Applications is off'
    : users.length === 1
      ? `Applications is off for ${userName(users[0].id)}`
      : 'Applications is off for every user';
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Jobs approved by hand stay out of Saved, there are no follow-up reminders, and the Google Sheet&apos;s Stage column is
          left alone, so you can track applications somewhere else. Approved jobs still go to the sheet (if set up) and stay in
          Jobs. Each user&apos;s switch is also in Settings → Applications.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {users.map((u) => (
          <Button key={u.id} variant="outline" onClick={() => onTurnOn(u.id)} disabled={busy}>
            Turn on Applications{multiUser && users.length > 1 ? ` for ${userName(u.id)}` : ''}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
