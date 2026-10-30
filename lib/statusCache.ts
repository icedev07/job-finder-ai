// Where the status snapshot keeps its slow parts (lib/status.ts), apart so the
// request guards (lib/scope.ts, lib/extensionAuth.ts) can drop them after a
// change without importing the snapshot itself.

export type SlowStore<T> = { generation: number; entries: Map<string, { value: T; expiresAt: number }> };

// On globalThis: pages and API routes are bundled apart but share the process.
const holder = globalThis as unknown as { __jfStatusSlow?: SlowStore<unknown> };

export function slowStore<T>(): SlowStore<T> {
  return (holder.__jfStatusSlow ??= { generation: 0, entries: new Map() }) as SlowStore<T>;
}

/** Drop the cached parts: the next snapshot reads everything again. */
export function markStatusStale(): void {
  const store = slowStore();
  store.generation++;
  store.entries.clear();
}

/** A request that may change something (anything but GET, HEAD and OPTIONS). */
export function isWrite(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}
