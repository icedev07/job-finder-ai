'use client';

import { EyeIcon, KeyRoundIcon, PowerOffIcon, RefreshCwIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmButton } from '@/components/common/confirm-button';
import { CopyButton } from '@/components/common/copy-button';
import { SectionCard } from '@/components/common/section-card';
import { useStatus } from '@/components/shell/status-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, errorMessage } from '@/lib/clientApi';
import { useAdminConfig } from '@/lib/useAdminConfig';

function newKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `jf_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The shared extension key of extension 2.0 and older, which had no sign-in: it acts as the first admin. Kept so an
 * old extension works until it is updated; turn it off once every browser has signed in.
 */
export function SharedKeyCard() {
  const { config, reload } = useAdminConfig();
  const { refresh } = useStatus();
  const [revealed, setRevealed] = useState<string | null>(null);
  const state = config?.secrets?.extension_api_key;

  async function reveal() {
    try {
      const r = await api<{ value: string }>('/api/admin/config/reveal', { method: 'POST', json: { key: 'extension_api_key' } });
      setRevealed(r.value);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function save(json: Record<string, unknown>, message: string, shown: string | null) {
    try {
      await api('/api/admin/config', { method: 'PUT', json });
      setRevealed(shown);
      await reload();
      refresh();
      return { ok: true, message };
    } catch (e) {
      return { ok: false, error: errorMessage(e) };
    }
  }

  const generate = () => {
    const key = newKey();
    return save({ extension_api_key: key }, 'New key saved — paste it into the old extension popup', key);
  };

  return (
    <SectionCard
      title="Old shared key (extension 2.0 and older)"
      description="Extensions from before sign-in connect with this one key and save every job as the first admin. Update them to 2.1, sign in, then turn the key off."
      actions={
        state?.set ? (
          <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400">
            <KeyRoundIcon />
            On · {state.hint}
          </Badge>
        ) : (
          <Badge variant="outline">Off</Badge>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {revealed ? (
          <>
            <code className="max-w-full truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{revealed}</code>
            <CopyButton value={revealed} label="Copy the shared key" />
          </>
        ) : state?.set ? (
          <Button size="sm" variant="outline" onClick={() => void reveal()}>
            <EyeIcon />
            Reveal
          </Button>
        ) : null}
        {state?.set ? (
          <>
            <ConfirmButton
              size="sm"
              variant="ghost"
              title="Generate a new shared key?"
              description="The old key stops working right away; paste the new one into every old extension popup."
              confirmLabel="Generate"
              onConfirm={generate}
            >
              <RefreshCwIcon />
              New key
            </ConfirmButton>
            <ConfirmButton
              size="sm"
              variant="ghost"
              destructive
              title="Turn the shared key off?"
              description="Extensions 2.0 and older stop working at once. Extensions that signed in with a user ID keep working."
              confirmLabel="Turn off"
              onConfirm={() => save({ __clear: ['extension_api_key'] }, 'Shared key turned off', null)}
            >
              <PowerOffIcon />
              Turn off
            </ConfirmButton>
          </>
        ) : (
          <ConfirmButton
            size="sm"
            variant="outline"
            title="Turn the shared key on?"
            description="Only for an extension older than 2.1, which cannot sign in: it will save every job as the first admin."
            confirmLabel="Turn on"
            onConfirm={generate}
          >
            <KeyRoundIcon />
            Turn on
          </ConfirmButton>
        )}
      </div>
    </SectionCard>
  );
}
