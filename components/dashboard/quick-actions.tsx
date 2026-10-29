'use client';

import { PlayIcon, SheetIcon, SparklesIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { useStatus } from '@/components/shell/status-provider';
import { Button } from '@/components/ui/button';
import { api, errorMessage } from '@/lib/clientApi';

type Result = Record<string, unknown>;

/** Run a scan pass, analyze pending jobs, sync Sheets — with toasts, then refresh the page data. */
export function QuickActions() {
  const router = useRouter();
  const { refresh } = useStatus();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, label: string, fn: () => Promise<Result>, done: (r: Result) => string) {
    setBusy(key);
    const id = toast.loading(`${label}…`);
    try {
      const r = await fn();
      toast.success(done(r), { id });
    } catch (e) {
      toast.error(`${label} failed: ${errorMessage(e)}`, { id });
    } finally {
      setBusy(null);
      refresh();
      router.refresh();
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={!!busy}
        onClick={() =>
          run(
            'scan',
            'Scan pass',
            () => api<Result>('/api/admin/scanners/run', { method: 'POST', json: { board: 'all' } }),
            (r) => `Scan pass: ${Number(r.jobsSaved ?? 0)} new jobs, ${Number(r.approved ?? 0)} approved`,
          )
        }
      >
        <PlayIcon />
        Run a scan pass
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!!busy}
        onClick={() =>
          run(
            'analyze',
            'Analyzing pending',
            () => api<Result>('/api/admin/analyze', { method: 'POST', json: {} }),
            (r) => `Analyzed ${Number(r.analyzed ?? 0)} · ${Number(r.remaining ?? 0)} still pending`,
          )
        }
      >
        <SparklesIcon />
        Analyze pending
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!!busy}
        onClick={() =>
          run(
            'sheets',
            'Syncing Google Sheets',
            () => api<Result>('/api/admin/sheets-sync', { method: 'POST' }),
            (r) => `Synced ${Number(r.synced ?? 0)} jobs to Google Sheets`,
          )
        }
      >
        <SheetIcon />
        Sync Sheets
      </Button>
    </>
  );
}
