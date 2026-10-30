'use client';

import { CheckCheckIcon, LayersIcon, ListIcon, Undo2Icon } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ReviewFocus } from '@/components/review/review-focus';
import { ReviewList } from '@/components/review/review-list';
import type { ReviewAction, ReviewJob, ReviewUser } from '@/components/review/types';
import { useStatus } from '@/components/shell/status-provider';
import { useViewing } from '@/components/shell/viewing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Kbd } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';
import { api, errorMessage } from '@/lib/clientApi';
import { formatNumber } from '@/lib/format';

// The Review page: the close calls of the user being viewed (or of every
// user), as a list for working through many at once or one card at a time
// (Focus). Each action can be undone; the queue's numbers in the sidebar and
// the status strip follow.

type Mode = 'list' | 'focus';
const MODE_KEY = 'jf.reviewMode';
// Long enough to read the toast and still reach its Undo.
const UNDO_TOAST_MS = 8000;
const ALL = 'all';

type Queue = { jobs: ReviewJob[]; total: number; users: ReviewUser[] };
type ActResult = { updated: number; undo: unknown; sheet: number };

/** One action this visit, newest last. A Focus "skip" never reached the server, so it has no undo token. */
type Done = { action: ReviewAction | 'skip' | 'all'; jobs: ReviewJob[]; undo: unknown };

function plural(n: number, word: string): string {
  return `${formatNumber(n)} ${word}${n === 1 ? '' : 's'}`;
}

