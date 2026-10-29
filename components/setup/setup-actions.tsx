'use client';

import { DatabaseIcon, RefreshCwIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { CopyButton } from '@/components/common/copy-button';
import { useStatus } from '@/components/shell/status-provider';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/clientApi';

/** Runs /api/setup (idempotent: creates missing tables / columns, seeds defaults). */
export function RunSetupButton() {
  const router = useRouter();
  const { refresh } = useStatus();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch('/api/setup');
          const data = await res.json();
          if (!res.ok || data.status === 'error') throw new Error(data.message || `HTTP ${res.status}`);
          toast.success(data.message || 'Database is up to date');
          refresh();
          router.refresh();
        } catch (e) {
          toast.error(`Setup failed: ${errorMessage(e)}`);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Spinner /> : <DatabaseIcon />}
      Create / update tables
    </Button>
  );
}

export function RecheckButton() {
  const router = useRouter();
  const { refresh } = useStatus();
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        refresh();
        router.refresh();
      }}
    >
      <RefreshCwIcon />
      Check again
    </Button>
  );
}

/** A fresh random secret to paste into an environment variable. */
export function SecretGenerator({ name }: { name: string }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          const bytes = new Uint8Array(32);
          crypto.getRandomValues(bytes);
          setValue(Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''));
        }}
      >
        Generate a value for {name}
      </Button>
      {value ? (
        <span className="flex min-w-0 items-center gap-1">
          <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{value}</code>
          <CopyButton value={value} label={`Copy ${name}`} />
        </span>
      ) : null}
    </div>
  );
}
