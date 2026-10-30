'use client';

import { toast } from 'sonner';

import { api, errorMessage } from '@/lib/clientApi';
import { formatNumber, type CloseReason, type JobStage } from '@/lib/format';

// Changes to applications that the Applications board, Next actions and the
// job panel share, each undoable from its message.

// Long enough to read the toast and still reach its Undo.
export const UNDO_TOAST_MS = 8000;

/** An undo that runs once, however many ways it is reached (its toast, a key). */
export function once(undo: () => Promise<void>): () => Promise<void> {
  let used = false;
  return async () => {
    if (used) return;
    used = true;
    await undo();
  };
}

/** What an application was before a change, for Undo. */
export type Before = { id: number; stage: JobStage; closeReason: CloseReason | null; followUpAt: string | null };

export function plural(n: number, word: string): string {
  return `${formatNumber(n)} ${word}${n === 1 ? '' : 's'}`;
}

/** Puts applications back as they were (one request per earlier state). */
export async function restoreJobs(before: Before[]): Promise<boolean> {
  const groups = new Map<string, Before[]>();
  for (const b of before) {
    const key = `${b.stage}|${b.closeReason ?? ''}|${b.followUpAt ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  try {
    for (const list of groups.values()) {
      const b = list[0];
      await api('/api/admin/jobs', {
        method: 'PATCH',
        json: {
          ids: list.map((x) => x.id),
          set: { stage: b.stage, followUpAt: b.followUpAt, ...(b.stage === 'ARCHIVED' ? { closeReason: b.closeReason } : {}) },
        },
      });
    }
    toast.success(`Undone: ${plural(before.length, 'application')} back as they were`);
    return true;
  } catch (e) {
    toast.error(errorMessage(e));
    return false;
  }
}

type FollowedUp = { updated: number; days: number | null; at: string };

/** Takes back a "Followed up" (its timeline entries go, the earlier follow-up dates return). */
export async function undoFollowedUp(ids: number[], at: string): Promise<boolean> {
  try {
    await api('/api/admin/next-actions', { method: 'POST', json: { action: 'undo_followed_up', ids, at } });
    toast.success('Undone: back as they were');
    return true;
  } catch (e) {
    toast.error(errorMessage(e));
    return false;
  }
}

/**
 * "Followed up" on Applied or Interview jobs: on their timelines, with the next reminder their user's follow-up days
 * from now. The toast's Undo takes it back. Returns the undo, or null when it failed.
 */
export async function markFollowedUp(ids: number[], onDone: () => void): Promise<(() => Promise<void>) | null> {
  try {
    const r = await api<FollowedUp>('/api/admin/next-actions', { method: 'POST', json: { action: 'followed_up', ids } });
    const undo = once(async () => {
      await undoFollowedUp(ids, r.at);
      onDone();
    });
    const what = r.updated === 1 ? 'Followed up' : `Followed up on ${plural(r.updated, 'application')}`;
    toast.success(r.days != null ? `${what} · next reminder in ${plural(r.days, 'day')}` : what, {
      action: { label: 'Undo', onClick: () => void undo() },
      duration: UNDO_TOAST_MS,
    });
    onDone();
    return undo;
  } catch (e) {
    toast.error(errorMessage(e));
    return null;
  }
}
