'use client';

import { useSyncExternalStore } from 'react';

import { formatWhen } from '@/lib/format';

const subscribe = () => () => {};

/**
 * A date and time in the browser's time zone ("Tue, Nov 3, 02:00 PM"), for pages the server renders: the server's
 * time zone is not the viewer's, so the text appears once the page runs in the browser.
 */
export function LocalTime({ value, className }: { value: string; className?: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => formatWhen(value),
    () => '',
  );
  return (
    <time dateTime={value} className={className}>
      {text}
    </time>
  );
}
