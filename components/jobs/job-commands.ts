'use client';

import { toast } from 'sonner';

import { api, errorMessage } from '@/lib/clientApi';
import { STAGE_META, type JobStage } from '@/lib/format';

export type JobSet = {
  stage?: JobStage | null;
  feedback?: 1 | -1 | null;
  status?: 'APPROVED' | 'REJECTED';
  notes?: string | null;
  followUpAt?: string | null;
};

/** PATCH a set of jobs; an optional `undo` restores the previous values from the toast. */
export async function patchJobs(
  ids: number[],
  set: JobSet,
  opts: { success?: string; undo?: () => Promise<unknown>; onDone?: () => void } = {},
): Promise<boolean> {
  try {
    await api('/api/admin/jobs', { method: 'PATCH', json: { ids, set } });
    toast.success(opts.success ?? `Updated ${ids.length} job${ids.length === 1 ? '' : 's'}`, {
      action: opts.undo
        ? {
            label: 'Undo',
            onClick: () => {
              void opts.undo!().then(() => opts.onDone?.());
            },
          }
        : undefined,
    });
    opts.onDone?.();
    return true;
  } catch (e) {
    toast.error(errorMessage(e));
    return false;
  }
}

export function stageLabel(stage: JobStage | null): string {
  return STAGE_META[stage ?? 'NONE'].label;
}

export async function reanalyzeJobs(ids: number[], onDone?: () => void): Promise<void> {
  const run = api<{ analyzed: number; approved: number; rejected: number; remaining: number; rateLimited?: boolean; rateLimitReason?: string }>(
    '/api/admin/jobs/reanalyze',
    { method: 'POST', json: { ids } },
  );
  toast.promise(run, {
    loading: `Re-analyzing ${ids.length} job${ids.length === 1 ? '' : 's'}…`,
    success: (r) =>
      r.rateLimited
        ? `AI rate-limited — ${r.analyzed} judged, the rest stay pending (${r.rateLimitReason ?? ''})`
        : `Re-analyzed ${r.analyzed}: ${r.approved} approved, ${r.rejected} rejected`,
    error: (e) => `Re-analyze failed: ${errorMessage(e)}`,
  });
  try {
    await run;
  } finally {
    onDone?.();
  }
}

export async function deleteJobs(ids: number[]): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const r = await api<{ deleted: number }>('/api/admin/jobs', { method: 'DELETE', json: { ids } });
    return { ok: true, message: `Deleted ${r.deleted} job${r.deleted === 1 ? '' : 's'}` };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
