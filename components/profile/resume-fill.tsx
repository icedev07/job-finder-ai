'use client';

import { SparklesIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { SectionCard } from '@/components/common/section-card';
import { ResumeFilePicker } from '@/components/profile/resume-file-picker';
import type { ApplyResume, MergeMode } from '@/components/profile/resumes-panel';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/clientApi';
import { listResumes, readStoredResume, uploadResume, type ResumeItem } from '@/lib/resumeClient';
import { resumeNameOf } from '@/lib/resumeFiles';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';

const NEW = 'new';

export type FillResult = { from: string; filled: string[]; mode: MergeMode };

function resultText({ from, filled, mode }: FillResult): string {
  if (filled.length) return `Filled from “${from}”: ${filled.join(', ')}. Review them below, then save.`;
  return mode === 'fill'
    ? `“${from}” has nothing the profile is missing. Replace filled fields copies its facts over what is there.`
    : `The profile already has everything in “${from}”.`;
}

/**
 * The top of the Profile tab: the AI reads one of the user's resumes (or one uploaded here, which joins them) and
 * its facts go into the profile, for the admin to review and save. A resume read before fills at once.
 */
export function ResumeFill({ onApply, last }: { onApply: ApplyResume; last: FillResult | null }) {
  const [resumes, setResumes] = useState<ResumeItem[] | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setResumes((await listResumes()).resumes);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useLoadOnMount(load);

  // The default resume until another is picked; a new file when there is none.
  const selected = choice ?? (resumes?.length ? String((resumes.find((r) => r.isDefault) ?? resumes[0]).id) : NEW);
  const items = [
    ...(resumes ?? []).map((r) => ({ value: String(r.id), label: r.isDefault ? `${r.name} (default)` : r.name })),
    { value: NEW, label: 'A new resume…' },
  ];

  async function fill(mode: MergeMode) {
    setError(null);
    let id: number;
    let from: string;
    if (selected === NEW) {
      if (!file) {
        fileInput.current?.click();
        return;
      }
      from = resumeNameOf(file.name);
      setBusy(`Uploading “${file.name}”…`);
      try {
        id = (await uploadResume(file)).id;
      } catch (e) {
        setError(errorMessage(e));
        setBusy(null);
        return;
      }
      setFile(null);
      setChoice(String(id));
    } else {
      const resume = resumes?.find((r) => String(r.id) === selected);
      if (!resume) return;
      id = resume.id;
      from = resume.name;
    }
    setBusy(`The AI is reading “${from}”… this can take up to a minute.`);
    try {
      const r = await readStoredResume(id, true);
      onApply(r.profile, mode, from);
    } catch (e) {
      setError(`The AI could not read “${from}”: ${errorMessage(e)}`);
    } finally {
      setBusy(null);
      await load();
    }
  }

  return (
    <SectionCard
      title="Fill in from a resume"
      description="The AI reads the resume (PDF, Word or text) and fills in the name, contact details, headline, summary, skills, languages, experience and education. A resume has no work terms: fill those in below."
    >
      {resumes === null ? (
        <Spinner />
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-2">
            {resumes.length ? (
              <Select items={items} value={selected} onValueChange={(v) => setChoice(String(v))} disabled={!!busy}>
                <SelectTrigger className="w-full sm:w-72" aria-label="The resume to fill in from">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {items.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {selected === NEW ? (
              <div className="w-full sm:max-w-md sm:flex-1">
                <ResumeFilePicker file={file} onFile={setFile} inputRef={fileInput} disabled={!!busy} compact />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void fill('fill')} disabled={!!busy}>
              <SparklesIcon />
              Fill empty fields
            </Button>
            <Button variant="outline" onClick={() => void fill('replace')} disabled={!!busy}>
              Replace filled fields
            </Button>
          </div>
        </>
      )}
      {busy ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          <Spinner />
          {busy}
        </p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : last ? (
        <p className="text-sm" aria-live="polite" data-testid="fill-result">
          {resultText(last)}
        </p>
      ) : null}
    </SectionCard>
  );
}
