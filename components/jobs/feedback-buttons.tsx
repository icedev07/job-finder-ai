'use client';

import { ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react';
import { useState } from 'react';

import { patchJobs } from '@/components/jobs/job-commands';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 👍 / 👎 on the AI verdict. Feedback never changes the job's status by itself; it is the truth set for the
 * AI Evaluations tab. Clicking the active thumb clears it.
 */
export function FeedbackButtons({
  jobId,
  feedback,
  onChanged,
}: {
  jobId: number;
  feedback: number | null;
  onChanged?: () => void;
}) {
  const [optimistic, setOptimistic] = useState<number | null | undefined>(undefined);
  const [last, setLast] = useState(feedback);
  if (feedback !== last) {
    setLast(feedback);
    setOptimistic(undefined);
  }
  const value = optimistic !== undefined ? optimistic : feedback;

  async function set(next: 1 | -1) {
    const target = value === next ? null : next;
    setOptimistic(target);
    const ok = await patchJobs([jobId], { feedback: target }, {
      success: target === null ? 'Feedback cleared' : target === 1 ? 'Marked as a good match' : 'Marked as a bad match',
      onDone: onChanged,
    });
    if (!ok) setOptimistic(undefined);
  }

  return (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Good match"
        aria-pressed={value === 1}
        onClick={() => void set(1)}
        className={cn(value === 1 && 'bg-tier-match/15 text-tier-match-ink')}
      >
        <ThumbsUpIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Bad match"
        aria-pressed={value === -1}
        onClick={() => void set(-1)}
        className={cn(value === -1 && 'bg-destructive/10 text-destructive')}
      >
        <ThumbsDownIcon />
      </Button>
    </div>
  );
}
