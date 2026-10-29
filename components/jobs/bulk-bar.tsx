'use client';

import {
  CheckIcon,
  ChevronDownIcon,
  RefreshCwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Trash2Icon,
  XIcon,
  BanIcon,
} from 'lucide-react';

import { ConfirmButton } from '@/components/common/confirm-button';
import { deleteJobs, patchJobs, reanalyzeJobs, stageLabel } from '@/components/jobs/job-commands';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { JOB_STAGES, STAGE_META } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Floating action bar for the selected jobs. */
export function BulkBar({ ids, onClear, onChanged }: { ids: number[]; onClear: () => void; onChanged: () => void }) {
  if (ids.length === 0) return null;
  const n = ids.length;
  const done = () => {
    onClear();
    onChanged();
  };
  return (
    <div
      role="toolbar"
      aria-label={`${n} selected jobs`}
      className="sticky bottom-3 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border bg-popover/95 p-1.5 text-sm shadow-lg backdrop-blur supports-backdrop-filter:bg-popover/80"
    >
      <span className="tabular px-2 font-medium" aria-live="polite">
        {n} selected
      </span>
      <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Clear selection">
        <XIcon />
      </Button>
      <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
          Stage
          <ChevronDownIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Move {n} to…</DropdownMenuLabel>
            {([null, ...JOB_STAGES] as const).map((s) => (
              <DropdownMenuItem
                key={s ?? 'none'}
                onClick={() => void patchJobs(ids, { stage: s }, { success: `Moved ${n} to ${stageLabel(s)}`, onDone: done })}
              >
                <span className={cn('size-2 rounded-full', STAGE_META[s ?? 'NONE'].dot)} aria-hidden />
                {STAGE_META[s ?? 'NONE'].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void patchJobs(ids, { status: 'APPROVED' }, { success: `Approved ${n} by hand`, onDone: done })}
      >
        <CheckIcon />
        Approve
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void patchJobs(ids, { status: 'REJECTED' }, { success: `Rejected ${n} by hand`, onDone: done })}
      >
        <BanIcon />
        Reject
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Mark as good matches"
        onClick={() => void patchJobs(ids, { feedback: 1 }, { success: `👍 on ${n}`, onDone: done })}
      >
        <ThumbsUpIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Mark as bad matches"
        onClick={() => void patchJobs(ids, { feedback: -1 }, { success: `👎 on ${n}`, onDone: done })}
      >
        <ThumbsDownIcon />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={n > 60}
        title={n > 60 ? 'Re-analyze at most 60 jobs at a time' : undefined}
        onClick={() => void reanalyzeJobs(ids, done)}
      >
        <RefreshCwIcon />
        Re-analyze
      </Button>
      <ConfirmButton
        variant="ghost"
        size="sm"
        destructive
        title={`Delete ${n} job${n === 1 ? '' : 's'}?`}
        description="They are removed from the database with their AI history. A later scan may find them again."
        confirmLabel="Delete"
        onConfirm={async () => {
          const r = await deleteJobs(ids);
          if (r.ok) done();
          return r;
        }}
      >
        <Trash2Icon />
        Delete
      </ConfirmButton>
    </div>
  );
}
