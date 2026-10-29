'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { useViewing } from '@/components/shell/viewing';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';
import type { StatusSnapshot } from '@/lib/status';

const POLL_MS = 30_000;

type StatusContextValue = {
  snapshot: StatusSnapshot | null;
  error: string | null;
  refresh: () => void;
};

const StatusContext = createContext<StatusContextValue>({ snapshot: null, error: null, refresh: () => {} });

/**
 * Live status for the shell (strip, badges, checklist) of the user being viewed: first value from the server,
 * then polled every 30 s, and loaded again when the Viewing menu changes.
 */
export function StatusProvider({ initial, children }: { initial: StatusSnapshot | null; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<StatusSnapshot | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);
  const { viewing } = useViewing();

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const res = await fetch('/api/admin/status', { cache: 'no-store', headers: { 'X-JF-View': String(viewing) } });
      if (res.status === 401) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSnapshot(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status unavailable');
    } finally {
      inflight.current = false;
    }
  }, [viewing]);

  // Another user picked in the Viewing menu: their numbers, right away.
  const shown = useRef(viewing);
  useEffect(() => {
    if (shown.current === viewing) return;
    shown.current = viewing;
    inflight.current = false;
    void refresh();
  }, [viewing, refresh]);

  // The server could not build a snapshot (usually the database is down): ask
  // right away so the strip says why instead of waiting for the first poll.
  const missingInitial = initial === null;
  const loadIfMissing = useCallback(() => (missingInitial ? refresh() : undefined), [missingInitial, refresh]);
  useLoadOnMount(loadIfMissing);

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

  return <StatusContext.Provider value={{ snapshot, error, refresh }}>{children}</StatusContext.Provider>;
}

export function useStatus(): StatusContextValue {
  return useContext(StatusContext);
}
