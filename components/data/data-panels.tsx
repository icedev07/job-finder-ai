'use client';

import { DownloadIcon, Trash2Icon } from 'lucide-react';
import { useCallback, useState } from 'react';

import { ConfirmButton } from '@/components/common/confirm-button';
import { SectionCard } from '@/components/common/section-card';
import { useStatus } from '@/components/shell/status-provider';
import { useViewing } from '@/components/shell/viewing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, viewingParam } from '@/lib/clientApi';
import { formatBytes, formatNumber, formatPercent } from '@/lib/format';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';

// A failed query leaves its part null (or the table list empty) and `error`
// says why; the rest of the card still shows.
type Storage = {
  sizeBytes: number | null;
  limitBytes: number;
  tables: { name: string; bytes: number; rows: number }[];
  rejectedOlderThan30d: number | null;
  error: string | null;
};

type ActionResult = { ok: boolean; message?: string; error?: string };

async function runAction(body: Record<string, unknown>): Promise<ActionResult> {
  try {
    return await api<ActionResult>('/api/admin/data', { method: 'POST', json: body });
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

function CleanupRow({
  title,
  description,
  defaultDays,
  minDays,
  action,
  onDone,
}: {
  title: string;
  description: string;
  defaultDays: number;
  minDays: number;
  action: string;
  onDone: () => void;
}) {
  const [days, setDays] = useState(String(defaultDays));
  const n = Number(days);
  const valid = Number.isFinite(n) && n >= minDays;
  return (
    <div className="flex flex-col gap-2 border-t py-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">older than</span>
        <Input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" className="h-7 w-16" aria-label={`${title}: days`} />
        <span className="text-xs text-muted-foreground">days</span>
        <ConfirmButton
          size="sm"
          variant="outline"
          disabled={!valid}
          title={`${title}?`}
          description={`Everything older than ${n} days. This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={async () => {
            const r = await runAction({ action, olderThanDays: n });
            if (r.ok) onDone();
            return r;
          }}
        >
          <Trash2Icon />
          Clean up
        </ConfirmButton>
      </div>
    </div>
  );
}

/** Storage, clean-ups, danger zone and settings export for the Data page. */
export function DataPanels() {
  const { viewing, userName } = useViewing();
  // Clean-ups, exports and the danger zone work on the user being viewed.
  const whose = viewing === 'all' ? 'all' : userName(viewing);
  const [storage, setStorage] = useState<Storage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useStatus();

  const load = useCallback(async () => {
    try {
      setStorage(await api<Storage>('/api/admin/data'));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useLoadOnMount(load);

  const done = () => {
    void load();
    refresh();
  };

  const pct = storage?.sizeBytes != null ? storage.sizeBytes / storage.limitBytes : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Storage" description="Supabase's free plan allows 500 MB. Old rejected jobs and logs are the usual growth.">
          {error || storage?.error ? <p className="text-sm text-destructive">{error || storage?.error}</p> : null}
          {!storage ? (
            <Spinner />
          ) : (
            <>
              <div className="space-y-1.5">
                <p className="tabular text-2xl font-semibold">
                  {formatBytes(storage.sizeBytes)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    of {formatBytes(storage.limitBytes)} · {formatPercent(pct)}
                  </span>
                </p>
                <Progress value={Math.min(100, (pct ?? 0) * 100)} aria-label="Database size" />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead className="text-right">Rows (approx.)</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storage.tables.map((t) => (
                    <TableRow key={t.name}>
                      <TableCell className="font-mono text-xs">{t.name}</TableCell>
                      <TableCell className="tabular text-right">{formatNumber(t.rows)}</TableCell>
                      <TableCell className="tabular text-right">{formatBytes(t.bytes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Clean up"
            description={`${whose === 'all' ? 'Jobs and logs of every user' : `${whose}'s jobs and logs`}. Jobs rated or put in the pipeline are never touched. Note: a deleted rejected job can be found and judged again by a later scan.`}
          >
            <CleanupRow
              title="Old rejected jobs"
              description={
                storage?.rejectedOlderThan30d != null
                  ? `${formatNumber(storage.rejectedOlderThan30d)} rejected jobs are older than 30 days.`
                  : 'Rejected, unrated, not in the pipeline.'
              }
              defaultDays={60}
              minDays={7}
              action="cleanup-rejected"
              onDone={done}
            />
            <CleanupRow
              title="Old logs"
              description="Scan, AI-analysis and extension logs."
              defaultDays={30}
              minDays={1}
              action="cleanup-logs"
              onDone={done}
            />
            <CleanupRow
              title="Old AI usage rows"
              description="Usage & cost history. The current month always stays (it feeds the Claude budget cap)."
              defaultDays={90}
              minDays={35}
              action="cleanup-usage"
              onDone={done}
            />
          </SectionCard>

          <SectionCard title="Export" description="Downloads for your own backups.">
            <div className="flex flex-wrap gap-2">
              {/* A file download from a route handler, not a page, so a plain <a> rather than <Link>. */}
              <Button size="sm" variant="outline" nativeButton={false} render={<a href={`/api/admin/jobs/export?${viewingParam()}`} />}>
                <DownloadIcon />
                {whose === 'all' ? 'All jobs (CSV)' : `${whose}'s jobs (CSV)`}
              </Button>
              <Button size="sm" variant="outline" nativeButton={false} render={<a href={`/api/admin/data?export=settings&${viewingParam()}`} />}>
                <DownloadIcon />
                Settings &amp; profile (JSON, no secrets)
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Danger zone"
            description={`Deletes ${whose === 'all' ? 'every job of every user' : `every job of ${whose}`} (approved, rejected, in the pipeline) and its AI history. Settings, profile, resumes, skip rules and AI usage stay.`}
            className="border-destructive/40"
          >
            <ConfirmButton
              destructive
              typeToConfirm="DELETE ALL JOBS"
              title={whose === 'all' ? 'Delete every job of every user?' : `Delete every job of ${whose}?`}
              description="This cannot be undone. Export the jobs first if you might need them."
              confirmLabel="Delete everything"
              onConfirm={async () => {
                const r = await runAction({ action: 'wipe-jobs', confirm: 'DELETE ALL JOBS' });
                if (r.ok) done();
                return r;
              }}
            >
              <Trash2Icon />
              Delete all jobs
            </ConfirmButton>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
