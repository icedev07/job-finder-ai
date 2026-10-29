'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { api, errorMessage } from '@/lib/clientApi';

export type LogRows<T> = {
  rows: T[];
  loading: boolean;
  error: string | null;
  /** Fetches again and resolves once the new rows (or an error) are in. Never rejects. */
  reload: () => Promise<void>;
};

type Settled<T> = { key: string; rows: T[]; error: string | null };

const NO_ROWS: never[] = [];

/**
 * GET /api/admin/logs?<query>, refetched whenever the query changes or `reload()` is called. The previous rows stay
 * visible while a request runs, and a response that arrives after a newer request was started is ignored.
 */
export function useLogRows<T>(query: string): LogRows<T> {
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const waiters = useRef<Array<() => void>>([]);
  const key = `${version}:${query}`;

  useEffect(() => {
    let latest = true;
    api<unknown>(`/api/admin/logs?${query}`)
      .then((data) => {
        // A failing route can answer with a non-array body; a table must never receive it.
        if (!Array.isArray(data)) throw new Error('Unexpected response from server');
        return { rows: data as T[], error: null };
      })
      .catch((e: unknown) => ({ rows: NO_ROWS as T[], error: errorMessage(e) || 'Failed to load' }))
      .then((result) => {
        if (!latest) return;
        setSettled({ key, ...result });
        const done = waiters.current;
        waiters.current = [];
        for (const resolve of done) resolve();
      });
    return () => {
      latest = false;
    };
  }, [key, query]);

  const reload = useCallback(
    () =>
      new Promise<void>((resolve) => {
        waiters.current.push(resolve);
        setVersion((v) => v + 1);
      }),
    [],
  );

  const loading = settled?.key !== key;
  return {
    rows: settled?.rows ?? NO_ROWS,
    loading,
    // A new request clears the previous error, as a retry should.
    error: loading ? null : (settled?.error ?? null),
    reload,
  };
}
