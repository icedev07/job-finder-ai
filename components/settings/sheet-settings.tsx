'use client';

import { ExternalLinkIcon, FlaskConicalIcon, SendIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { CopyButton } from '@/components/common/copy-button';
import { SecretField } from '@/components/common/secret-field';
import { SectionCard } from '@/components/common/section-card';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/clientApi';
import { timeAgo } from '@/lib/format';
import {
  SPREADSHEET_LINK_HINT,
  isSheetMode,
  sheetPlan,
  sheetTabs,
  spreadsheetIdFrom,
  spreadsheetUrl,
  type SheetStatus,
} from '@/lib/sheetModel';
import { saveAdminConfig, type AdminConfig } from '@/lib/useAdminConfig';

// Google Sheets in Settings: where the viewed user's approved jobs go (the
// shared spreadsheet, their own or nowhere) with the last delivery, and the
// app-wide part (the service account and the shared spreadsheet).

export type SheetKey = 'sheet_mode' | 'google_sheet_id' | 'jobs_sheet_tab' | 'linkedin_sheet_tab' | 'sheet_columns';

/** What GET /api/admin/user-settings says about the user's sheet. */
export type SheetInfo = {
  /** Whose tabs these are in the shared spreadsheet. */
  who: string;
  status: SheetStatus | null;
  /** Approved jobs not in their sheet yet. */
  unsent: number;
};

/** The service account's e-mail, when one is saved. */
function serviceEmail(config: AdminConfig | null): string {
  const account = config?.secrets?.google_sheets_credentials;
  return account?.set && account.hint.includes('@') ? account.hint : '';
}

const quoted = (tabs: string[]) => tabs.map((t) => `“${t}”`).join(' and ');

/** The last delivery, the last test, or the failure with what to do. */
function StatusLine({ status }: { status: SheetStatus | null }) {
  if (!status) return <p className="text-xs text-muted-foreground" data-testid="sheet-status">Nothing sent yet.</p>;
  const when = timeAgo(status.at);
  const ago = when === 'just now' ? 'just now' : `${when} ago`;
  if (!status.ok) {
    return (
      <p className="text-xs text-destructive" role="alert" data-testid="sheet-status">
        The last delivery failed ({ago}): {status.error}
      </p>
    );
  }
  return (
    <p className="text-xs text-emerald-700 dark:text-emerald-400" data-testid="sheet-status">
      {status.sent
        ? `Last delivery: ${status.sent} job${status.sent === 1 ? '' : 's'} to ${quoted(status.tabs)} (${ago}).`
        : `Checked ${ago}: the service account can edit ${quoted(status.tabs)}.`}
    </p>
  );
}

export function UserSheetCard({
  draft,
  set,
  sheet,
  appConfig,
  whose,
  they,
  dirty,
  onChanged,
}: {
  draft: Record<SheetKey, string>;
  set: (key: SheetKey) => (value: string) => void;
  sheet: SheetInfo;
  appConfig: AdminConfig | null;
  /** "Anna's" or "your". */
  whose: string;
  /** "Anna" or "you". */
  they: string;
  /** A sheet setting is changed and not saved yet. */
  dirty: boolean;
  /** After a test or a delivery: the settings to read again (the last delivery). */
  onChanged: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState<'test' | 'send' | null>(null);
  const mode = isSheetMode(draft.sheet_mode) ? draft.sheet_mode : 'shared';
  const sharedId = appConfig?.shared_sheet_id ?? '';
  const email = serviceEmail(appConfig);
  const ownId = spreadsheetIdFrom(draft.google_sheet_id);
  const plan = sheetPlan({
    mode,
    ownId: ownId ?? '',
    sharedId,
    serviceAccount: !!appConfig?.secrets?.google_sheets_credentials?.set,
    tabs: { jobs: draft.jobs_sheet_tab, linkedin: draft.linkedin_sheet_tab },
    who: sheet.who,
  });
  const defaults = sheetTabs(mode, { jobs: '', linkedin: '' }, sheet.who);
  const shared = sheetTabs('shared', { jobs: draft.jobs_sheet_tab, linkedin: draft.linkedin_sheet_tab }, sheet.who);

  // The outcome is a message; the card's last-delivery line keeps it (the test is noted like a delivery).
  async function runTest() {
    setBusy('test');
    try {
      const r = await api<{ ok: boolean; error?: string; sheetTitle?: string; tabs?: string[]; created?: string[] }>(
        '/api/admin/test-connection',
        { method: 'POST', json: { target: 'sheets' } },
      );
      if (r.ok) {
        const made = r.created?.length ? `; made just now: ${quoted(r.created)}` : '';
        toast.success(`Ready: the service account can edit ${quoted(r.tabs ?? [])} in “${r.sheetTitle}”${made}.`);
      } else {
        toast.error(r.error ?? 'The test failed.');
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
      await onChanged();
    }
  }

  async function sendNow() {
    setBusy('send');
    try {
      const r = await api<{ synced: number }>('/api/admin/sheets-sync', { method: 'POST', json: { pending: true } });
      toast.success(r.synced ? `Sent ${r.synced} job${r.synced === 1 ? '' : 's'} to the Google Sheet` : 'Nothing to send: every approved job is in the sheet');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
      await onChanged();
    }
  }

  return (
    <div id="sheets" className="scroll-mt-20">
      <SectionCard
        title="Google Sheet"
        description={`Where ${whose} approved jobs go: board jobs to a Jobs tab, LinkedIn jobs to a LinkedIn tab. Missing tabs are created.`}
      >
        <RadioGroup value={mode} onValueChange={(v) => set('sheet_mode')(String(v))} aria-label="Where the approved jobs go">
          <Field orientation="horizontal">
            <RadioGroupItem value="shared" id="sheet-mode-shared" />
            <div className="space-y-0.5">
              <FieldLabel htmlFor="sheet-mode-shared">The shared spreadsheet</FieldLabel>
              <FieldDescription>
                {sharedId ? (
                  <>
                    Their own two tabs in it: {quoted([shared.jobs, shared.linkedin])}.{' '}
                    <a href={spreadsheetUrl(sharedId)} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                      Open it
                    </a>
                  </>
                ) : (
                  'None is set yet: add it under Google Sheets below.'
                )}
              </FieldDescription>
            </div>
          </Field>
          <Field orientation="horizontal">
            <RadioGroupItem value="own" id="sheet-mode-own" />
            <div className="w-full min-w-0 space-y-1.5">
              <FieldLabel htmlFor="sheet-mode-own">{they === 'you' ? 'Your own spreadsheet' : 'Their own spreadsheet'}</FieldLabel>
              {mode === 'own' ? (
                <Input
                  id="sheet-id"
                  aria-label="Own spreadsheet link or ID"
                  value={draft.google_sheet_id}
                  onChange={(e) => set('google_sheet_id')(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  className="font-mono"
                  aria-invalid={ownId === null || undefined}
                />
              ) : null}
              <FieldDescription>
                {mode === 'own' && ownId === null
                  ? SPREADSHEET_LINK_HINT
                  : `Paste its link, and share it with ${email || 'the service account (below)'} as Editor.`}
              </FieldDescription>
            </div>
          </Field>
          <Field orientation="horizontal">
            <RadioGroupItem value="off" id="sheet-mode-off" />
            <div className="space-y-0.5">
              <FieldLabel htmlFor="sheet-mode-off">Nowhere</FieldLabel>
              <FieldDescription>No Google Sheet for {they}: approved jobs stay in this app.</FieldDescription>
            </div>
          </Field>
        </RadioGroup>

        {mode !== 'off' ? (
          <>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="jobs-tab">Jobs tab name (optional)</FieldLabel>
                <Input id="jobs-tab" value={draft.jobs_sheet_tab} onChange={(e) => set('jobs_sheet_tab')(e.target.value)} />
                <FieldDescription>Blank: “{defaults.jobs}”.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="li-tab">LinkedIn tab name (optional)</FieldLabel>
                <Input id="li-tab" value={draft.linkedin_sheet_tab} onChange={(e) => set('linkedin_sheet_tab')(e.target.value)} />
                <FieldDescription>Blank: “{defaults.linkedin}”.</FieldDescription>
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
          </>
        ) : null}

        <div className="space-y-1 rounded-lg border p-3 text-sm" data-testid="sheet-where">
          {plan.ok ? (
            <p>
              Board jobs go to “{plan.jobsTab}”, LinkedIn jobs to “{plan.linkedinTab}”, in{' '}
              <a href={spreadsheetUrl(plan.spreadsheetId)} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                {plan.mode === 'shared' ? 'the shared spreadsheet' : they === 'you' ? 'your own spreadsheet' : 'their own spreadsheet'}
                <ExternalLinkIcon className="ml-0.5 inline size-3" />
              </a>
              .
            </p>
          ) : (
            <p className={plan.mode === 'off' ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400'}>
              {plan.mode === 'off' ? 'Approved jobs go to no Google Sheet.' : `Approved jobs go to no Google Sheet: ${plan.reason}`}
            </p>
          )}
          {mode !== 'off' ? <StatusLine status={sheet.status} /> : null}
        </div>

        {mode !== 'off' ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => void runTest()} disabled={busy !== null || !plan.ok}>
                {busy === 'test' ? <Spinner /> : <FlaskConicalIcon />}
                Test and set up the tabs
              </Button>
              <Button size="sm" variant="outline" onClick={() => void sendNow()} disabled={busy !== null || !plan.ok || sheet.unsent === 0}>
                {busy === 'send' ? <Spinner /> : <SendIcon />}
                {sheet.unsent ? `Send ${sheet.unsent} approved job${sheet.unsent === 1 ? '' : 's'} now` : 'Every approved job is sent'}
              </Button>
              <span className="text-xs text-muted-foreground">
                {dirty ? 'These use the saved settings: save first.' : 'The AI’s approvals go when each scan ends, the ones you approve right away.'}
              </span>
            </div>
          </>
        ) : null}
      </SectionCard>
    </div>
  );
}

/** App-wide: the one service account that writes every spreadsheet, and the shared spreadsheet. */
export function SheetsAppCard({ config, reload }: { config: AdminConfig | null; reload: () => Promise<unknown> }) {
  const saved = config?.shared_sheet_id ?? '';
  const [value, setValue] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  const [saving, setSaving] = useState(false);
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setValue(saved);
  }
  const email = serviceEmail(config);
  const id = spreadsheetIdFrom(value);

  async function save() {
    if (id === null) {
      toast.error(SPREADSHEET_LINK_HINT);
      return;
    }
    setSaving(true);
    try {
      await saveAdminConfig({ shared_sheet_id: value.trim() });
      toast.success(id ? 'Shared spreadsheet saved' : 'Shared spreadsheet removed');
      await reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="service-account" className="scroll-mt-20">
      <SectionCard
        title="Google Sheets"
        description="One Google service account writes every spreadsheet: the shared one, where each user gets their own tabs, and any user's own."
      >
        {config ? (
          <>
            <SecretField
              configKey="google_sheets_credentials"
              label="Service account JSON"
              description={email ? 'Its key file, from Google Cloud → IAM → Service accounts → Keys.' : 'Not set yet: paste the whole key file (JSON).'}
              placeholder='{"type":"service_account", …}'
              state={config.secrets?.google_sheets_credentials}
              multiline
              onSaved={() => void reload()}
            />
            {email ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm" data-testid="service-email">
                <span>
                  Share every spreadsheet with <code className="break-all font-mono text-xs">{email}</code> as <strong>Editor</strong>.
                </span>
                <CopyButton value={email} label="Copy the e-mail" size="sm" variant="outline" />
              </div>
            ) : null}
            <Field>
              <FieldLabel htmlFor="shared-sheet">Shared spreadsheet</FieldLabel>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="shared-sheet"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  className="min-w-0 flex-1 font-mono"
                  aria-invalid={id === null || undefined}
                />
                <Button size="sm" onClick={() => void save()} disabled={saving || value.trim() === saved}>
                  {saving ? <Spinner /> : null}
                  Save
                </Button>
              </div>
              <FieldDescription>
                {id === null ? (
                  SPREADSHEET_LINK_HINT
                ) : (
                  <>
                    For everyone set to it (the default for a user without their own): each gets two tabs, named after them, such as
                    “Anna – Jobs” and “Anna – LinkedIn”. Anyone who can open the spreadsheet sees every user&apos;s tabs.{' '}
                    {saved ? (
                      <a href={spreadsheetUrl(saved)} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                        Open it
                      </a>
                    ) : null}
                  </>
                )}
              </FieldDescription>
            </Field>
          </>
        ) : (
          <Spinner />
        )}
      </SectionCard>
    </div>
  );
}

