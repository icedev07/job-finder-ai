'use client';

import { RotateCcwIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SaveBar } from '@/components/common/save-bar';
import { SectionCard } from '@/components/common/section-card';
import { PasswordCard } from '@/components/settings/password-card';
import { SearchProfileCard } from '@/components/settings/search-profile-card';
import { SheetsAppCard, UserSheetCard, type SheetInfo, type SheetKey } from '@/components/settings/sheet-settings';
import { useStatus } from '@/components/shell/status-provider';
import { ChooseUser, useViewing } from '@/components/shell/viewing';
import { SOURCES } from '@/components/sources/catalog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';
import { api, errorMessage } from '@/lib/clientApi';
import { DEFAULT_ANALYSIS_PROMPT } from '@/lib/defaultPrompt';
import { spreadsheetIdFrom, SPREADSHEET_LINK_HINT } from '@/lib/sheetModel';
import { useAdminConfig, type AdminConfig } from '@/lib/useAdminConfig';

// Settings: the viewed user's own settings (what the AI judges their jobs
// against, their job boards and Google Sheet), then the app-wide ones (the
// Google service account and the shared spreadsheet, your password).

const KEYS = [
  'search_profile',
  'target_market',
  'current_location',
  'profile_in_matching',
  'review_enabled',
  'review_band_min',
  'review_band_max',
  'applications_enabled',
  'followup_days',
  'saved_reminder_days',
  'no_answer_days',
  'job_analysis_prompt',
  'scan_boards',
  'sheet_mode',
  'google_sheet_id',
  'jobs_sheet_tab',
  'linkedin_sheet_tab',
  'sheet_columns',
] as const;
type Key = (typeof KEYS)[number];

const LABEL: Record<Key, string> = {
  search_profile: 'What to look for',
  target_market: 'Target market',
  current_location: 'Based in',
  profile_in_matching: 'Profile in matching',
  review_enabled: 'Review',
  review_band_min: 'Review band',
  review_band_max: 'Review band',
  applications_enabled: 'Applications',
  followup_days: 'Follow-up days',
  saved_reminder_days: 'Days in Saved',
  no_answer_days: 'Days without an answer',
  job_analysis_prompt: 'Analysis prompt',
  scan_boards: 'Job boards',
  sheet_mode: 'Google Sheet',
  google_sheet_id: 'Own spreadsheet',
  jobs_sheet_tab: 'Jobs tab',
  linkedin_sheet_tab: 'LinkedIn tab',
  sheet_columns: 'Sheet columns',
};

type UserSettings = Record<Key, string> & { user: { id: number; username: string; name: string }; sheet: SheetInfo };

const SHEET_KEYS: SheetKey[] = ['sheet_mode', 'google_sheet_id', 'jobs_sheet_tab', 'linkedin_sheet_tab', 'sheet_columns'];

const ALL_BOARDS = SOURCES.map((s) => s.key);

export function SettingsView() {
  const { viewing } = useViewing();
  // The app-wide settings: the user's Google Sheet card reads the shared spreadsheet and the service account too.
  const { config, reload } = useAdminConfig();
  return (
    <div className="space-y-4">
      {viewing === 'all' ? (
        <ChooseUser what="Search options, the analysis prompt, job boards and the Google Sheet" />
      ) : (
        <UserSettingsForm appConfig={config} />
      )}
      <AppSettings config={config} reload={reload} />
    </div>
  );
}

