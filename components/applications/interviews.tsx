'use client';

import { CalendarPlusIcon, ExternalLinkIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/clientApi';
import {
  formatWhen,
  INTERVIEW_KIND_LABEL,
  INTERVIEW_KINDS,
  interviewName,
  isInterviewKind,
  safeHref,
  timeAgo,
  type InterviewKind,
} from '@/lib/format';
import { cn } from '@/lib/utils';

/** An interview as the job API returns it (lib/interviews.ts). */
export type Interview = { id: number; jobId: number; at: string; kind: string; link: string | null; notes: string | null };

const KIND_ITEMS = INTERVIEW_KINDS.map((k) => ({ value: k, label: INTERVIEW_KIND_LABEL[k] }));

function kindOf(kind: string): InterviewKind {
  return isInterviewKind(kind) ? kind : 'OTHER';
}

/** An ISO time as the date and time inputs show it, in this browser's time zone. */
function localParts(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

/** Where to join: a link opens in a new tab, anything else (an address) is shown as it is. */
export function InterviewLink({ link, className }: { link: string | null; className?: string }) {
  if (!link) return null;
  const href = safeHref(link);
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn('inline-flex min-w-0 items-center gap-1 text-primary hover:underline', className)}
    >
      <ExternalLinkIcon className="size-3.5 shrink-0" />
      <span className="truncate">{new URL(href).host}</span>
    </a>
  ) : (
    <span className={cn('min-w-0 truncate', className)}>{link}</span>
  );
}

/**
 * The job's interviews, first one first, with Add, Edit and Remove (undone from its message). Adding one moves the
 * application to Interview and its follow-up after the interview (while Applications is on for the job's user).
 */
export function Interviews({ jobId, interviews, onChanged }: { jobId: number; interviews: Interview[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  // Past interviews are greyed: past as of when the job's panel opened.
  const [now] = useState(() => Date.now());

  async function remove(i: Interview) {
    try {
      await api(`/api/admin/interviews/${i.id}`, { method: 'DELETE' });
      toast.success(`Removed the ${interviewName(i.kind).toLowerCase()} on ${formatWhen(i.at)}`, {
        action: {
          label: 'Undo',
          onClick: () =>
            void api(`/api/admin/jobs/${jobId}/interviews`, {
              method: 'POST',
              json: { at: i.at, kind: i.kind, link: i.link, notes: i.notes },
            })
              .then(onChanged)
              .catch((e) => toast.error(errorMessage(e))),
        },
      });
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const done = () => {
    setEditing(null);
    onChanged();
  };

  return (
    <section className="space-y-2" aria-labelledby="interviews-title">
      <div className="flex items-center gap-2">
        <h3 id="interviews-title" className="text-sm font-semibold">
          Interviews
        </h3>
        {editing !== 'new' ? (
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setEditing('new')}>
            <CalendarPlusIcon />
            Add interview
          </Button>
        ) : null}
      </div>
      {editing === 'new' ? (
        <InterviewForm
          jobId={jobId}
          defaultKind={interviews.length ? 'TECHNICAL' : 'HR'}
          onDone={done}
          onCancel={() => setEditing(null)}
        />
      ) : null}
      {interviews.length === 0 && editing !== 'new' ? (
        <p className="text-sm text-muted-foreground">None yet. Adding one moves the application to Interview.</p>
      ) : null}
      {interviews.length ? (
        <ul className="space-y-2">
          {interviews.map((i) => {
            const past = new Date(i.at).getTime() < now;
            const when = formatWhen(i.at);
            return editing === i.id ? (
              <li key={i.id}>
                <InterviewForm jobId={jobId} initial={i} defaultKind={kindOf(i.kind)} onDone={done} onCancel={() => setEditing(null)} />
              </li>
            ) : (
              <li key={i.id} data-interview-id={i.id} className={cn('space-y-1 rounded-lg border p-2.5 text-sm', past && 'bg-muted/30')}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={cn('font-medium', past && 'text-muted-foreground')}>{when}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(i.at)}</span>
                  <Badge variant="outline">{INTERVIEW_KIND_LABEL[kindOf(i.kind)]}</Badge>
                  <span className="ml-auto flex gap-0.5">
                    <Button size="icon-xs" variant="ghost" aria-label={`Edit the interview on ${when}`} onClick={() => setEditing(i.id)}>
                      <PencilIcon />
                    </Button>
                    <Button size="icon-xs" variant="ghost" aria-label={`Remove the interview on ${when}`} onClick={() => void remove(i)}>
                      <Trash2Icon />
                    </Button>
                  </span>
                </div>
                <InterviewLink link={i.link} className="max-w-full text-sm" />
                {i.notes ? <p className="whitespace-pre-wrap text-muted-foreground">{i.notes}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function InterviewForm({
  jobId,
  initial,
  defaultKind,
  onDone,
  onCancel,
}: {
  jobId: number;
  initial?: Interview;
  defaultKind: InterviewKind;
  onDone: () => void;
  onCancel: () => void;
}) {
  const start = localParts(initial?.at ?? null);
  const [date, setDate] = useState(start.date);
  const [time, setTime] = useState(start.time || '10:00');
  const [kind, setKind] = useState<InterviewKind>(defaultKind);
  const [link, setLink] = useState(initial?.link ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function save(e: FormEvent) {
    e.preventDefault();
    const at = new Date(`${date}T${time}`);
    if (!date || !time || Number.isNaN(at.getTime())) {
      setError('Pick a date and a time.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const json = { at: at.toISOString(), kind, link: link.trim() || null, notes: notes.trim() || null };
      if (initial) await api(`/api/admin/interviews/${initial.id}`, { method: 'PATCH', json });
      else await api(`/api/admin/jobs/${jobId}/interviews`, { method: 'POST', json });
      toast.success(initial ? 'Interview saved' : `${interviewName(kind)} added for ${formatWhen(at)}`);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void save(e)}
      aria-label={initial ? 'Edit the interview' : 'New interview'}
      className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2"
    >
      <div className="space-y-1.5">
        <Label htmlFor="interview-date">Date</Label>
        <Input id="interview-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="interview-time">Time</Label>
        <Input id="interview-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="interview-kind">Kind</Label>
        <Select items={KIND_ITEMS} value={kind} onValueChange={(v) => isInterviewKind(v) && setKind(v)}>
          <SelectTrigger id="interview-kind" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KIND_ITEMS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="interview-link">Link or address</Label>
        <Input id="interview-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/…" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="interview-notes">Notes</Label>
        <Textarea
          id="interview-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Who you meet, what to prepare…"
        />
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">Times are in your time zone ({zone}).</p>
      {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Spinner /> : null}
          {initial ? 'Save' : 'Add interview'}
        </Button>
      </div>
    </form>
  );
}
