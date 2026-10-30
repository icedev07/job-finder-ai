'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CLOSE_REASON_LABEL, type CloseReason } from '@/lib/format';

import type { Destination } from './types';

/** The reasons offered when closing: Rejected moves to its own column, the rest to Archived. */
export const CLOSE_CHOICES: { reason: CloseReason; hint: string; to: Destination }[] = [
  { reason: 'REJECTED', hint: 'They said no', to: { stage: 'REJECTED' } },
  { reason: 'WITHDREW', hint: 'You stopped', to: { stage: 'ARCHIVED', closeReason: 'WITHDREW' } },
  { reason: 'POSITION_CLOSED', hint: 'Filled or taken down', to: { stage: 'ARCHIVED', closeReason: 'POSITION_CLOSED' } },
  { reason: 'NO_RESPONSE', hint: 'They never answered', to: { stage: 'ARCHIVED', closeReason: 'NO_RESPONSE' } },
];

/** "Why did it close?" before cards go to Archived: one click per reason, or none. */
export function CloseDialog({
  count,
  onClose,
  onChoose,
}: {
  /** How many applications are closing; 0 = the dialog is shut. */
  count: number;
  onClose: () => void;
  onChoose: (to: Destination) => void;
}) {
  return (
    <Dialog open={count > 0} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Why did {count === 1 ? 'it' : `these ${count}`} close?</DialogTitle>
          <DialogDescription>
            The reason shows on the card, in the timeline and in the Google Sheet&apos;s Stage column.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          {CLOSE_CHOICES.map((c) => (
            <Button key={c.reason} variant="outline" className="h-auto flex-col items-start gap-0.5 py-2 text-left" onClick={() => onChoose(c.to)}>
              <span>{CLOSE_REASON_LABEL[c.reason]}</span>
              <span className="text-xs font-normal text-muted-foreground">{c.hint}</span>
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => onChoose({ stage: 'ARCHIVED', closeReason: null })}>
            Archive without a reason
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
