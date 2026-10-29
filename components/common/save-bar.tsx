'use client';

import { CircleAlertIcon, SaveIcon, Undo2Icon } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/**
 * Sticky bar shown while a page has unsaved changes: lists what changed, Save (Ctrl+S) and Discard.
 * Also warns before leaving the page with unsaved changes.
 */
export function SaveBar({
  dirtyLabels,
  saving,
  error,
  onSave,
  onDiscard,
}: {
  dirtyLabels: string[];
  saving: boolean;
  error?: string | null;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const dirty = dirtyLabels.length > 0;

  useEffect(() => {
    if (!dirty) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!saving) onSave();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [dirty, saving, onSave]);

  if (!dirty && !saving) return null;
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="sticky bottom-3 z-30 mx-auto w-full max-w-3xl animate-in fade-in-0 slide-in-from-bottom-2"
    >
      <div
        className={cn(
          'flex flex-col gap-2 rounded-xl border bg-popover/95 p-2.5 pl-4 text-sm shadow-lg ring-1 ring-foreground/5 backdrop-blur sm:flex-row sm:items-center',
          error && 'border-destructive/50',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {error ? (
            <CircleAlertIcon className="size-4 shrink-0 text-destructive" aria-hidden />
          ) : (
            <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
          )}
          <p className="min-w-0 truncate">
            {error ? (
              <span className="text-destructive" role="alert">
                {error}
              </span>
            ) : (
              <>
                <span className="font-medium">Unsaved changes</span>
                <span className="text-muted-foreground"> · {dirtyLabels.join(', ')}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
            <Undo2Icon />
            Discard
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? <Spinner /> : <SaveIcon />}
            {saving ? 'Saving…' : 'Save changes'}
            <Kbd className="ml-1 hidden bg-primary-foreground/15 text-primary-foreground sm:inline-flex">Ctrl S</Kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}
