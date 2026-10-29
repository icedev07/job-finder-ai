'use client';

import { KeyRoundIcon } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { ConfirmButton } from '@/components/common/confirm-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { api, errorMessage } from '@/lib/clientApi';

export type SecretState = { set: boolean; hint: string };

/**
 * Write-only secret editor. The stored value never reaches the browser: the field shows "Saved · …4f2a",
 * Replace opens an input, Save writes the new value right away, Remove deletes it after a confirmation.
 */
export function SecretField({
  configKey,
  label,
  description,
  placeholder,
  state,
  multiline = false,
  onSaved,
}: {
  configKey: string;
  label: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  state: SecretState | undefined;
  multiline?: boolean;
  onSaved?: () => void;
}) {
  const id = useId();
  const isSet = !!state?.set;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const showInput = editing || !isSet;

  async function save() {
    const v = value.trim();
    if (!v) return;
    setSaving(true);
    try {
      await api('/api/admin/config', { method: 'PUT', json: { [configKey]: v } });
      setValue('');
      setEditing(false);
      toast.success('Saved');
      onSaved?.();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <Label htmlFor={id} className="font-medium">
            {label}
          </Label>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {isSet ? (
          <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
            <KeyRoundIcon />
            Saved {state?.hint ? `· ${state.hint}` : ''}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Not set
          </Badge>
        )}
      </div>
      {showInput ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          {multiline ? (
            <textarea
              id={id}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              rows={5}
              spellCheck={false}
              autoComplete="off"
              className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          ) : (
            <Input
              id={id}
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void save();
              }}
            />
          )}
          <div className="flex shrink-0 gap-2">
            <Button size="sm" onClick={() => void save()} disabled={saving || !value.trim()}>
              {saving ? <Spinner /> : null}
              Save
            </Button>
            {isSet ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setValue('');
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Replace
          </Button>
          <ConfirmButton
            size="sm"
            variant="ghost"
            destructive
            title="Remove this key?"
            description="Anything that uses it stops working until you add a key again."
            confirmLabel="Remove"
            onConfirm={async () => {
              try {
                await api('/api/admin/config', { method: 'PUT', json: { __clear: [configKey] } });
                onSaved?.();
                return { ok: true, message: 'Removed' };
              } catch (e) {
                return { ok: false, error: errorMessage(e) };
              }
            }}
          >
            Remove
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}
