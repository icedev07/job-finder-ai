'use client';

import { FlaskConicalIcon, RotateCcwIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { TestResultBox, type TestResult } from '@/components/ai/shared';
import { SaveBar } from '@/components/common/save-bar';
import { SecretField } from '@/components/common/secret-field';
import { SectionCard } from '@/components/common/section-card';
import { PasswordCard } from '@/components/settings/password-card';
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
import { useAdminConfig } from '@/lib/useAdminConfig';

// Settings: the viewed user's own settings (what the AI judges their jobs
// against, their job boards and Google Sheet), then the app-wide ones (the
// Google service account, your password).

const KEYS = [
  'target_market',
  'current_location',
  'profile_in_matching',
  'review_band_min',
  'review_band_max',
  'followup_days',
  'job_analysis_prompt',
  'scan_boards',
  'google_sheet_id',
  'jobs_sheet_tab',
  'linkedin_sheet_tab',
  'sheet_columns',
] as const;
type Key = (typeof KEYS)[number];

const LABEL: Record<Key, string> = {
  target_market: 'Target market',
  current_location: 'Based in',
  profile_in_matching: 'Profile in matching',
  review_band_min: 'Review band',
  review_band_max: 'Review band',
  followup_days: 'Follow-up days',
  job_analysis_prompt: 'Analysis prompt',
  scan_boards: 'Job boards',
  google_sheet_id: 'Sheet ID',
  jobs_sheet_tab: 'Jobs tab',
  linkedin_sheet_tab: 'LinkedIn tab',
  sheet_columns: 'Sheet columns',
};

type UserSettings = Record<Key, string> & { user: { id: number; username: string; name: string } };

const ALL_BOARDS = SOURCES.map((s) => s.key);

export function SettingsView() {
  const { viewing } = useViewing();
  return (
    <div className="space-y-4">
      {viewing === 'all' ? (
        <ChooseUser what="Search options, the analysis prompt, job boards and the Google Sheet" />
      ) : (
        <UserSettingsForm />
      )}
      <AppSettings />
    </div>
  );
}

function UserSettingsForm() {
  const { multiUser } = useViewing();
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
  const [sheetsTest, setSheetsTest] = useState<TestResult>(null);
  const [testingSheets, setTestingSheets] = useState(false);

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
    } catch (e) {
      setSaveError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function testSheets() {
    setTestingSheets(true);
    setSheetsTest(null);
    try {
      setSheetsTest(await api<TestResult>('/api/admin/test-connection', { method: 'POST', json: { target: 'sheets' } }));
    } catch (e) {
      setSheetsTest({ ok: false, error: errorMessage(e) });
    } finally {
      setTestingSheets(false);
    }
  }

  const usingDefaultPrompt = !draft.job_analysis_prompt.trim();

  return (
    <>
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
          <Field>
            <FieldLabel>Review queue: scores from … to …</FieldLabel>
            <div className="flex items-center gap-2">
              <Input inputMode="numeric" className="w-20" value={draft.review_band_min} onChange={(e) => set('review_band_min')(e.target.value)} aria-label="Minimum score" />
              <span className="text-muted-foreground">to</span>
              <Input inputMode="numeric" className="w-20" value={draft.review_band_max} onChange={(e) => set('review_band_max')(e.target.value)} aria-label="Maximum score" />
            </div>
            <FieldDescription>Verdicts close to the approval line (60) wait in Review for a yes / no.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="followup">Follow up after (days)</FieldLabel>
            <Input id="followup" inputMode="numeric" className="w-24" value={draft.followup_days} onChange={(e) => set('followup_days')(e.target.value)} />
            <FieldDescription>When a job is marked Applied, a follow-up reminder is set this many days later.</FieldDescription>
          </Field>
        </FieldGroup>
      </SectionCard>

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

      <div id="sheets" className="scroll-mt-20">
        <SectionCard
          title="Google Sheet"
          description={`Optional export of ${whose} approved jobs: board jobs go to the Jobs tab, LinkedIn jobs to the LinkedIn tab. Missing tabs are created.`}
        >
          <FieldGroup className="grid gap-4 sm:grid-cols-3">
            <Field className="sm:col-span-3">
              <FieldLabel htmlFor="sheet-id">Spreadsheet ID</FieldLabel>
              <Input id="sheet-id" value={draft.google_sheet_id} onChange={(e) => set('google_sheet_id')(e.target.value)} placeholder="1BxiMVs…" className="font-mono" />
              <FieldDescription>
                From the sheet URL: /spreadsheets/d/<strong>this part</strong>/edit. Several users can share one spreadsheet with
                their own tab names.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="jobs-tab">Jobs tab name</FieldLabel>
              <Input id="jobs-tab" value={draft.jobs_sheet_tab} onChange={(e) => set('jobs_sheet_tab')(e.target.value)} placeholder="Jobs" />
            </Field>
            <Field>
              <FieldLabel htmlFor="li-tab">LinkedIn tab name</FieldLabel>
              <Input id="li-tab" value={draft.linkedin_sheet_tab} onChange={(e) => set('linkedin_sheet_tab')(e.target.value)} placeholder="LinkedIn" />
            </Field>
          </FieldGroup>
          <Field>
            <FieldLabel htmlFor="columns">Jobs tab columns (JSON, blank = defaults)</FieldLabel>
            <Textarea
              id="columns"
              value={draft.sheet_columns}
              onChange={(e) => set('sheet_columns')(e.target.value)}
              rows={3}
              spellCheck={false}
              className="font-mono text-xs"
              placeholder='[{"key":"title","label":"Title"},{"key":"applyMethod","label":"Apply via"}, …]'
            />
            <FieldDescription>
              Keys: title, company, location, url, platform, aiScore, techStack, salary, createdAt, applyMethod, eligibility, stage.
            </FieldDescription>
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => void testSheets()} disabled={testingSheets}>
              {testingSheets ? <Spinner /> : <FlaskConicalIcon />}
              Test the connection
            </Button>
            <span className="text-xs text-muted-foreground">Uses the saved values and the service account below — save first.</span>
          </div>
          <TestResultBox result={sheetsTest} />
        </SectionCard>
      </div>

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

// App-wide: the one Google service account that writes every user's sheet, and your password.
function AppSettings() {
  const { config, reload } = useAdminConfig();
  return (
    <>
      <div id="service-account" className="scroll-mt-20">
        <SectionCard
          title="Google service account"
          description="One service account writes every user's sheet. Paste its whole key file, then share each spreadsheet with its client_email as Editor."
        >
          {config ? (
            <SecretField
              configKey="google_sheets_credentials"
              label="Service account JSON"
              description={
                config.secrets?.google_sheets_credentials?.set
                  ? `Share each user's spreadsheet with ${config.secrets.google_sheets_credentials.hint} as Editor.`
                  : 'Not set yet.'
              }
              placeholder='{"type":"service_account", …}'
              state={config.secrets?.google_sheets_credentials}
              multiline
              onSaved={() => void reload()}
            />
          ) : (
            <Spinner />
          )}
        </SectionCard>
      </div>

      <div id="password" className="scroll-mt-20">
        <PasswordCard />
      </div>
    </>
  );
}
