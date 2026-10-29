'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import type { StatusSnapshot } from '@/lib/status';

const POLL_MS = 30_000;

type StatusContextValue = {
  snapshot: StatusSnapshot | null;
  error: string | null;
  refresh: () => void;
};

const StatusContext = createContext<StatusContextValue>({ snapshot: null, error: null, refresh: () => {} });

/** Live status for the shell (strip, badges, checklist): first value from the server, then polled every 30 s. */
export function StatusProvider({ initial, children }: { initial: StatusSnapshot | null; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<StatusSnapshot | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const res = await fetch('/api/admin/status', { cache: 'no-store' });
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
  }, []);

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
