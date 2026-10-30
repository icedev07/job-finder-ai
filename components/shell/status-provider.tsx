'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { useViewing } from '@/components/shell/viewing';
import type { StatusSnapshot } from '@/lib/status';

const POLL_MS = 30_000;

type StatusContextValue = {
  snapshot: StatusSnapshot | null;
  error: string | null;
  refresh: () => void;
  /** The first snapshot, from the server render (StatusSeed). */
  seed: (value: StatusSnapshot | null) => void;
};

const StatusContext = createContext<StatusContextValue>({ snapshot: null, error: null, refresh: () => {}, seed: () => {} });

/**
 * Live status for the shell (strip, badges, checklist) of the user being viewed: the first value streamed in from
 * the server render (StatusSeed, so no page waits for it), then polled every 30 s, and loaded again when the
 * Viewing menu changes.
 */
export function StatusProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<StatusSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);
  const seeded = useRef(false);
  const { viewing } = useViewing();

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const res = await fetch('/api/admin/status', { cache: 'no-store', headers: { 'X-JF-View': String(viewing) } });
      if (res.status === 401) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      seeded.current = true;
      setSnapshot(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status unavailable');
    } finally {
      inflight.current = false;
    }
  }, [viewing]);

  // The server render's snapshot, unless a newer one came first; none (usually the database is down): ask right
  // away so the strip says why instead of waiting for the first poll.
  const seed = useCallback(
    (value: StatusSnapshot | null) => {
      if (seeded.current) return;
      seeded.current = true;
      if (value) setSnapshot(value);
      else void refresh();
    },
    [refresh],
  );

  // Another user picked in the Viewing menu: their numbers, right away.
  const shown = useRef(viewing);
  useEffect(() => {
    if (shown.current === viewing) return;
    shown.current = viewing;
    inflight.current = false;
    void refresh();
  }, [viewing, refresh]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [refresh]);

  return <StatusContext.Provider value={{ snapshot, error, refresh, seed }}>{children}</StatusContext.Provider>;
}

/** Hands the server render's snapshot to the StatusProvider above, once it has streamed in. */
export function StatusSeed({ value }: { value: StatusSnapshot | null }) {
  const { seed } = useContext(StatusContext);
  useEffect(() => {
    seed(value);
  }, [seed, value]);
  return null;
}

export function useStatus(): StatusContextValue {
  return useContext(StatusContext);
}