function UserSettingsForm({ appConfig }: { appConfig: AdminConfig | null }) {
  const { multiUser } = useViewing();
  // Review and Applications on/off, the band and the sheet change the sidebar badges and Setup.
  const { refresh } = useStatus();
  const [loaded, setLoaded] = useState<UserSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setLoaded(await api<UserSettings>('/api/admin/user-settings'));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useLoadOnMount(reload);

  const saved = useMemo(
    () => Object.fromEntries(KEYS.map((k) => [k, loaded?.[k] ?? ''])) as Record<Key, string>,
    [loaded],
  );
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fresh settings from the server replace the draft.
  const [lastSaved, setLastSaved] = useState(saved);
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setDraft(saved);
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!loaded) {
    return (
      <div className="grid h-40 place-items-center">
        <Spinner />
      </div>
    );
  }

  const dirty = KEYS.filter((k) => draft[k] !== saved[k]);
  const set = (k: Key) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const whose = multiUser ? `${loaded.user.name}'s` : 'your';
  const they = multiUser ? loaded.user.name : 'you';

  // "" = every board; else a JSON list of the chosen ones.
  const chosen = new Set<string>(draft.scan_boards ? (JSON.parse(draft.scan_boards) as string[]) : ALL_BOARDS);
  const setBoards = (keys: Set<string>) =>
    set('scan_boards')(ALL_BOARDS.every((k) => keys.has(k)) ? '' : JSON.stringify(ALL_BOARDS.filter((k) => keys.has(k))));

  async function save() {
    setSaveError(null);
    if (!draft.target_market.trim() || !draft.current_location.trim()) {
      setSaveError('Fill in the target market and where they are based: the AI judges every job against them.');
      return;
    }
    const min = Number(draft.review_band_min);
    const max = Number(draft.review_band_max);
    if (!(min >= 0 && max <= 100 && min <= max)) {
      setSaveError('The review band must be two scores 0–100 with min ≤ max.');
      return;
    }
    if (spreadsheetIdFrom(draft.google_sheet_id) === null) {
      setSaveError(`Own spreadsheet: ${SPREADSHEET_LINK_HINT}`);
      return;
    }
    if (draft.sheet_mode === 'own' && !draft.google_sheet_id.trim()) {
      setSaveError('Paste the link of their own spreadsheet, or choose the shared spreadsheet.');
      return;
    }
    if (draft.sheet_columns.trim()) {
      try {
        JSON.parse(draft.sheet_columns);
      } catch {
        setSaveError('Sheet columns must be valid JSON (or blank for the defaults).');
        return;
      }
    }
    setSaving(true);
    try {
      await api('/api/admin/user-settings', {
        method: 'PUT',
        json: Object.fromEntries([...new Set(dirty)].map((k) => [k, draft[k]])),
      });
      toast.success('Settings saved');
      await reload();
      refresh();
    } catch (e) {
      setSaveError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const usingDefaultPrompt = !draft.job_analysis_prompt.trim();
  const reviewOn = draft.review_enabled !== 'false';
  const applicationsOn = draft.applications_enabled !== 'false';

  return (
    <>
      <SearchProfileCard value={draft.search_profile} onChange={set('search_profile')} whose={whose} />

      <SectionCard
        title="Target & matching"
        description={`What the AI judges ${multiUser ? `${loaded.user.name}'s` : 'your'} jobs against.`}
      >
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="target">Target market</FieldLabel>
            <Input
              id="target"
              value={draft.target_market}
              onChange={(e) => set('target_market')(e.target.value)}
              placeholder="e.g. Europe, remote worldwide"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="location">Where {they === 'you' ? 'you are' : `${they} is`} based</FieldLabel>
            <Input
              id="location"
              value={draft.current_location}
              onChange={(e) => set('current_location')(e.target.value)}
              placeholder="e.g. Poland"
            />
          </Field>
          <Field orientation="horizontal" className="sm:col-span-2">
            <Switch
              id="profile-matching"
              checked={draft.profile_in_matching !== 'false'}
              onCheckedChange={(v) => set('profile_in_matching')(v ? 'true' : 'false')}
            />
            <div className="space-y-0.5">
              <FieldLabel htmlFor="profile-matching">Use {whose} profile when judging jobs</FieldLabel>
              <FieldDescription>
                Adds skills, experience and work authorization (Profile &amp; resumes) to the AI prompt as soft signals. It can
                never override the hard reject rules.
              </FieldDescription>
            </div>
          </Field>
          <Field id="review" orientation="horizontal" className="scroll-mt-20 sm:col-span-2">
            <Switch
              id="review-enabled"
              checked={reviewOn}
              onCheckedChange={(v) => set('review_enabled')(v ? 'true' : 'false')}
            />
            <div className="space-y-0.5">
              <FieldLabel htmlFor="review-enabled">Review queue</FieldLabel>
              <FieldDescription>
                Verdicts close to the approval line wait in Review for a yes / no. Off: they keep the AI verdict, and{' '}
                {multiUser ? `${loaded.user.name}'s jobs stay out of Review` : 'Review and its badge are hidden'}.
              </FieldDescription>
            </div>
          </Field>
          <Field data-disabled={!reviewOn || undefined}>
            <FieldLabel>Review queue: scores from … to …</FieldLabel>
            <div className="flex items-center gap-2">
              <Input inputMode="numeric" className="w-20" value={draft.review_band_min} onChange={(e) => set('review_band_min')(e.target.value)} disabled={!reviewOn} aria-label="Minimum score" />
              <span className="text-muted-foreground">to</span>
              <Input inputMode="numeric" className="w-20" value={draft.review_band_max} onChange={(e) => set('review_band_max')(e.target.value)} disabled={!reviewOn} aria-label="Maximum score" />
            </div>
            <FieldDescription>Scores in this band count as close calls (the approval line is 60).</FieldDescription>
          </Field>
        </FieldGroup>
      </SectionCard>

      <div id="applications" className="scroll-mt-20">
        <SectionCard title="Applications" description={`Tracking ${whose} applications from saved to offer.`}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field orientation="horizontal" className="sm:col-span-2">
              <Switch
                id="applications-enabled"
                checked={applicationsOn}
                onCheckedChange={(v) => set('applications_enabled')(v ? 'true' : 'false')}
              />
              <div className="space-y-0.5">
                <FieldLabel htmlFor="applications-enabled">Applications board</FieldLabel>
                <FieldDescription>
                  Jobs approved by hand land in Saved, with follow-up reminders, interviews, Next actions, a timeline for each
                  application and a Stage column in the Google Sheet that follows the board. Off: approved jobs stay out of
                  Saved, there are no reminders, the sheet&apos;s Stage column is left alone, and{' '}
                  {multiUser
                    ? `${loaded.user.name}'s applications stay off the board and Next actions`
                    : 'Applications and Next actions are hidden'}
                  .
                </FieldDescription>
              </div>
            </Field>
            <Field data-disabled={!applicationsOn || undefined}>
              <FieldLabel htmlFor="followup">Follow up after (days)</FieldLabel>
              <Input
                id="followup"
                inputMode="numeric"
                className="w-24"
                value={draft.followup_days}
                onChange={(e) => set('followup_days')(e.target.value)}
                disabled={!applicationsOn}
              />
              <FieldDescription>
                When a job is marked Applied, and after each interview, a follow-up reminder is set this many days later.
              </FieldDescription>
            </Field>
            <Field data-disabled={!applicationsOn || undefined}>
              <FieldLabel htmlFor="saved-reminder">Remind to apply after (days in Saved)</FieldLabel>
              <Input
                id="saved-reminder"
                inputMode="numeric"
                className="w-24"
                value={draft.saved_reminder_days}
                onChange={(e) => set('saved_reminder_days')(e.target.value)}
                disabled={!applicationsOn}
              />
              <FieldDescription>A saved job not applied to by then shows in Next actions. 0: never.</FieldDescription>
            </Field>
            <Field data-disabled={!applicationsOn || undefined}>
              <FieldLabel htmlFor="no-answer">Suggest closing after (days without an answer)</FieldLabel>
              <Input
                id="no-answer"
                inputMode="numeric"
                className="w-24"
                value={draft.no_answer_days}
                onChange={(e) => set('no_answer_days')(e.target.value)}
                disabled={!applicationsOn}
              />
              <FieldDescription>
                An application with no answer this long after applying shows in Next actions, ready to close as no response.
                0: never.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </SectionCard>
      </div>

      <SectionCard
        title="Job analysis prompt"
        description={
          <>
            Used for single jobs on the free providers. Placeholders: <code>{'{{JOB_TITLE}}'}</code> <code>{'{{COMPANY}}'}</code>{' '}
            <code>{'{{LOCATION}}'}</code> <code>{'{{DESCRIPTION}}'}</code> <code>{'{{TARGET_MARKET}}'}</code> <code>{'{{CURRENT_LOCATION}}'}</code>{' '}
            <code>{'{{CANDIDATE_PROFILE}}'}</code>. The rules between “HARD REJECT RULES” and “OUTPUT CONTRACT” are also used for
            batched scans and for Claude.
          </>
        }
        actions={
          <Button size="sm" variant="ghost" onClick={() => set('job_analysis_prompt')('')} disabled={usingDefaultPrompt}>
            <RotateCcwIcon />
            Use the default
          </Button>
        }
      >
        <Textarea
          value={usingDefaultPrompt ? DEFAULT_ANALYSIS_PROMPT : draft.job_analysis_prompt}
          onChange={(e) => set('job_analysis_prompt')(e.target.value === DEFAULT_ANALYSIS_PROMPT ? '' : e.target.value)}
          rows={14}
          spellCheck={false}
          className="max-h-[32rem] font-mono text-xs leading-relaxed"
          aria-label="Job analysis prompt"
        />
        <p className="text-xs text-muted-foreground">
          {usingDefaultPrompt ? 'Showing the built-in default (nothing saved).' : 'A custom prompt is saved.'}
        </p>
      </SectionCard>

      <div id="boards" className="scroll-mt-20">
        <SectionCard
          title="Job boards"
          description={`Board scans judge new jobs from these boards for ${they}. Each board's own settings (on/off, search, max jobs) are on Sources and shared by everyone.`}
          actions={
            <Button size="sm" variant="ghost" onClick={() => setBoards(chosen.size === ALL_BOARDS.length ? new Set() : new Set(ALL_BOARDS))}>
              {chosen.size === ALL_BOARDS.length ? 'None' : 'All'}
            </Button>
          }
        >
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {SOURCES.map((s) => (
              <label key={s.key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={chosen.has(s.key)}
                  onCheckedChange={(on) => {
                    const next = new Set(chosen);
                    if (on) next.add(s.key);
                    else next.delete(s.key);
                    setBoards(next);
                  }}
                />
                {s.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {chosen.size === ALL_BOARDS.length
              ? 'Every board, including ones added later.'
              : `${chosen.size} of ${ALL_BOARDS.length} boards. LinkedIn scans with the extension are not affected.`}
          </p>
        </SectionCard>
      </div>

      <UserSheetCard
        draft={draft}
        set={set}
        sheet={loaded.sheet}
        appConfig={appConfig}
        whose={whose}
        they={they}
        dirty={dirty.some((k) => (SHEET_KEYS as string[]).includes(k))}
        onChanged={async () => {
          await reload();
          refresh();
        }}
      />

      <SaveBar
        dirtyLabels={[...new Set(dirty.map((k) => LABEL[k]))]}
        saving={saving}
        error={saveError}
        onSave={() => void save()}
        onDiscard={() => {
          setDraft(saved);
          setSaveError(null);
        }}
      />
    </>
  );
}

// App-wide: the Google service account and the shared spreadsheet, and your password.
function AppSettings({ config, reload }: { config: AdminConfig | null; reload: () => Promise<unknown> }) {
  return (
    <>
      <SheetsAppCard config={config} reload={reload} />

      <div id="password" className="scroll-mt-20">
        <PasswordCard />
      </div>
    </>
  );
}
