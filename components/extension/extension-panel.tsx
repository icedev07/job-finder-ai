'use client';

import { LogOutIcon, PencilIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmButton } from '@/components/common/confirm-button';
import { SaveBar } from '@/components/common/save-bar';
import { SectionCard } from '@/components/common/section-card';
import { useViewing } from '@/components/shell/viewing';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';
import { api, errorMessage } from '@/lib/clientApi';
import { formatDateTime, timeAgo } from '@/lib/format';

// Admin → Extension, per user: the browsers signed in to the extension, and
// the extension settings the popup scans with (lib/extensionSettings.ts).

type Settings = {
  easyApplyMode: 'skip' | 'analyze';
  easyApplyMinScore: number;
  jobLimit: number;
  hideApproved: boolean;
  betaMode: boolean;
  sendLogs: boolean;
};

type Browser = { id: number; userId: number; label: string; createdAt: string; lastUsedAt: string | null };

type PanelData = { browsers: Browser[]; settings: { userId: number; settings: Settings }[] };

const EASY_APPLY_ITEMS = [
  { value: 'skip', label: 'Skip and hide (no AI)' },
  { value: 'analyze', label: 'Analyze with AI' },
];

export function ExtensionPanel() {
  const { viewing } = useViewing();
  const [data, setData] = useState<PanelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setData(await api<PanelData>('/api/admin/extension'));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useLoadOnMount(reload);

  return (
    <>
      <BrowsersCard data={data} error={error} onChanged={reload} />
      {viewing === 'all' ? (
        <SettingsOverview data={data} />
      ) : (
        <SettingsForm settings={data?.settings[0]?.settings ?? null} error={error} />
      )}
    </>
  );
}

