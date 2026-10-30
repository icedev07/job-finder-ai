'use client';

import { CheckIcon, DownloadIcon, FileTextIcon, PencilIcon, SparklesIcon, StarIcon, Trash2Icon, UploadIcon, XIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmButton } from '@/components/common/confirm-button';
import { SectionCard } from '@/components/common/section-card';
import { ResumeFilePicker } from '@/components/profile/resume-file-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { modelLabel } from '@/lib/aiRoutes';
import { api, errorMessage, viewingParam } from '@/lib/clientApi';
import { formatBytes, formatUsd, timeAgo } from '@/lib/format';
import { fullName, type CandidateProfile } from '@/lib/profileModel';
import { listResumes, readStoredResume, uploadResume, type ResumeItem, type ResumeReading } from '@/lib/resumeClient';
import { resumeNameOf } from '@/lib/resumeFiles';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';

export type MergeMode = 'fill' | 'replace';

/** Copies a resume's facts into the profile being edited; returns what it filled. */
export type ApplyResume = (extracted: CandidateProfile, mode: MergeMode, from: string) => string[];

/** "Filled 11 fields from …: review them on the Profile tab, then save", or why nothing was. */
export function filledMessage(filled: string[], from: string, mode: MergeMode): string {
  if (filled.length) return `Filled ${filled.length} ${filled.length === 1 ? 'field' : 'fields'} from “${from}”: review them on the Profile tab, then save`;
  return mode === 'fill'
    ? `“${from}” has nothing the profile is missing: Replace profile fields copies its facts over what is there`
    : `The profile already has everything in “${from}”`;
}