export function ReviewView() {
  const { viewing, multiUser, userName } = useViewing();
  const { refresh } = useStatus();
  const [mode, setMode] = useState<Mode | null>(null);
  const [only, setOnly] = useState<number | null>(null);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done[]>([]);
  // Focus: cards skipped for now go last; cards just undone come first.
  const [skipped, setSkipped] = useState<number[]>([]);
  const [front, setFront] = useState<number[]>([]);

  // The last mode used, once mounted (the server render can't read it).
  const restoreMode = useCallback(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(MODE_KEY);
    } catch {
      // storage unavailable
    }
    setMode(saved === 'focus' ? 'focus' : 'list');
  }, []);
  useLoadOnMount(restoreMode);

  const load = useCallback(async () => {
    if (!mode) return;
    // The list shows more rows without descriptions; Focus shows one job in full.
    const qs = new URLSearchParams(mode === 'list' ? { limit: '200', description: '0' } : { limit: '50' });
    if (only != null) qs.set('only', String(only));
    try {
      setQueue(await api<Queue>(`/api/admin/review?${qs.toString()}`));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [mode, only]);
  useLoadOnMount(load);

  const chooseMode = (next: Mode) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // the choice lasts for this visit only
    }
  };

  // Drop jobs that left the queue (all of them after "Mark all reviewed").
  const removeFromQueue = useCallback(
    (gone: ReviewJob[], all = false) => {
      const ids = new Set(gone.map((j) => j.id));
      setQueue((q) => {
        if (!q) return q;
        const users = q.users.map((u) =>
          all
            ? only == null || u.id === only
              ? { ...u, waiting: 0 }
              : u
            : { ...u, waiting: Math.max(0, u.waiting - gone.filter((j) => j.userId === u.id).length) },
        );
        return all
          ? { ...q, jobs: [], total: 0, users }
          : { ...q, jobs: q.jobs.filter((j) => !ids.has(j.id)), total: Math.max(0, q.total - gone.length), users };
      });
    },
    [only],
  );

  // Worked through the loaded jobs (all left are skipped ones) while more wait: load the next ones.
  const needsMore = !!queue && queue.total > queue.jobs.length && queue.jobs.every((j) => skipped.includes(j.id));
  useEffect(() => {
    if (!needsMore) return;
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [needsMore, load]);

  const undo = useCallback(
    async (entry?: Done) => {
      const target = entry ?? done[done.length - 1];
      if (!target || busy) return;
      if (target.action === 'skip') {
        setDone((d) => d.filter((x) => x !== target));
        setSkipped((s) => s.filter((id) => id !== target.jobs[0]?.id));
        setFront(target.jobs.map((j) => j.id));
        return;
      }
      setBusy(true);
      try {
        const r = await api<{ updated: number; leftInSheet: number }>('/api/admin/review', {
          method: 'POST',
          json: { action: 'undo', undo: target.undo },
        });
        setDone((d) => d.filter((x) => x !== target));
        setFront(target.jobs.map((j) => j.id));
        await load();
        refresh();
        if (r.leftInSheet) {
          const one = r.leftInSheet === 1;
          toast.warning(
            `Undone. ${one ? 'Its row stays' : `${r.leftInSheet} rows stay`} in the Google Sheet: delete ${one ? 'it' : 'them'} there if you don't want ${one ? 'it' : 'them'}.`,
            { duration: 10_000 },
          );
        } else if (entry || mode === 'list') {
          toast.success(r.updated ? `Undone: ${plural(r.updated, 'job')} back in Review` : 'Nothing to undo: they changed since');
        }
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [done, busy, load, mode, refresh],
  );
  // A toast's Undo is clicked later: it must call the current undo, not the one of its render.
  const undoRef = useRef(undo);
  useEffect(() => {
    undoRef.current = undo;
  }, [undo]);

  const act = useCallback(
    async (jobs: ReviewJob[], action: ReviewAction): Promise<boolean> => {
      if (!jobs.length || busy) return false;
      setBusy(true);
      try {
        const r = await api<ActResult>('/api/admin/review', {
          method: 'POST',
          json: { action, ids: jobs.map((j) => j.id) },
        });
        const entry: Done = { action, jobs, undo: r.undo };
        if (r.undo) setDone((d) => [...d, entry]);
        removeFromQueue(jobs);
        refresh();
        // Focus mode moves on to the next card without a message for every decision.
        if (mode === 'list') {
          const what =
            action === 'approve'
              ? `Approved ${plural(r.updated, 'job')}${r.sheet ? ` · sending ${formatNumber(r.sheet)} to the Google Sheet` : ''}`
              : action === 'reject'
                ? `Rejected ${plural(r.updated, 'job')}`
                : `Kept the AI verdict on ${plural(r.updated, 'job')}`;
          toast.success(r.updated ? what : 'Already reviewed elsewhere', {
            action: r.undo ? { label: 'Undo', onClick: () => void undoRef.current(entry) } : undefined,
            duration: r.undo ? UNDO_TOAST_MS : undefined,
          });
        }
        return true;
      } catch (e) {
        toast.error(errorMessage(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, mode, removeFromQueue, refresh],
  );

  const keepAll = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<ActResult>('/api/admin/review', {
        method: 'POST',
        json: { action: 'keep', all: true, ...(only != null ? { only } : {}) },
      });
      const entry: Done = { action: 'all', jobs: [], undo: r.undo };
      if (r.undo) setDone((d) => [...d, entry]);
      removeFromQueue([], true);
      setSkipped([]);
      refresh();
      toast.success(r.updated ? `Marked ${plural(r.updated, 'job')} reviewed: they keep the AI verdict` : 'Nothing left to review', {
        action: r.undo ? { label: 'Undo', onClick: () => void undoRef.current(entry) } : undefined,
        duration: r.undo ? UNDO_TOAST_MS : undefined,
      });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [busy, only, removeFromQueue, refresh]);

  const skip = useCallback((job: ReviewJob) => {
    setDone((d) => [...d, { action: 'skip', jobs: [job], undo: null }]);
    setFront((f) => f.filter((id) => id !== job.id));
    setSkipped((s) => [...s.filter((id) => id !== job.id), job.id]);
  }, []);

  const setReview = useCallback(
    async (userId: number, on: boolean) => {
      setBusy(true);
      try {
        // Review is one user's setting: sent as theirs whatever this page shows.
        await api('/api/admin/user-settings', {
          method: 'PUT',
          json: { review_enabled: on ? 'true' : 'false' },
          headers: { 'X-JF-View': String(userId) },
        });
        const whose = multiUser ? ` for ${userName(userId)}` : '';
        toast.success(on ? `Review is on${whose}` : `Review is off${whose}: close calls keep the AI verdict`);
        await load();
        refresh();
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [load, multiUser, refresh, userName],
  );

  if (!queue) {
    return error ? (
      <p className="text-sm text-destructive">{error}</p>
    ) : (
      <div className="grid h-40 place-items-center">
        <Spinner />
      </div>
    );
  }

  const one = viewing === 'all' ? null : (queue.users.find((u) => u.id === viewing) ?? null);
  const on = queue.users.filter((u) => u.review);
  if (on.length === 0) return <ReviewOff users={queue.users} busy={busy} onTurnOn={(id) => void setReview(id, true)} />;

  const off = queue.users.filter((u) => !u.review);
  const band = one?.band ?? (only != null ? queue.users.find((u) => u.id === only)?.band : undefined);
  const reviewed = done.filter((d) => d.action !== 'skip').reduce((n, d) => n + d.jobs.length, 0);
  // Focus: undone cards first, then the queue, then the cards skipped for now.
  const byId = new Map(queue.jobs.map((j) => [j.id, j]));
  const later = skipped.filter((id) => !front.includes(id));
  const order = [...front, ...queue.jobs.map((j) => j.id).filter((id) => !front.includes(id) && !later.includes(id)), ...later];
  const deck = order.map((id) => byId.get(id)).filter((j): j is ReviewJob => !!j);
  const showUser = multiUser && viewing === 'all';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          value={[mode ?? 'list']}
          onValueChange={(v) => {
            const next = (v as string[])[0];
            if (next === 'list' || next === 'focus') chooseMode(next);
          }}
          variant="outline"
          size="sm"
          aria-label="View"
        >
          <ToggleGroupItem value="list" aria-label="List">
            <ListIcon />
            List
          </ToggleGroupItem>
          <ToggleGroupItem value="focus" aria-label="Focus: one job at a time">
            <LayersIcon />
            Focus
          </ToggleGroupItem>
        </ToggleGroup>
        {showUser && on.length > 1 ? (
          <Select
            items={[
              { value: ALL, label: `All users · ${formatNumber(on.reduce((n, u) => n + u.waiting, 0))}` },
              ...on.map((u) => ({ value: String(u.id), label: `${userName(u.id)} · ${formatNumber(u.waiting)}` })),
            ]}
            value={only == null ? ALL : String(only)}
            onValueChange={(v) => {
              setOnly(v === ALL || v == null ? null : Number(v));
              setSkipped([]);
              setFront([]);
            }}
          >
            <SelectTrigger size="sm" aria-label="Whose close calls">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All users · {formatNumber(on.reduce((n, u) => n + u.waiting, 0))}</SelectItem>
              {on.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {userName(u.id)} · {formatNumber(u.waiting)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {one ? (
          <div className="flex items-center gap-2 pl-1">
            <Switch id="review-on" checked onCheckedChange={(v) => !v && void setReview(one.id, false)} disabled={busy} />
            <Label htmlFor="review-on" className="text-sm font-normal">
              Review{multiUser ? ` for ${userName(one.id)}` : ''}
            </Label>
          </div>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => void undo()} disabled={!done.length || busy}>
            <Undo2Icon />
            Undo
            <Kbd>u</Kbd>
          </Button>
          <Button size="sm" variant="outline" onClick={() => void keepAll()} disabled={busy || queue.total === 0}>
            <CheckCheckIcon />
            Mark all {queue.total ? formatNumber(queue.total) : ''} reviewed
          </Button>
        </div>
      </div>
      {showUser && off.length ? (
        <p className="text-xs text-muted-foreground">
          Review is off for {off.map((u) => userName(u.id)).join(', ')}: their close calls keep the AI verdict.
        </p>
      ) : null}

      {queue.total === 0 && queue.jobs.length === 0 ? (
        <Empty className="rounded-xl border py-12">
          <EmptyHeader>
            <EmptyTitle>Nothing to review</EmptyTitle>
            <EmptyDescription>
              {reviewed ? `You reviewed ${plural(reviewed, 'job')}. ` : ''}New close calls (score{' '}
              {band ? `${band.min}–${band.max}` : 'near the approval line'}) land here after each scan.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center">
            {done.length ? (
              <Button variant="outline" onClick={() => void undo()} disabled={busy}>
                <Undo2Icon />
                Undo last
              </Button>
            ) : null}
            <Button variant="outline" nativeButton={false} render={<Link href="/admin/jobs?status=APPROVED" />}>
              Approved jobs
            </Button>
          </EmptyContent>
        </Empty>
      ) : mode === 'focus' ? (
        <ReviewFocus
          jobs={deck}
          left={queue.total}
          reviewed={reviewed}
          busy={busy}
          skipped={skipped}
          onAct={(job, action) => void act([job], action)}
          onSkip={skip}
          onUndo={() => void undo()}
        />
      ) : (
        <ReviewList
          jobs={queue.jobs}
          total={queue.total}
          busy={busy}
          showUser={showUser}
          onAct={act}
          onUndo={() => void undo()}
          onChanged={() => {
            void load();
            refresh();
          }}
        />
      )}
    </div>
  );
}

/** Review is off for everyone in view: say what that means and offer to turn it on. */
function ReviewOff({ users, busy, onTurnOn }: { users: ReviewUser[]; busy: boolean; onTurnOn: (userId: number) => void }) {
  const { multiUser, userName } = useViewing();
  const title = !multiUser
    ? 'Review is off'
    : users.length === 1
      ? `Review is off for ${userName(users[0].id)}`
      : 'Review is off for every user';
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Close calls keep the AI verdict: approved ones still go to the Google Sheet (if set up), and all of them stay in
          Jobs. Turn Review on to give them a quick yes or no here. Each user&apos;s switch is also in Settings → Target
          &amp; matching.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {users.map((u) => (
          <Button key={u.id} variant="outline" onClick={() => onTurnOn(u.id)} disabled={busy}>
            Turn on Review{multiUser && users.length > 1 ? ` for ${userName(u.id)}` : ''}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
