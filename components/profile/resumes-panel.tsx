'use client';

import { DownloadIcon, FileTextIcon, SparklesIcon, StarIcon, Trash2Icon, UploadIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmButton } from '@/components/common/confirm-button';
import { SectionCard } from '@/components/common/section-card';
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
import { api, errorMessage } from '@/lib/clientApi';
import { formatBytes, formatUsd, timeAgo } from '@/lib/format';
import { fullName, type CandidateProfile } from '@/lib/profileModel';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';

type Resume = {
  id: number;
  name: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  tags: string | null;
  isDefault: boolean;
  parsed: boolean;
  createdAt: string;
  updatedAt: string;
};

type ParseResult = { profile: CandidateProfile; textPreview: string; model: string; costUsd: number | null };

export type MergeMode = 'fill' | 'replace';

/** Resume variants: upload, tags for auto-pick, default, read with Claude into the profile. */
export function ResumesPanel({ onMerge }: { onMerge: (extracted: CandidateProfile, mode: MergeMode) => void }) {
  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [parsing, setParsing] = useState<number | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ resumes: Resume[]; error?: string }>('/api/admin/resumes');
      setResumes(r.resumes);
      setLoadError(r.error ?? null);
    } catch (e) {
      setLoadError(errorMessage(e));
    }
  }, []);
  useLoadOnMount(load);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error('Choose a file first');
      return;
    }
    const form = new FormData();
    form.set('file', file);
    if (name.trim()) form.set('name', name.trim());
    if (tags.trim()) form.set('tags', tags.trim());
    if (makeDefault) form.set('makeDefault', 'true');
    setUploading(true);
    try {
      await api('/api/admin/resumes', { method: 'POST', body: form });
      toast.success('Resume uploaded');
      setName('');
      setTags('');
      setMakeDefault(false);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
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

  async function parse(id: number) {
    setParsing(id);
    try {
      const r = await api<ParseResult & { ok: boolean; error?: string }>(`/api/admin/resumes/${id}/parse`, { method: 'POST' });
      setParsed(r);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setParsing(null);
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Upload a resume"
        description="Keep one file per variant (e.g. “.NET backend”, “Full-stack JS”). Tags pick the variant for a job automatically: the variant whose tags appear most in the job text wins, else the default. PDF, DOCX or text, up to 4 MB."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="resume-file">File</Label>
            <Input id="resume-file" ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.md,application/pdf" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resume-name">Variant name</Label>
            <Input id="resume-name" value={name} onChange={(e) => setName(e.target.value)} placeholder=".NET backend" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resume-tags">Tags (comma-separated)</Label>
            <Input id="resume-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder=".net, c#, azure, sql server" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={makeDefault} onCheckedChange={(v) => setMakeDefault(!!v)} />
            Make it the default
          </label>
        </div>
        <Button onClick={() => void upload()} disabled={uploading}>
          {uploading ? <Spinner /> : <UploadIcon />}
          Upload
        </Button>
      </SectionCard>

      <SectionCard title="Your resumes" description="“Read with Claude” extracts your profile from a PDF so you do not have to type it (uses the Resume reading route).">
        {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
        {!resumes ? (
          <Spinner />
        ) : resumes.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyTitle>No resumes yet</EmptyTitle>
              <EmptyDescription>Upload one above — autofill attaches it to application forms.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="space-y-3">
            {resumes.map((r) => (
              <li key={r.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <FileTextIcon className="size-4 text-muted-foreground" />
                  <span className="font-medium">{r.name}</span>
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
                  <Button size="sm" variant="outline" onClick={() => void parse(r.id)} disabled={parsing !== null}>
                    {parsing === r.id ? <Spinner /> : <SparklesIcon />}
                    Read with Claude
                  </Button>
                  {!r.isDefault ? (
                    <Button size="sm" variant="ghost" onClick={() => void patch(r.id, { isDefault: true }, `${r.name} is now the default`)}>
                      <StarIcon />
                      Make default
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" nativeButton={false} render={<a href={`/api/admin/resumes/${r.id}/file`} target="_blank" rel="noopener noreferrer" />}>
                    <DownloadIcon />
                    Open
                  </Button>
                  <ConfirmButton
                    size="sm"
                    variant="ghost"
                    destructive
                    title={`Delete “${r.name}”?`}
                    description="The file is removed from the database."
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

      <Dialog open={!!parsed} onOpenChange={(o) => !o && setParsed(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Claude read your resume</DialogTitle>
            <DialogDescription>
              {parsed ? `${parsed.model}${parsed.costUsd != null ? ` · ${formatUsd(parsed.costUsd)}` : ''}` : ''}. Copy what it found into
              your profile, then review and save the profile.
            </DialogDescription>
          </DialogHeader>
          {parsed ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{fullName(parsed.profile) || '—'}</dd>
              <dt className="text-muted-foreground">E-mail</dt>
              <dd>{parsed.profile.email || '—'}</dd>
              <dt className="text-muted-foreground">Headline</dt>
              <dd>{parsed.profile.headline || '—'}</dd>
              <dt className="text-muted-foreground">Experience</dt>
              <dd>
                {parsed.profile.yearsExperience ?? '?'} years · {parsed.profile.experience.length} roles
              </dd>
              <dt className="text-muted-foreground">Skills</dt>
              <dd className="line-clamp-3">{parsed.profile.skills.map((s) => s.name).join(', ') || '—'}</dd>
              <dt className="text-muted-foreground">Languages</dt>
              <dd>{parsed.profile.languages.map((l) => l.name).join(', ') || '—'}</dd>
            </dl>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (parsed) onMerge(parsed.profile, 'replace');
                setParsed(null);
              }}
            >
              Replace profile fields
            </Button>
            <Button
              onClick={() => {
                if (parsed) onMerge(parsed.profile, 'fill');
                setParsed(null);
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
