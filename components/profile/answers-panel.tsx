'use client';

import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmButton } from '@/components/common/confirm-button';
import { SectionCard } from '@/components/common/section-card';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/clientApi';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';

type Answer = { id: number; question: string; answer: string; tags: string | null; uses: number; updatedAt: string };

function AnswerEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Answer;
  onSave: (v: { question: string; answer: string; tags: string }) => Promise<void>;
  onCancel?: () => void;
}) {
  const [question, setQuestion] = useState(initial?.question ?? '');
  const [answer, setAnswer] = useState(initial?.answer ?? '');
  const [tags, setTags] = useState(initial?.tags ?? '');
  const [saving, setSaving] = useState(false);
  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label>Question</Label>
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Why do you want to work here?" />
      </div>
      <div className="space-y-1.5">
        <Label>Your answer</Label>
        <Textarea rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Tags (optional)</Label>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="motivation, remote" />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={saving || !question.trim() || !answer.trim()}
          onClick={async () => {
            setSaving(true);
            await onSave({ question, answer, tags });
            setSaving(false);
          }}
        >
          {saving ? <Spinner /> : null}
          Save
        </Button>
        {onCancel ? (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Answers to recurring application questions. Autofill reuses a saved answer when a form asks a similar question,
 * and the AI uses them as examples of your voice when drafting new ones.
 */
export function AnswersPanel() {
  const [answers, setAnswers] = useState<Answer[] | null>(null);
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ answers: Answer[]; error?: string }>('/api/admin/answers');
      setAnswers(r.answers);
      setError(r.error ?? null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useLoadOnMount(load);

  async function save(id: number | 'new', v: { question: string; answer: string; tags: string }) {
    try {
      if (id === 'new') await api('/api/admin/answers', { method: 'POST', json: v });
      else await api(`/api/admin/answers/${id}`, { method: 'PATCH', json: v });
      toast.success('Answer saved');
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <SectionCard
      title="Answer bank"
      description="Your answers to questions forms keep asking. Autofill reuses them and the AI copies your voice from them. When you keep an AI-drafted answer in the extension, it is saved here."
      actions={
        editing !== 'new' ? (
          <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
            <PlusIcon />
            Add an answer
          </Button>
        ) : null
      }
    >
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {editing === 'new' ? (
        <div className="rounded-lg border p-3">
          <AnswerEditor onSave={(v) => save('new', v)} onCancel={() => setEditing(null)} />
        </div>
      ) : null}
      {!answers ? (
        <Spinner />
      ) : answers.length === 0 && editing !== 'new' ? (
        <Empty className="py-8">
          <EmptyHeader>
            <EmptyTitle>No saved answers yet</EmptyTitle>
            <EmptyDescription>Add answers for “Why this company?”, “Notice period?”, “Expected salary?”…</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="space-y-2">
          {answers.map((a) => (
            <li key={a.id} className="rounded-lg border p-3">
              {editing === a.id ? (
                <AnswerEditor initial={a} onSave={(v) => save(a.id, v)} onCancel={() => setEditing(null)} />
              ) : (
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium">{a.question}</p>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{a.answer}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.tags ? `${a.tags} · ` : ''}used {a.uses}×
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setEditing(a.id)}>
                      <PencilIcon />
                    </Button>
                    <ConfirmButton
                      size="icon-sm"
                      variant="ghost"
                      destructive
                      title="Delete this answer?"
                      confirmLabel="Delete"
                      onConfirm={async () => {
                        try {
                          await api(`/api/admin/answers/${a.id}`, { method: 'DELETE' });
                          await load();
                          return { ok: true, message: 'Deleted' };
                        } catch (e) {
                          return { ok: false, error: errorMessage(e) };
                        }
                      }}
                    >
                      <Trash2Icon />
                    </ConfirmButton>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
