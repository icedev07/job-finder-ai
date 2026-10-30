'use client';

import { useViewing } from '@/components/shell/viewing';
import { CLOSE_REASON_LABEL, formatDate, formatDateTime, isCloseReason, isJobStage, STAGE_META } from '@/lib/format';
import { cn } from '@/lib/utils';

/** An application's timeline event, as the job API returns it (lib/applicationEvents.ts). */
export type TimelineEvent = {
  id: number;
  kind: 'stage' | 'reason' | 'follow_up' | 'note' | 'applied';
  fromStage: string | null;
  toStage: string | null;
  detail: Record<string, unknown>;
  actorId: number | null;
  via: 'dashboard' | 'extension' | 'app';
  createdAt: string;
};

function stageLabel(stage: string | null): string {
  return isJobStage(stage) ? STAGE_META[stage].label : STAGE_META.NONE.label;
}

function reasonLabel(reason: unknown): string | null {
  return isCloseReason(reason) ? CLOSE_REASON_LABEL[reason] : null;
}

/** What happened, in one line. */
export function eventText(e: TimelineEvent): string {
  const d = e.detail;
  const followUp = typeof d.followUpAt === 'string' ? ` · follow up ${formatDate(d.followUpAt)}` : '';
  switch (e.kind) {
    case 'stage': {
      if (d.imported) return `${stageLabel(e.toStage)} (recorded before the timeline started)`;
      if (d.approved) return 'Saved: approved by hand';
      if (d.undone) return 'Left Saved: the approval in Review was undone';
      const reason = reasonLabel(d.reason);
      const move =
        e.fromStage == null
          ? `Added to ${stageLabel(e.toStage)}`
          : e.toStage == null
            ? `Left the pipeline (was ${stageLabel(e.fromStage)})`
            : `${stageLabel(e.fromStage)} → ${stageLabel(e.toStage)}`;
      return `${move}${reason ? ` · ${reason}` : ''}${followUp}`;
    }
    case 'reason': {
      const reason = reasonLabel(d.reason);
      return reason ? `Close reason: ${reason}` : 'Close reason cleared';
    }
    case 'follow_up':
      return typeof d.at === 'string' ? `Follow-up set for ${formatDate(d.at)}` : 'Follow-up cleared';
    case 'note':
      return d.cleared ? 'Notes cleared' : `Note: “${String(d.text ?? '')}${d.more ? '…' : ''}”`;
    case 'applied': {
      const parts = ['Marked as applied'];
      if (typeof d.resumeName === 'string' && d.resumeName) parts.push(`with ${d.resumeName}`);
      let text = parts.join(' ');
      if (typeof d.answers === 'number' && d.answers > 0) text += ` · ${d.answers} answer${d.answers === 1 ? '' : 's'}`;
      if (d.created) text += ' · the job was added';
      if (e.fromStage === e.toStage && e.toStage && e.toStage !== 'APPLIED') text += ` · stays at ${stageLabel(e.toStage)}`;
      return `${text}${followUp}`;
    }
    default:
      return e.kind;
  }
}

/** Every stage change, close reason, follow-up date, note and "Mark as applied", newest first, with who did it. */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  const { userName } = useViewing();
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing yet: moves, follow-ups and notes show up here.</p>;
  }
  const who = (e: TimelineEvent) => {
    if (e.detail.imported) return null;
    if (e.via === 'app' || e.actorId == null) return 'Job Finder';
    return e.via === 'extension' ? `${userName(e.actorId)} in the extension` : userName(e.actorId);
  };
  return (
    <ol className="relative space-y-3 border-l pl-4" aria-label="Timeline">
      {events.map((e) => {
        const stage = e.kind === 'stage' || e.kind === 'applied' ? e.toStage : null;
        const by = who(e);
        return (
          <li key={e.id} className="relative text-sm">
            <span
              className={cn(
                'absolute top-1.5 -left-[1.3rem] size-2 rounded-full ring-2 ring-background',
                isJobStage(stage) ? STAGE_META[stage].dot : 'bg-muted-foreground/50',
              )}
              aria-hidden
            />
            <p className="leading-snug">{eventText(e)}</p>
            <p className="text-xs text-muted-foreground">
              {by ? `${by} · ` : ''}
              <time dateTime={e.createdAt}>{formatDateTime(e.createdAt)}</time>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
