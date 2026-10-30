'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import { CopyButton } from '@/components/common/copy-button';
import { SectionCard } from '@/components/common/section-card';
import { Button } from '@/components/ui/button';

const noopSubscribe = () => () => {};

/** What to type into the extension popup: this server's URL, then a user ID and password. */
export function ExtensionConnectCard() {
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => '',
  );
  return (
    <SectionCard
      title="Sign in to the extension"
      description="In the extension popup, enter this server URL and a user ID and password from System → Users, then click Sign in."
      actions={
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/admin/users" />}>
          Users
        </Button>
      }
    >
      <dl className="space-y-3 text-sm">
        <div className="space-y-1">
          <dt className="font-medium">Server URL</dt>
          <dd className="flex items-center gap-1">
            <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{origin || '…'}</code>
            {origin ? <CopyButton value={origin} label="Copy the server URL" /> : null}
          </dd>
        </div>
      </dl>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Each user signs in with their own user ID: the jobs they scan, their settings and their profile stay theirs.</li>
        <li>Admins can pick another user under “Scan for” in the popup, to scan and fill forms for them without signing out.</li>
        <li>Each browser gets its own sign-in, listed below; the password is never stored in the browser.</li>
      </ul>
    </SectionCard>
  );
}
