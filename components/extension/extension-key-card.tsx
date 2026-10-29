'use client';

import { EyeIcon, KeyRoundIcon, RefreshCwIcon } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import { ConfirmButton } from '@/components/common/confirm-button';
import { CopyButton } from '@/components/common/copy-button';
import { SectionCard } from '@/components/common/section-card';
import { useStatus } from '@/components/shell/status-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, errorMessage } from '@/lib/clientApi';
import { useAdminConfig } from '@/lib/useAdminConfig';

const noopSubscribe = () => () => {};

function newKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `jf_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/** The extension API key: generate, reveal and copy it (the only secret that can be revealed). */
export function ExtensionKeyCard() {
  const { config, reload } = useAdminConfig();
  const { refresh } = useStatus();
  const [revealed, setRevealed] = useState<string | null>(null);
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => '',
  );
  const state = config?.secrets?.extension_api_key;

  async function reveal() {
    try {
      const r = await api<{ value: string }>('/api/admin/config/reveal', { method: 'POST', json: { key: 'extension_api_key' } });
      setRevealed(r.value);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function generate() {
    const key = newKey();
    try {
      await api('/api/admin/config', { method: 'PUT', json: { extension_api_key: key } });
      setRevealed(key);
      await reload();
      refresh();
      return { ok: true, message: 'New key saved — paste it into the extension popup' };
    } catch (e) {
      return { ok: false, error: errorMessage(e) };
    }
  }

  return (
    <SectionCard
      title="Connect the extension"
      description="Paste these two values into the extension popup and click Save. The key is required: without it the server refuses every request."
      actions={
        state?.set ? (
          <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
            <KeyRoundIcon />
            Key saved · {state.hint}
          </Badge>
        ) : (
          <Badge variant="destructive">No key — the extension is locked out</Badge>
        )
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
        <div className="space-y-1">
          <dt className="font-medium">API key</dt>
          <dd className="flex flex-wrap items-center gap-2">
            {revealed ? (
              <>
                <code className="max-w-full truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{revealed}</code>
                <CopyButton value={revealed} label="Copy the API key" />
              </>
            ) : state?.set ? (
              <Button size="sm" variant="outline" onClick={() => void reveal()}>
                <EyeIcon />
                Reveal
              </Button>
            ) : null}
            {state?.set ? (
              <ConfirmButton
                size="sm"
                variant="ghost"
                title="Generate a new key?"
                description="The old key stops working right away; paste the new one into the extension popup."
                confirmLabel="Generate"
                onConfirm={generate}
              >
                <RefreshCwIcon />
                New key
              </ConfirmButton>
            ) : (
              <Button
                size="sm"
                onClick={async () => {
                  const r = await generate();
                  if (r.ok) toast.success(r.message);
                  else toast.error(r.error);
                }}
              >
                <KeyRoundIcon />
                Generate a key
              </Button>
            )}
          </dd>
        </div>
      </dl>
    </SectionCard>
  );
}
