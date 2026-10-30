'use client';

import { SparklesIcon, Trash2Icon } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { UNDO_TOAST_MS } from '@/components/applications/application-commands';
import { CopyButton } from '@/components/common/copy-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { claudeModelInfo, PROVIDER_INFO, type ProviderId } from '@/lib/aiRoutes';
import { api, errorMessage } from '@/lib/clientApi';
import { DRAFT_KIND_INFO, DRAFT_KINDS, formatUsd, timeAgo, type DraftKind } from '@/lib/format';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';
import { cn } from '@/lib/utils';

/** A draft as the job API returns it (lib/writing.ts). */
export type Draft = {
  id: number;
  kind: string;
  text: string;
  instructions: string | null;
  resumeId: number | null;
  model: string | null;
  edited: boolean;
  updatedAt: string;
};

/** The job's user's resumes (only one the AI has read can be written from) and the one to start with. */
export type WritingSetup = { resumes: { id: number; name: string; readable: boolean }[]; suggested: number | null };

/** Open Writing on this kind, and write it when there is no draft yet (Next actions). */
export type WritingRequest = { kind: DraftKind; write: boolean };

const PROFILE_ONLY = 'profile';

/** What to start with: what the application needs next. */
function kindFor(stage: string | null): DraftKind {
  if (stage === 'INTERVIEW') return 'interview_prep';
  if (stage === 'SAVED') return 'cover_letter';
  if (stage === 'APPLIED' || stage === 'OFFER' || stage === 'REJECTED' || stage === 'ARCHIVED') return 'follow_up';
  return 'match';
}

/** "Claude Opus 5.5", "Gemini (gemini-2.5-flash)": who wrote a draft, from the route's "provider:model". */
function writer(model: string): string {
  const [provider, ...rest] = model.split(':');
  const id = rest.join(':');
  if (provider === 'claude') return claudeModelInfo(id)?.label ?? id;
  const label = PROVIDER_INFO[provider as ProviderId]?.label ?? provider;
  return id ? `${label} (${id})` : label;
}

type Snapshot = { text: string; instructions: string | null; resumeId: number | null; model: string | null; edited: boolean };

/** The draft's fields to put it back as it was (Undo), with the text as shown (changes not saved yet included). */
function snapshot(d: Draft, text = d.text): Snapshot {
  return { text, instructions: d.instructions, resumeId: d.resumeId, model: d.model, edited: d.edited || text !== d.text };
}

/**
 * Writing for the job's application: the AI drafts a resume match, a cover letter, an intro message, a follow-up or
 * interview prep from the user's profile and resume; each draft can be edited, copied, rewritten with instructions
 * and deleted, and every change can be undone from its message.
 */