function BrowsersCard({ data, error, onChanged }: { data: PanelData | null; error: string | null; onChanged: () => Promise<void> }) {
  const { viewing, multiUser, userName } = useViewing();
  const showUser = multiUser && viewing === 'all';

  async function signOut(b: Browser) {
    try {
      await api(`/api/admin/extension/browsers/${b.id}`, { method: 'DELETE' });
      await onChanged();
      return { ok: true, message: `${b.label} is signed out` };
    } catch (e) {
      return { ok: false, error: errorMessage(e) };
    }
  }

  return (
    <SectionCard
      title="Signed-in browsers"
      description="Every browser signed in to the extension. Signing one out stops it at once; disabling a user, a new password or “Sign out everywhere” on the Users page signs out all of theirs."
    >
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !data ? (
        <div className="grid h-20 place-items-center">
          <Spinner />
        </div>
      ) : data.browsers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No browser is signed in{viewing === 'all' || !multiUser ? '' : ` as ${userName(viewing)}`} yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {showUser ? <TableHead>User</TableHead> : null}
              <TableHead>Browser</TableHead>
              <TableHead className="hidden sm:table-cell">Signed in</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.browsers.map((b) => (
              <TableRow key={b.id}>
                {showUser ? <TableCell className="font-medium">{userName(b.userId)}</TableCell> : null}
                <TableCell>{b.label}</TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDateTime(b.createdAt)}</TableCell>
                <TableCell className="text-muted-foreground">{b.lastUsedAt ? timeAgo(b.lastUsedAt) : 'not yet'}</TableCell>
                <TableCell className="text-right">
                  <ConfirmButton
                    size="sm"
                    variant="ghost"
                    destructive
                    title="Sign this browser out?"
                    description={`${b.label} (${userName(b.userId)}) stops working at once; signing in again in the popup brings it back.`}
                    confirmLabel="Sign out"
                    onConfirm={() => signOut(b)}
                  >
                    <LogOutIcon />
                    Sign out
                  </ConfirmButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

function limitLabel(n: number): string {
  return n === -1 ? 'every job' : `${n} jobs`;
}

/** All users: each user's settings at a glance; Edit opens that user. */
function SettingsOverview({ data }: { data: PanelData | null }) {
  const { setViewing, userName } = useViewing();
  return (
    <SectionCard
      title="Extension settings"
      description="How the extension scans LinkedIn for each user. Users change them in the popup; pick a user to change them here."
    >
      {!data ? null : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Easy Apply jobs</TableHead>
              <TableHead className="hidden sm:table-cell">Scan limit</TableHead>
              <TableHead className="hidden md:table-cell">Hide approved</TableHead>
              <TableHead className="hidden md:table-cell">AI search page</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.settings.map(({ userId, settings: s }) => (
              <TableRow key={userId}>
                <TableCell className="font-medium">{userName(userId)}</TableCell>
                <TableCell>
                  {s.easyApplyMode === 'analyze'
                    ? `Analyze${s.easyApplyMinScore ? ` (score ≥ ${s.easyApplyMinScore})` : ''}`
                    : 'Skip and hide'}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{limitLabel(s.jobLimit)}</TableCell>
                <TableCell className="hidden md:table-cell">{s.hideApproved ? 'Yes' : 'No'}</TableCell>
                <TableCell className="hidden md:table-cell">{s.betaMode ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setViewing(userId)}>
                    <PencilIcon />
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

type Draft = {
  easyApplyMode: 'skip' | 'analyze';
  easyApplyMinScore: string;
  jobLimit: string;
  hideApproved: boolean;
  betaMode: boolean;
  sendLogs: boolean;
};

const LABELS: Record<keyof Draft, string> = {
  easyApplyMode: 'Easy Apply jobs',
  easyApplyMinScore: 'Easy Apply score',
  jobLimit: 'Scan limit',
  hideApproved: 'Hide approved',
  betaMode: 'AI search page',
  sendLogs: 'Send logs',
};

function toDraft(s: Settings): Draft {
  return { ...s, easyApplyMinScore: String(s.easyApplyMinScore), jobLimit: String(s.jobLimit) };
}

/** One user's settings, saved for the popup to pick up the next time it opens. */
function SettingsForm({ settings, error }: { settings: Settings | null; error: string | null }) {
  const { multiUser, viewing, userName } = useViewing();
  const [saved, setSaved] = useState<Draft | null>(settings ? toDraft(settings) : null);
  const [draft, setDraft] = useState<Draft | null>(saved);
  // Fresh settings from the server replace the form.
  const [loaded, setLoaded] = useState(settings);
  if (settings !== loaded) {
    setLoaded(settings);
    const fresh = settings ? toDraft(settings) : null;
    setSaved(fresh);
    setDraft(fresh);
  }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (error && !settings) return null;
  if (!draft || !saved) {
    return (
      <SectionCard title="Extension settings">
        <div className="grid h-20 place-items-center">
          <Spinner />
        </div>
      </SectionCard>
    );
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const dirty = (Object.keys(LABELS) as (keyof Draft)[]).filter((k) => draft[k] !== saved[k]);
  const name = multiUser && typeof viewing === 'number' ? userName(viewing) : null;

  async function save() {
    if (!draft) return;
    setSaveError(null);
    const limit = Number(draft.jobLimit);
    if (!Number.isInteger(limit) || (limit !== -1 && limit < 1)) {
      setSaveError('The scan limit is a number of jobs, or -1 for every job.');
      return;
    }
    const min = Number(draft.easyApplyMinScore);
    if (!Number.isInteger(min) || min < 0 || min > 100) {
      setSaveError('The Easy Apply score is 0–100 (0 = the usual bar).');
      return;
    }
    setSaving(true);
    try {
      const r = await api<{ settings: Settings }>('/api/admin/extension', {
        method: 'PUT',
        json: { ...draft, jobLimit: limit, easyApplyMinScore: min },
      });
      const fresh = toDraft(r.settings);
      setSaved(fresh);
      setDraft(fresh);
      toast.success('Saved — the popup uses them the next time it opens');
    } catch (e) {
      setSaveError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Extension settings"
      description={`How the extension scans LinkedIn for ${name ?? 'you'}. The popup loads them when it opens and saves its changes here, so every browser uses the same.`}
    >
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Easy Apply jobs</FieldLabel>
          <Select
            items={EASY_APPLY_ITEMS}
            value={draft.easyApplyMode}
            onValueChange={(v) => set('easyApplyMode', v === 'analyze' ? 'analyze' : 'skip')}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EASY_APPLY_ITEMS.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>Skip and hide rejects them without using AI; Analyze judges them like every other job.</FieldDescription>
        </Field>
        {draft.easyApplyMode === 'analyze' ? (
          <Field>
            <FieldLabel htmlFor="easy-min">Approve Easy Apply jobs only at score ≥</FieldLabel>
            <Input
              id="easy-min"
              inputMode="numeric"
              className="w-24"
              value={draft.easyApplyMinScore}
              onChange={(e) => set('easyApplyMinScore', e.target.value)}
            />
            <FieldDescription>0 = the usual bar. They get many more applicants, so 75 keeps only strong matches.</FieldDescription>
          </Field>
        ) : null}
        <Field>
          <FieldLabel htmlFor="job-limit">Job scan limit</FieldLabel>
          <Input id="job-limit" inputMode="numeric" className="w-24" value={draft.jobLimit} onChange={(e) => set('jobLimit', e.target.value)} />
          <FieldDescription>A scan stops after this many jobs, across pages; -1 scans every job.</FieldDescription>
        </Field>
        <Field orientation="horizontal" className="sm:col-span-2">
          <Switch id="hide-approved" checked={draft.hideApproved} onCheckedChange={(v) => set('hideApproved', v)} />
          <div className="space-y-0.5">
            <FieldLabel htmlFor="hide-approved">Also hide approved jobs on LinkedIn</FieldLabel>
            <FieldDescription>Rejected jobs are always hidden; this hides the approved ones too once they are saved.</FieldDescription>
          </div>
        </Field>
        <Field orientation="horizontal" className="sm:col-span-2">
          <Switch id="beta-mode" checked={draft.betaMode} onCheckedChange={(v) => set('betaMode', v)} />
          <div className="space-y-0.5">
            <FieldLabel htmlFor="beta-mode">Scan LinkedIn&apos;s AI search page (beta)</FieldLabel>
            <FieldDescription>For LinkedIn&apos;s chat-style job search, which has a different layout from the classic results.</FieldDescription>
          </div>
        </Field>
        <Field orientation="horizontal" className="sm:col-span-2">
          <Switch id="send-logs" checked={draft.sendLogs} onCheckedChange={(v) => set('sendLogs', v)} />
          <div className="space-y-0.5">
            <FieldLabel htmlFor="send-logs">Send scan logs to the server</FieldLabel>
            <FieldDescription>
              Uploads {name ? `${name}'s` : 'your'} scan log at the end of each scan, to Logs → Extension. Only for finding problems.
            </FieldDescription>
          </div>
        </Field>
      </FieldGroup>
      <SaveBar
        dirtyLabels={dirty.map((k) => LABELS[k])}
        saving={saving}
        error={saveError}
        onSave={() => void save()}
        onDiscard={() => {
          setDraft(saved);
          setSaveError(null);
        }}
      />
    </SectionCard>
  );
}
