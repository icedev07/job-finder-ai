'use client';

import { useEffect } from 'react';

/**
 * Run an async loader when the component mounts and whenever `load` changes identity.
 * The call happens in a timer callback rather than in the effect body, so the loader's state updates are not
 * synchronous with the effect (react-hooks/set-state-in-effect), and the cleanup cancels the call when React
 * StrictMode mounts twice — one fetch instead of two.
 */
export function useLoadOnMount(load: () => Promise<unknown> | unknown): void {
  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);
}