export function Writing({
  jobId,
  stage,
  drafts,
  setup,
  request,
}: {
  jobId: number;
  stage: string | null;
  drafts: Draft[];
  setup: WritingSetup;
  request?: WritingRequest | null;
}) {
  // The panel loads them once per job (the sheet keys this by job); from then on the answers here keep them.
  const [list, setList] = useState<Draft[]>(drafts);
  const [kind, setKind] = useState<DraftKind>(request?.kind ?? kindFor(stage));
  const [edits, setEdits] = useState<Partial<Record<DraftKind, string>>>({});
  const [asks, setAsks] = useState<Partial<Record<DraftKind, string>>>({});
  const [resume, setResume] = useState(setup.suggested != null ? String(setup.suggested) : PROFILE_ONLY);
  const [writing, setWriting] = useState<DraftKind | null>(null);
  const section = useRef<HTMLElement>(null);
  const started = useRef(false);

  const draftOf = (k: DraftKind) => list.find((d) => d.kind === k) ?? null;
  const put = (d: Draft) => setList((l) => [...l.filter((x) => x.kind !== d.kind), d]);
  const forget = (k: DraftKind) =>
    setEdits((e) => {
      const next = { ...e };
      delete next[k];
      return next;
    });

  const draft = draftOf(kind);
  const text = edits[kind] ?? draft?.text ?? '';
  const dirty = edits[kind] !== undefined && edits[kind] !== (draft?.text ?? '');
  const ask = asks[kind] ?? draft?.instructions ?? '';
  const label = DRAFT_KIND_INFO[kind].label;
  const name = label.toLowerCase();
  const resumeName = (id: number | null) =>
    id == null ? null : (setup.resumes.find((r) => r.id === id)?.name ?? 'a deleted resume');

  /** Undo: the draft as it was (null: there was none). */
  async function restore(k: DraftKind, before: Snapshot | null) {
    try {
      if (before) {
        const r = await api<{ draft: Draft }>(`/api/admin/jobs/${jobId}/drafts/${k}`, { method: 'PUT', json: before });
        put(r.draft);
      } else {
        await api(`/api/admin/jobs/${jobId}/drafts/${k}`, { method: 'DELETE' });
        setList((l) => l.filter((x) => x.kind !== k));
      }
      forget(k);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function write(k: DraftKind, instructions: string, before: Snapshot | null) {
    setWriting(k);
    try {
      const r = await api<{ draft: Draft; costUsd: number | null }>(`/api/admin/jobs/${jobId}/drafts/${k}`, {
        method: 'POST',
        json: { instructions: instructions.trim() || null, resumeId: resume === PROFILE_ONLY ? null : Number(resume) },
      });
      put(r.draft);
      forget(k);
      const cost = r.costUsd ? ` · ${formatUsd(r.costUsd)}` : '';
      toast.success(`${DRAFT_KIND_INFO[k].label} written${cost}`, { duration: UNDO_TOAST_MS, action: { label: 'Undo', onClick: () => void restore(k, before) } });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setWriting(null);
    }
  }

  // From Next actions: bring Writing into view, and write the draft asked for unless there is one (once).
  useLoadOnMount(() => {
    if (started.current || !request) return;
    started.current = true;
    section.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    if (request.write && !list.some((d) => d.kind === request.kind)) void write(request.kind, '', null);
  });

  async function save() {
    const k = kind;
    const before = draft ? snapshot(draft) : null;
    try {
      const r = await api<{ draft: Draft }>(`/api/admin/jobs/${jobId}/drafts/${k}`, { method: 'PUT', json: { text } });
      put(r.draft);
      forget(k);
      toast.success(`${label} saved`, { duration: UNDO_TOAST_MS, action: { label: 'Undo', onClick: () => void restore(k, before) } });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove() {
    if (!draft) return;
    const k = kind;
    const before = snapshot(draft, text);
    try {
      await api(`/api/admin/jobs/${jobId}/drafts/${k}`, { method: 'DELETE' });
      setList((l) => l.filter((x) => x.kind !== k));
      forget(k);
      toast.success(`${label} deleted`, { duration: UNDO_TOAST_MS, action: { label: 'Undo', onClick: () => void restore(k, before) } });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  /** Write (or write again) the shown kind; Undo brings back what was there, typed text included. */
  function rewrite() {
    const before: Snapshot | null = draft
      ? snapshot(draft, text)
      : text.trim()
        ? { text, instructions: null, resumeId: null, model: null, edited: true }
        : null;
    void write(kind, ask, before);
  }
  const busy = writing != null;

  return (
    <section ref={section} className="scroll-mt-4 space-y-3" aria-labelledby="writing-title">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="writing-title" className="text-sm font-semibold">
          Writing
        </h3>
        {setup.resumes.length ? (
          <div className="ml-auto flex items-center gap-2">
            <Label htmlFor="draft-resume" className="text-xs font-normal text-muted-foreground">
              Write from
            </Label>
            <Select
              items={[
                { value: PROFILE_ONLY, label: 'The profile only' },
                ...setup.resumes.map((r) => ({ value: String(r.id), label: r.readable ? r.name : `${r.name} (not read yet)` })),
              ]}
              value={resume}
              onValueChange={(v) => v != null && setResume(String(v))}
            >
              <SelectTrigger id="draft-resume" size="sm" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PROFILE_ONLY}>The profile only</SelectItem>
                {setup.resumes.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)} disabled={!r.readable}>
                    {r.readable ? r.name : `${r.name} (not read yet)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div role="group" aria-label="What to write" className="flex flex-wrap gap-1">
        {DRAFT_KINDS.map((k) => {
          const has = list.some((d) => d.kind === k);
          return (
            <Button
              key={k}
              size="sm"
              variant={k === kind ? 'secondary' : 'ghost'}
              aria-pressed={k === kind}
              data-draft-kind={k}
              onClick={() => setKind(k)}
              className={cn(k === kind && 'ring-1 ring-border')}
            >
              {DRAFT_KIND_INFO[k].label}
              {has ? (
                <>
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                  <span className="sr-only"> (written)</span>
                </>
              ) : null}
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{DRAFT_KIND_INFO[kind].hint}</p>

      <Label htmlFor="draft-text" className="sr-only">
        {label}
      </Label>
      <Textarea
        id="draft-text"
        value={text}
        disabled={busy}
        onChange={(e) => setEdits((x) => ({ ...x, [kind]: e.target.value }))}
        placeholder={`No ${name} yet. Write it with AI, or type your own here and save it.`}
        className="max-h-[32rem] min-h-28 overflow-y-auto leading-relaxed"
      />
      {draft ? (
        <p className="text-xs text-muted-foreground" data-testid="draft-meta">
          {draft.model ? `Written by ${writer(draft.model)}` : 'Written by hand'} · {timeAgo(draft.updatedAt)}
          {draft.model ? (draft.resumeId != null ? ` · from the resume “${resumeName(draft.resumeId)}”` : ' · from the profile') : ''}
          {draft.model && draft.edited ? ' · edited' : ''}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="draft-instructions" className="text-xs">
          Instructions for the AI (optional)
        </Label>
        <Input
          id="draft-instructions"
          value={ask}
          disabled={busy}
          maxLength={1000}
          onChange={(e) => setAsks((x) => ({ ...x, [kind]: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !busy) {
              e.preventDefault();
              rewrite();
            }
          }}
          placeholder="e.g. shorter, more formal, mention the Kafka project, in German"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={draft ? 'outline' : 'default'} disabled={busy} onClick={rewrite}>
          {writing === kind ? <Spinner /> : <SparklesIcon />}
          {writing === kind ? 'Writing…' : draft ? 'Rewrite' : `Write the ${name}`}
        </Button>
        {text.trim() ? <CopyButton value={text} label="Copy" size="sm" variant="outline" /> : null}
        {dirty && text.trim() ? (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void save()}>
              Save
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => forget(kind)}>
              Discard changes
            </Button>
          </>
        ) : null}
        {draft ? (
          <Button size="icon-sm" variant="ghost" className="ml-auto" disabled={busy} aria-label={`Delete the ${name}`} onClick={() => void remove()}>
            <Trash2Icon />
          </Button>
        ) : null}
      </div>
      {writing ? (
        <p className="text-xs text-muted-foreground" role="status">
          Writing the {DRAFT_KIND_INFO[writing].label.toLowerCase()}: this can take up to a minute.
        </p>
      ) : null}
    </section>
  );
}
