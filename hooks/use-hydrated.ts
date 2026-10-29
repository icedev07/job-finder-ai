import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False during SSR and the hydration render, true once React owns the page. Primary actions use it to stay
 * disabled until their click handlers exist: on a slow phone, a click on server-rendered markup would do nothing.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
