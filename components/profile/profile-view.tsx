'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SaveBar } from '@/components/common/save-bar';
import { AnswersPanel } from '@/components/profile/answers-panel';
import { ProfileForm } from '@/components/profile/profile-form';
import { ResumesPanel, type MergeMode } from '@/components/profile/resumes-panel';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, errorMessage } from '@/lib/clientApi';
import { normalizeProfile, profileCompleteness, type CandidateProfile } from '@/lib/profileModel';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';

function isEmpty(v: unknown): boolean {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0);
}

// Resume facts merged into the draft profile. Work terms, self-ID and extra
// facts never come from a resume, so they are always kept.
function merge(current: CandidateProfile, extracted: CandidateProfile, mode: MergeMode): CandidateProfile {
  const keys: (keyof CandidateProfile)[] = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'city',
    'country',
    'linkedin',
    'github',
    'portfolio',
    'headline',
    'summary',
    'yearsExperience',
    'skills',
    'languages',
    'experience',
    'education',
  ];
  const next = { ...current };
  for (const k of keys) {
    const value = extracted[k];
    if (isEmpty(value)) continue;
    if (mode === 'replace' || isEmpty(current[k])) (next as Record<string, unknown>)[k] = value;
  }
  return normalizeProfile(next);
}

const TABS = ['profile', 'resumes', 'answers'] as const;

export function ProfileView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? params.get('tab')! : 'profile';
  const [saved, setSaved] = useState<CandidateProfile | null>(null);
  const [draft, setDraft] = useState<CandidateProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ profile: CandidateProfile }>('/api/admin/profile');
      setSaved(r.profile);
      setDraft(r.profile);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useLoadOnMount(load);

  const dirty = useMemo(() => !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const completeness = draft ? profileCompleteness(draft) : null;

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const r = await api<{ profile: CandidateProfile }>('/api/admin/profile', { method: 'PUT', json: { profile: draft } });
      setSaved(r.profile);
      setDraft(r.profile);
      toast.success('Profile saved');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!draft || !completeness) {
    return (
      <div className="grid h-40 place-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
        <span className="font-medium">
          Profile {completeness.filled} of {completeness.total} key fields
        </span>
        <Progress value={(completeness.filled / completeness.total) * 100} className="w-40" aria-label="Profile completeness" />
        {completeness.missing.length ? (
          <span className="text-muted-foreground">Missing: {completeness.missing.slice(0, 5).join(', ')}{completeness.missing.length > 5 ? '…' : ''}</span>
        ) : (
          <span className="text-emerald-700 dark:text-emerald-400">Complete</span>
        )}
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(params.toString());
          next.set('tab', String(v));
          router.replace(`${pathname}?${next.toString()}`, { scroll: false });
        }}
        className="gap-4"
      >
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="resumes">Resumes</TabsTrigger>
          <TabsTrigger value="answers">Answer bank</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileForm profile={draft} onChange={setDraft} />
        </TabsContent>
        <TabsContent value="resumes">
          <ResumesPanel
            onMerge={(extracted, mode) => {
              setDraft((d) => (d ? merge(d, extracted, mode) : d));
              toast.success('Copied into your profile — review it on the Profile tab and save');
            }}
          />
        </TabsContent>
        <TabsContent value="answers">
          <AnswersPanel />
        </TabsContent>
      </Tabs>
      <SaveBar dirtyLabels={dirty ? ['Profile'] : []} saving={saving} onSave={() => void save()} onDiscard={() => setDraft(saved)} />
    </div>
  );
}
