'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { SaveBar } from '@/components/common/save-bar';
import { AnswersPanel } from '@/components/profile/answers-panel';
import { ProfileForm } from '@/components/profile/profile-form';
import { ResumeFill, type FillResult } from '@/components/profile/resume-fill';
import { ResumesPanel, type MergeMode } from '@/components/profile/resumes-panel';
import { ChooseUser, useViewing } from '@/components/shell/viewing';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, errorMessage } from '@/lib/clientApi';
import { mergeResumeProfile, profileCompleteness, type CandidateProfile } from '@/lib/profileModel';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';

const TABS = ['profile', 'resumes', 'answers'] as const;

/** The viewed user's profile, resumes and answer bank (each user has their own). */
export function ProfileView() {
  const { viewing } = useViewing();
  if (viewing === 'all') return <ChooseUser what="The profile, resumes and saved answers" />;
  return <ProfileEditor />;
}

function ProfileEditor() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? params.get('tab')! : 'profile';
  const [saved, setSaved] = useState<CandidateProfile | null>(null);
  const [draft, setDraft] = useState<CandidateProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFill, setLastFill] = useState<FillResult | null>(null);
  // The draft a resume reading lands on (it comes back after an await, maybe after more typing).
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

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

  const showTab = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set('tab', value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  // A resume's facts into the draft, for the admin to review and save.
  function applyResume(extracted: CandidateProfile, mode: MergeMode, from: string): string[] {
    const current = draftRef.current;
    if (!current) return [];
    const { profile, filled } = mergeResumeProfile(current, extracted, mode);
    draftRef.current = profile;
    setDraft(profile);
    setLastFill({ from, filled, mode });
    return filled;
  }

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
      <Tabs value={tab} onValueChange={(v) => showTab(String(v))} className="gap-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="resumes">Resumes</TabsTrigger>
          <TabsTrigger value="answers">Answer bank</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-4">
          <ResumeFill onApply={applyResume} last={lastFill} />
          <ProfileForm profile={draft} onChange={setDraft} />
        </TabsContent>
        <TabsContent value="resumes">
          <ResumesPanel onApply={applyResume} profileIncomplete={completeness.missing.length > 0} onShowProfile={() => showTab('profile')} />
        </TabsContent>
        <TabsContent value="answers">
          <AnswersPanel />
        </TabsContent>
      </Tabs>
      <SaveBar dirtyLabels={dirty ? ['Profile'] : []} saving={saving} onSave={() => void save()} onDiscard={() => setDraft(saved)} />
    </div>
  );
}
