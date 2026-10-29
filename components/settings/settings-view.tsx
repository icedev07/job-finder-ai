'use client';

import { FlaskConicalIcon, RotateCcwIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { TestResultBox, type TestResult } from '@/components/ai/shared';
import { SaveBar } from '@/components/common/save-bar';
import { SecretField } from '@/components/common/secret-field';
import { SectionCard } from '@/components/common/section-card';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/clientApi';
import { DEFAULT_ANALYSIS_PROMPT } from '@/lib/defaultPrompt';
import { saveAdminConfig, useAdminConfig } from '@/lib/useAdminConfig';

const KEYS = [
  'target_market',
  'current_location',
  'profile_in_matching',
  'review_band_min',
  'review_band_max',
  'followup_days',
  'job_analysis_prompt',
  'google_sheet_id',
  'linkedin_sheet_tab',
  'sheet_columns',
] as const;
type Key = (typeof KEYS)[number];

const LABEL: Record<Key, string> = {
  target_market: 'Target market',
  current_location: 'Current location',
  profile_in_matching: 'Profile in matching',
  review_band_min: 'Review band',
  review_band_max: 'Review band',
  followup_days: 'Follow-up days',
  job_analysis_prompt: 'Analysis prompt',
  google_sheet_id: 'Sheet ID',
  linkedin_sheet_tab: 'LinkedIn tab',
  sheet_columns: 'Sheet columns',
};

export function SettingsView() {
  const { config, error, reload } = useAdminConfig();
  const saved = useMemo(
    () => Object.fromEntries(KEYS.map((k) => [k, config?.[k] ?? ''])) as Record<Key, string>,
    [config],
  );
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [sheetsTest, setSheetsTest] = useState<TestResult>(null);
  const [testingSheets, setTestingSheets] = useState(false);

  // Fresh config from the server replaces the draft.
  const [lastSaved, setLastSaved] = useState(saved);
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setDraft(saved);
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!config) {
    return (
      <div className="grid h-40 place-items-center">
        <Spinner />
      </div>
    );
  }

  const dirty = KEYS.filter((k) => draft[k] !== saved[k]);
  const set = (k: Key) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));

  async function save() {
    setSaveError(null);
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
      await saveAdminConfig(Object.fromEntries([...new Set(dirty)].map((k) => [k, draft[k]])));
      toast.success('Settings saved');
      await reload();
    } catch (e) {
      setSaveError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (password.length < 8) {
      toast.error('Use at least 8 characters');
      return;
    }
    if (password !== password2) {
      toast.error('The two passwords differ');
      return;
    }
    setChangingPassword(true);
    try {
      await saveAdminConfig({ admin_password: password });
      setPassword('');
      setPassword2('');
      toast.success('Password changed — use it next time you sign in');
      await reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setChangingPassword(false);
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
    <div className="space-y-4">
      <SectionCard title="Target & matching" description="What the AI judges jobs against.">
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="target">Target market</FieldLabel>
            <Input id="target" value={draft.target_market} onChange={(e) => set('target_market')(e.target.value)} placeholder="Europe, Eastern Europe, Remote worldwide" />
          </Field>
          <Field>
            <FieldLabel htmlFor="location">Where you are based</FieldLabel>
            <Input id="location" value={draft.current_location} onChange={(e) => set('current_location')(e.target.value)} placeholder="Armenia" />
          </Field>
          <Field orientation="horizontal" className="sm:col-span-2">
            <Switch
              id="profile-matching"
              checked={draft.profile_in_matching !== 'false'}
              onCheckedChange={(v) => set('profile_in_matching')(v ? 'true' : 'false')}
            />
            <div className="space-y-0.5">
              <FieldLabel htmlFor="profile-matching">Use my profile when judging jobs</FieldLabel>
              <FieldDescription>
                Adds your skills, experience and work authorization (Profile &amp; resumes) to the AI prompt as soft signals. It can
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
            <FieldDescription>Verdicts close to the approval line (60) wait in Review for your yes / no.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="followup">Follow up after (days)</FieldLabel>
            <Input id="followup" inputMode="numeric" className="w-24" value={draft.followup_days} onChange={(e) => set('followup_days')(e.target.value)} />
            <FieldDescription>When you mark a job Applied, a follow-up reminder is set this many days later.</FieldDescription>
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

      <div id="sheets" className="scroll-mt-20">
        <SectionCard title="Google Sheets" description="Optional export: approved jobs go to the “Jobs” tab, LinkedIn jobs to their own tab.">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="sheet-id">Spreadsheet ID</FieldLabel>
              <Input id="sheet-id" value={draft.google_sheet_id} onChange={(e) => set('google_sheet_id')(e.target.value)} placeholder="1BxiMVs…" className="font-mono" />
              <FieldDescription>From the sheet URL: /spreadsheets/d/<strong>this part</strong>/edit</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="li-tab">LinkedIn tab name</FieldLabel>
              <Input id="li-tab" value={draft.linkedin_sheet_tab} onChange={(e) => set('linkedin_sheet_tab')(e.target.value)} placeholder="LinkedIn" />
            </Field>
          </FieldGroup>
          <SecretField
            configKey="google_sheets_credentials"
            label="Service account JSON"
            description="Paste the whole key file. Share the sheet with its client_email as Editor."
            placeholder='{"type":"service_account", …}'
            state={config.secrets?.google_sheets_credentials}
            multiline
            onSaved={() => void reload()}
          />
          <Field>
            <FieldLabel htmlFor="columns">“Jobs” tab columns (JSON, blank = defaults)</FieldLabel>
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
            <span className="text-xs text-muted-foreground">Uses the saved values — save first.</span>
          </div>
          <TestResultBox result={sheetsTest} />
        </SectionCard>
      </div>

      <div id="admin" className="scroll-mt-20">
        <SectionCard
          title="Admin password"
          description={
            config.admin_password_from_env
              ? 'Set by the ADMIN_PASSWORD environment variable — change it in your hosting settings.'
              : 'Stored as a salted hash. Signing in again is not needed after a change.'
          }
        >
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="pw1">New password</FieldLabel>
              <Input
                id="pw1"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!!config.admin_password_from_env}
                placeholder="At least 8 characters"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="pw2">Repeat it</FieldLabel>
              <Input
                id="pw2"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                disabled={!!config.admin_password_from_env}
              />
            </Field>
          </FieldGroup>
          <Button size="sm" onClick={() => void changePassword()} disabled={changingPassword || !password || !!config.admin_password_from_env}>
            {changingPassword ? <Spinner /> : null}
            Change password
          </Button>
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
    </div>
  );
}
