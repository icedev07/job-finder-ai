'use client';

import { FlaskConicalIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { HealthLine, TestResultBox, type ProviderHealth, type TestResult } from '@/components/ai/shared';
import { SaveBar } from '@/components/common/save-bar';
import { SecretField } from '@/components/common/secret-field';
import { SectionCard } from '@/components/common/section-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CLAUDE_MODELS } from '@/lib/aiRoutes';
import { api, errorMessage } from '@/lib/clientApi';
import { saveAdminConfig, type AdminConfig } from '@/lib/useAdminConfig';

const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  gemini_model: [
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (recommended)' },
    { value: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite (most free req/day)' },
    { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
    { value: 'gemini-flash-latest', label: 'gemini-flash-latest' },
  ],
  groq_model: [
    { value: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant (most free req/day)' },
    { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile (higher quality)' },
    { value: 'openai/gpt-oss-20b', label: 'openai/gpt-oss-20b' },
  ],
  cerebras_model: [
    { value: 'llama-3.3-70b', label: 'llama-3.3-70b (recommended)' },
    { value: 'llama3.1-8b', label: 'llama3.1-8b (fastest)' },
    { value: 'gpt-oss-120b', label: 'gpt-oss-120b' },
  ],
  cloudflare_model: [
    { value: '@cf/meta/llama-3.1-8b-instruct', label: 'llama-3.1-8b-instruct (recommended)' },
    { value: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'llama-3.3-70b-instruct-fp8-fast' },
    { value: '@cf/openai/gpt-oss-120b', label: 'gpt-oss-120b' },
  ],
  openrouter_model: [
    { value: 'auto', label: 'auto — discover free models live (recommended)' },
    { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'meta-llama/llama-3.3-70b-instruct:free' },
    { value: 'qwen/qwen-2.5-72b-instruct:free', label: 'qwen/qwen-2.5-72b-instruct:free' },
    { value: 'google/gemma-2-9b-it:free', label: 'google/gemma-2-9b-it:free' },
  ],
  openrouter_paid_model: [
    { value: 'meta-llama/llama-3.1-8b-instruct', label: 'meta-llama/llama-3.1-8b-instruct (cheapest)' },
    { value: 'mistralai/mistral-nemo', label: 'mistralai/mistral-nemo' },
    { value: 'meta-llama/llama-3.3-70b-instruct', label: 'meta-llama/llama-3.3-70b-instruct (smarter)' },
    { value: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash' },
  ],
};

const DRAFT_KEYS = [
  'gemini_model',
  'groq_model',
  'cerebras_model',
  'cloudflare_model',
  'cloudflare_account_id',
  'openrouter_model',
  'openrouter_paid_model',
  'openrouter_tier',
] as const;
type DraftKey = (typeof DRAFT_KEYS)[number];

const DRAFT_LABEL: Record<DraftKey, string> = {
  gemini_model: 'Gemini model',
  groq_model: 'Groq model',
  cerebras_model: 'Cerebras model',
  cloudflare_model: 'Cloudflare model',
  cloudflare_account_id: 'Cloudflare account',
  openrouter_model: 'OpenRouter free model',
  openrouter_paid_model: 'OpenRouter paid model',
  openrouter_tier: 'OpenRouter tier',
};

function ModelSelect({ name, value, onChange }: { name: DraftKey; value: string; onChange: (v: string) => void }) {
  const options = MODEL_OPTIONS[name] ?? [];
  const items = options.some((o) => o.value === value) || !value ? options : [...options, { value, label: `${value} (saved)` }];
  return (
    <Select items={items} value={value} onValueChange={(v) => onChange(String(v))}>
      <SelectTrigger className="w-full" aria-label={DRAFT_LABEL[name]}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProvidersTab({
  config,
  health,
  reload,
}: {
  config: AdminConfig;
  health: Record<string, ProviderHealth>;
  reload: () => void;
}) {
  const saved = useMemo(() => Object.fromEntries(DRAFT_KEYS.map((k) => [k, config[k] ?? ''])) as Record<DraftKey, string>, [config]);
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [tests, setTests] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [liveModels, setLiveModels] = useState<{ id: string; displayName: string }[] | null>(null);

  // Fresh config from the server replaces the draft.
  const [lastSaved, setLastSaved] = useState(saved);
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setDraft(saved);
  }

  const dirty = DRAFT_KEYS.filter((k) => draft[k] !== saved[k]);
  const set = (k: DraftKey) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const secrets = config.secrets ?? {};

  async function save() {
    setSaving(true);
    try {
      await saveAdminConfig(Object.fromEntries(dirty.map((k) => [k, draft[k]])));
      toast.success('Provider settings saved');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function test(target: string) {
    setTesting(target);
    setTests((t) => ({ ...t, [target]: null }));
    try {
      const r = await api<TestResult>('/api/admin/test-connection', { method: 'POST', json: { target } });
      setTests((t) => ({ ...t, [target]: r }));
    } catch (e) {
      setTests((t) => ({ ...t, [target]: { ok: false, error: errorMessage(e) } }));
    } finally {
      setTesting(null);
    }
  }

  async function loadModels() {
    try {
      const r = await api<{ ok: boolean; error?: string; live: { id: string; displayName: string }[] }>('/api/admin/ai/models');
      if (!r.ok) toast.error(r.error ?? 'Could not list models');
      setLiveModels(r.live ?? []);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const testButton = (target: string, label: string) => (
    <Button size="sm" variant="outline" onClick={() => void test(target)} disabled={testing !== null}>
      {testing === target ? <Spinner /> : <FlaskConicalIcon />}
      Test {label}
    </Button>
  );

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Keys are write-only: they are never sent back to the browser. Which provider does which job is set per task in{' '}
        <strong>Routes</strong>. A test uses the saved key, so save a new key before testing it.
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              Claude <Badge variant="secondary">your key · paid</Badge>
            </span>
          }
          description="Best verdict quality, strict JSON, reads resume PDFs and drafts form answers. Billed to your Anthropic account."
          className="xl:col-span-2"
        >
          <SecretField
            configKey="anthropic_api_key"
            label="Anthropic API key"
            description={
              <>
                Create one at{' '}
                <a className="underline" href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener noreferrer">
                  platform.claude.com
                </a>
                . Also set a spend limit there as a backstop to the monthly budget in Usage &amp; cost.
              </>
            }
            placeholder="sk-ant-…"
            state={secrets.anthropic_api_key}
            onSaved={reload}
          />
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {CLAUDE_MODELS.map((m) => (
              <div key={m.id} className="rounded-lg border p-2">
                <p className="font-medium">{m.label}</p>
                <p className="tabular text-xs text-muted-foreground">
                  ${m.price.input} in · ${m.price.output} out · ${m.price.cacheRead} cached / MTok
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{m.note}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {testButton('claude', 'Claude')}
            <Button size="sm" variant="ghost" onClick={() => void loadModels()} disabled={!secrets.anthropic_api_key?.set}>
              List models for this key
            </Button>
          </div>
          {liveModels ? (
            <div className="flex flex-wrap gap-1">
              {liveModels.length === 0 ? (
                <span className="text-xs text-muted-foreground">No models returned.</span>
              ) : (
                liveModels.map((m) => (
                  <Badge key={m.id} variant="outline" title={m.displayName}>
                    {m.id}
                  </Badge>
                ))
              )}
            </div>
          ) : null}
          <TestResultBox result={tests.claude ?? null} />
          <HealthLine health={health.claude} />
        </SectionCard>

        <SectionCard title="Gemini" description="Free, no card. Big context — handles batched board scans.">
          <SecretField
            configKey="gemini_api_key"
            label="API key"
            description="aistudio.google.com/apikey"
            placeholder="AIzaSy…"
            state={secrets.gemini_api_key}
            onSaved={reload}
          />
          <div className="space-y-1.5">
            <Label>Model</Label>
            <ModelSelect name="gemini_model" value={draft.gemini_model} onChange={set('gemini_model')} />
          </div>
          {testButton('gemini', 'Gemini')}
          <TestResultBox result={tests.gemini ?? null} />
          <HealthLine health={health.gemini} />
        </SectionCard>

        <SectionCard title="Groq" description="Free, no card. Very fast — good for the LinkedIn extension.">
          <SecretField configKey="groq_api_key" label="API key" description="console.groq.com/keys" placeholder="gsk_…" state={secrets.groq_api_key} onSaved={reload} />
          <div className="space-y-1.5">
            <Label>Model</Label>
            <ModelSelect name="groq_model" value={draft.groq_model} onChange={set('groq_model')} />
          </div>
          {testButton('groq', 'Groq')}
          <TestResultBox result={tests.groq ?? null} />
          <HealthLine health={health.groq} />
        </SectionCard>

        <SectionCard title="Cerebras" description="Free, no card. 1M tokens/day, 8K context — fast single-job verdicts.">
          <SecretField configKey="cerebras_api_key" label="API key" description="cloud.cerebras.ai" placeholder="csk-…" state={secrets.cerebras_api_key} onSaved={reload} />
          <div className="space-y-1.5">
            <Label>Model</Label>
            <ModelSelect name="cerebras_model" value={draft.cerebras_model} onChange={set('cerebras_model')} />
          </div>
          {testButton('cerebras', 'Cerebras')}
          <TestResultBox result={tests.cerebras ?? null} />
          <HealthLine health={health.cerebras} />
        </SectionCard>

        <SectionCard title="OpenRouter" description="Many free models, with an optional cheap paid fallback.">
          <SecretField
            configKey="openrouter_api_key"
            label="API key"
            description="openrouter.ai/settings/keys"
            placeholder="sk-or-v1-…"
            state={secrets.openrouter_api_key}
            onSaved={reload}
          />
          <div className="space-y-1.5">
            <Label>Routing tier</Label>
            <ToggleGroup
              value={[draft.openrouter_tier || 'auto']}
              onValueChange={(v) => {
                const next = (v as string[])[0];
                if (next) set('openrouter_tier')(next);
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="auto">Auto</ToggleGroupItem>
              <ToggleGroupItem value="free">Free only</ToggleGroupItem>
              <ToggleGroupItem value="nitro">Nitro (paid, fastest)</ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              Auto: free models first, cheap paid fallback when free is busy. Free only never pays. Nitro always uses the paid model on the fastest host.
            </p>
          </div>
          {draft.openrouter_tier !== 'nitro' ? (
            <div className="space-y-1.5">
              <Label>Free model</Label>
              <ModelSelect name="openrouter_model" value={draft.openrouter_model || 'auto'} onChange={set('openrouter_model')} />
            </div>
          ) : null}
          {draft.openrouter_tier !== 'free' ? (
            <div className="space-y-1.5">
              <Label>Paid model {draft.openrouter_tier !== 'nitro' ? '(fallback only)' : ''}</Label>
              <ModelSelect name="openrouter_paid_model" value={draft.openrouter_paid_model} onChange={set('openrouter_paid_model')} />
            </div>
          ) : null}
          {testButton('openrouter', 'OpenRouter')}
          <TestResultBox result={tests.openrouter ?? null} />
          <HealthLine health={health.openrouter} />
        </SectionCard>

        <SectionCard title="Cloudflare Workers AI" description="Free, no card. 10,000 Neurons/day.">
          <div className="space-y-1.5">
            <Label htmlFor="cf-account">Account ID</Label>
            <Input
              id="cf-account"
              value={draft.cloudflare_account_id}
              onChange={(e) => set('cloudflare_account_id')(e.target.value)}
              placeholder="32-character account id"
              className="font-mono"
            />
          </div>
          <SecretField
            configKey="cloudflare_api_key"
            label="API token"
            description="dash.cloudflare.com → AI → Workers AI → Use REST API"
            placeholder="Workers AI token"
            state={secrets.cloudflare_api_key}
            onSaved={reload}
          />
          <div className="space-y-1.5">
            <Label>Model</Label>
            <ModelSelect name="cloudflare_model" value={draft.cloudflare_model} onChange={set('cloudflare_model')} />
          </div>
          {testButton('cloudflare', 'Cloudflare')}
          <TestResultBox result={tests.cloudflare ?? null} />
          <HealthLine health={health.cloudflare} />
        </SectionCard>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {testButton('rotation', 'every provider on a route')}
      </div>
      <TestResultBox result={tests.rotation ?? null} />

      <SaveBar
        dirtyLabels={dirty.map((k) => DRAFT_LABEL[k])}
        saving={saving}
        onSave={() => void save()}
        onDiscard={() => setDraft(saved)}
      />
    </div>
  );
}