/** Resume variants: upload, the default, names and tags for auto-pick, and what Claude reads in one into the profile. */
export function ResumesPanel({
  onApply,
  profileIncomplete,
  onShowProfile,
}: {
  onApply: ApplyResume;
  /** The profile misses key fields: fill it from the next upload unless unticked. */
  profileIncomplete: boolean;
  onShowProfile: () => void;
}) {
  const [resumes, setResumes] = useState<ResumeItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  // The name the last chosen file gave the variant: a new file replaces it, a name typed in stays.
  const [autoName, setAutoName] = useState('');
  const [tags, setTags] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [fillProfile, setFillProfile] = useState(profileIncomplete);
  const [uploading, setUploading] = useState(false);
  const [reading, setReading] = useState<number | null>(null);
  const [found, setFound] = useState<(ResumeReading & { id: number; name: string }) | null>(null);
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await listResumes();
      setResumes(r.resumes);
      setLoadError(r.error ?? null);
    } catch (e) {
      setLoadError(errorMessage(e));
    }
  }, []);
  useLoadOnMount(load);

  const first = resumes !== null && resumes.length === 0;

  function chooseFile(f: File | null) {
    setFile(f);
    if (f && (!name.trim() || name === autoName)) {
      const n = resumeNameOf(f.name);
      setName(n);
      setAutoName(n);
    }
  }

  function apply(extracted: CandidateProfile, mode: MergeMode, from: string) {
    const filled = onApply(extracted, mode, from);
    const message = filledMessage(filled, from, mode);
    if (filled.length) toast.success(message, { action: { label: 'Review', onClick: onShowProfile } });
    else toast.info(message);
  }

  async function upload() {
    // Upload with no file chosen opens the file dialog instead of refusing.
    if (!file) {
      fileInput.current?.click();
      return;
    }
    const shown = name.trim() || resumeNameOf(file.name);
    const fill = fillProfile;
    setUploading(true);
    let added;
    try {
      added = await uploadResume(file, { name: shown, tags, makeDefault });
    } catch (e) {
      toast.error(errorMessage(e));
      setUploading(false);
      return;
    }
    toast.success(added.isDefault ? `“${shown}” uploaded — the default resume` : `“${shown}” uploaded`);
    setFile(null);
    setName('');
    setAutoName('');
    setTags('');
    setMakeDefault(false);
    setUploading(false);
    await load();
    if (!fill) return;
    setReading(added.id);
    try {
      const r = await readStoredResume(added.id, false);
      apply(r.profile, 'fill', shown);
    } catch (e) {
      toast.error(`Claude could not read “${shown}”: ${errorMessage(e)}`);
    } finally {
      setReading(null);
      await load();
    }
  }

  async function patch(id: number, body: Record<string, unknown>, message: string) {
    try {
      await api(`/api/admin/resumes/${id}`, { method: 'PATCH', json: body });
      toast.success(message);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function rename() {
    if (!renaming) return;
    const current = resumes?.find((r) => r.id === renaming.id);
    const next = renaming.name.trim();
    setRenaming(null);
    if (!current || !next || next === current.name) return;
    await patch(current.id, { name: next }, `Renamed to “${next}”`);
  }

  // Claude reads the resume (or an earlier reading comes back), then the dialog shows what it found.
  async function read(r: ResumeItem, reuse: boolean) {
    setReading(r.id);
    try {
      setFound({ ...(await readStoredResume(r.id, reuse)), id: r.id, name: r.name });
      if (!reuse || !r.parsed) await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setReading(null);
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Upload a resume"
        description="Keep one file per variant (e.g. “.NET backend”, “Full-stack JS”). The default goes with every application unless another variant’s tags fit the job better: the variant whose tags appear most in the job text wins."
      >
        <ResumeFilePicker file={file} onFile={chooseFile} inputRef={fileInput} disabled={uploading} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="resume-name">Variant name</Label>
            <Input id="resume-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. .NET backend" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resume-tags">Tags (comma-separated)</Label>
            <Input id="resume-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. .net, c#, azure, sql server" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={first || makeDefault} disabled={first} onCheckedChange={(v) => setMakeDefault(!!v)} />
            {first ? 'The default (the first resume always is)' : 'Make it the default'}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={fillProfile} onCheckedChange={(v) => setFillProfile(!!v)} />
            Fill the profile’s empty fields from it (Claude reads it)
          </label>
        </div>
        <Button onClick={() => void upload()} disabled={uploading || reading !== null}>
          {uploading ? <Spinner /> : <UploadIcon />}
          {file ? 'Upload' : 'Choose a file to upload'}
        </Button>
      </SectionCard>

      <SectionCard
        title="Resumes"
        description="Each user has their own. The extension attaches the default, or the variant whose tags fit the job. Read with Claude shows what Claude finds in a PDF, Word or text resume and copies it into the profile."
      >
        {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
        {!resumes ? (
          <Spinner />
        ) : resumes.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyTitle>No resumes yet</EmptyTitle>
              <EmptyDescription>Upload one above: the first is the default, which autofill attaches to application forms.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="space-y-3">
            {resumes.map((r) => (
              <li key={r.id} className="space-y-2 rounded-lg border p-3" data-testid="resume-item">
                <div className="flex flex-wrap items-center gap-2">
                  <FileTextIcon className="size-4 text-muted-foreground" />
                  {renaming?.id === r.id ? (
                    <form
                      className="flex items-center gap-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void rename();
                      }}
                    >
                      <Input
                        autoFocus
                        value={renaming.name}
                        maxLength={120}
                        className="h-7 w-56"
                        aria-label={`New name for ${r.name}`}
                        onChange={(e) => setRenaming({ id: r.id, name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setRenaming(null);
                          }
                        }}
                      />
                      <Button type="submit" size="icon-sm" variant="ghost" aria-label="Save the name">
                        <CheckIcon />
                      </Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Keep the name" onClick={() => setRenaming(null)}>
                        <XIcon />
                      </Button>
                    </form>
                  ) : (
                    <>
                      <span className="font-medium">{r.name}</span>
                      <Button size="icon-xs" variant="ghost" aria-label={`Rename ${r.name}`} onClick={() => setRenaming({ id: r.id, name: r.name })}>
                        <PencilIcon />
                      </Button>
                    </>
                  )}
                  {r.isDefault ? <Badge>Default</Badge> : null}
                  {r.parsed ? <Badge variant="secondary">Read by Claude</Badge> : null}
                  <span className="text-xs text-muted-foreground">
                    {r.fileName} · {formatBytes(r.sizeBytes)} · updated {timeAgo(r.updatedAt)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    defaultValue={r.tags ?? ''}
                    placeholder="tags for auto-pick"
                    className="h-7 max-w-xs text-xs"
                    aria-label={`Tags for ${r.name}`}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== (r.tags ?? '')) void patch(r.id, { tags: e.target.value }, 'Tags saved');
                    }}
                  />
                  {!r.isDefault ? (
                    <Button size="sm" variant="outline" onClick={() => void patch(r.id, { isDefault: true }, `“${r.name}” is now the default`)}>
                      <StarIcon />
                      Make default
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => void read(r, true)} disabled={reading !== null || uploading}>
                    {reading === r.id ? <Spinner /> : <SparklesIcon />}
                    {reading === r.id ? 'Reading…' : r.parsed ? 'Fill profile' : 'Read with Claude'}
                  </Button>
                  <Button size="sm" variant="ghost" nativeButton={false} render={<a href={`/api/admin/resumes/${r.id}/file?${viewingParam()}`} target="_blank" rel="noopener noreferrer" />}>
                    <DownloadIcon />
                    Open
                  </Button>
                  <ConfirmButton
                    size="sm"
                    variant="ghost"
                    destructive
                    title={`Delete “${r.name}”?`}
                    description={r.isDefault && resumes.length > 1 ? 'The file is removed from the database, and the newest other resume becomes the default.' : 'The file is removed from the database.'}
                    confirmLabel="Delete"
                    onConfirm={async () => {
                      try {
                        await api(`/api/admin/resumes/${r.id}`, { method: 'DELETE' });
                        await load();
                        return { ok: true, message: 'Resume deleted' };
                      } catch (e) {
                        return { ok: false, error: errorMessage(e) };
                      }
                    }}
                  >
                    <Trash2Icon />
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Dialog open={!!found} onOpenChange={(o) => !o && setFound(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>What Claude read in “{found?.name}”</DialogTitle>
            <DialogDescription>
              {found?.reused
                ? 'Read before, so nothing was spent.'
                : found
                  ? `Read by ${found.model ? modelLabel(found.model) : 'Claude'}${found.costUsd != null ? ` · ${formatUsd(found.costUsd)}` : ''}.`
                  : ''}{' '}
              Copy it into the profile, then review the profile and save it.
            </DialogDescription>
          </DialogHeader>
          {found ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{fullName(found.profile) || '—'}</dd>
              <dt className="text-muted-foreground">E-mail</dt>
              <dd>{found.profile.email || '—'}</dd>
              <dt className="text-muted-foreground">Based in</dt>
              <dd>{[found.profile.city, found.profile.country].filter(Boolean).join(', ') || '—'}</dd>
              <dt className="text-muted-foreground">Headline</dt>
              <dd>{found.profile.headline || '—'}</dd>
              <dt className="text-muted-foreground">Experience</dt>
              <dd>
                {found.profile.yearsExperience ?? '?'} years · {found.profile.experience.length} roles
              </dd>
              <dt className="text-muted-foreground">Skills</dt>
              <dd className="line-clamp-3">{found.profile.skills.map((s) => s.name).join(', ') || '—'}</dd>
              <dt className="text-muted-foreground">Languages</dt>
              <dd>{found.profile.languages.map((l) => l.name).join(', ') || '—'}</dd>
            </dl>
          ) : null}
          <DialogFooter>
            {found?.reused ? (
              <Button
                variant="ghost"
                className="sm:mr-auto"
                onClick={() => {
                  const r = resumes?.find((x) => x.id === found.id);
                  setFound(null);
                  if (r) void read(r, false);
                }}
              >
                Read it again
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                if (found) apply(found.profile, 'replace', found.name);
                setFound(null);
              }}
            >
              Replace profile fields
            </Button>
            <Button
              onClick={() => {
                if (found) apply(found.profile, 'fill', found.name);
                setFound(null);
              }}
            >
              Fill empty fields
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
