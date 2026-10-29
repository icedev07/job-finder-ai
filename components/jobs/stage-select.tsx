'use client';

import { useState } from 'react';

import { patchJobs, stageLabel } from '@/components/jobs/job-commands';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/clientApi';
import { JOB_STAGES, STAGE_META, type JobStage } from '@/lib/format';
import { cn } from '@/lib/utils';

const OPTIONS = ['NONE', ...JOB_STAGES] as const;
const ITEMS = OPTIONS.map((s) => ({ value: s, label: STAGE_META[s].label }));

/** Inline pipeline-stage picker with an optimistic value and an Undo toast. */
export function StageSelect({
  jobId,
  stage,
  onChanged,
  size = 'sm',
  className = 'min-w-30',
}: {
  jobId: number;
  stage: JobStage | null;
  onChanged?: () => void;
  size?: 'sm' | 'default';
  className?: string;
}) {
  const [optimistic, setOptimistic] = useState<JobStage | null | undefined>(undefined);
  const [lastStage, setLastStage] = useState(stage);
  if (stage !== lastStage) {
    // Fresh data arrived: drop the optimistic value.
    setLastStage(stage);
    setOptimistic(undefined);
  }
  const value = optimistic !== undefined ? optimistic : stage;

  async function change(raw: string) {
    const next = raw === 'NONE' ? null : (raw as JobStage);
    if (next === value) return;
    const previous = value;
    setOptimistic(next);
    const ok = await patchJobs([jobId], { stage: next }, {
      success: `Moved to ${stageLabel(next)}`,
      undo: () => api('/api/admin/jobs', { method: 'PATCH', json: { ids: [jobId], set: { stage: previous } } }),
      onDone: onChanged,
    });
    if (!ok) setOptimistic(undefined);
  }

  return (
    <Select items={ITEMS} value={value ?? 'NONE'} onValueChange={(v) => void change(String(v))}>
      <SelectTrigger
        size={size}
        aria-label="Pipeline stage"
        className={cn('gap-1', className)}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={cn('size-2 shrink-0 rounded-full', STAGE_META[value ?? 'NONE'].dot)} aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((s) => (
          <SelectItem key={s} value={s}>
            <span className={cn('size-2 rounded-full', STAGE_META[s].dot)} aria-hidden />
            {STAGE_META[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
