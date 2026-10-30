'use client';

import { GlobeIcon, KeyRoundIcon, MapPinIcon, PlayIcon, RotateCcwIcon, SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';
import { toast } from 'sonner';

import { SecretField } from '@/components/common/secret-field';
import type { SourceDef } from '@/components/sources/catalog';
import { MyGreenhouseSettings } from '@/components/sources/mygreenhouse-settings';
import { RunResult } from '@/components/sources/run-summary';
import type { RunSummary, ScannerConfig } from '@/components/sources/scan-results';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { errorMessage } from '@/lib/clientApi';
import { SOURCE_META, sourceEnabled } from '@/lib/sourceMeta';
import { saveAdminConfig, type AdminConfig } from '@/lib/useAdminConfig';
import { cn } from '@/lib/utils';

/** Whether every key a source needs is set. */
function keysSet(source: SourceDef, appConfig: AdminConfig | null): boolean {
  return (source.keys ?? []).every((k) => (k.secret ? appConfig?.secrets?.[k.configKey]?.set : appConfig?.[k.configKey]?.trim()));
}

function AuthBadge({ source, config, appConfig }: { source: SourceDef; config: ScannerConfig; appConfig: AdminConfig | null }) {
  if (source.auth === 'key') {
    return keysSet(source, appConfig) ? (
      <Badge variant="secondary" title="Its key is saved">
        <KeyRoundIcon />
        Key set
      </Badge>
    ) : (
      <Badge variant="destructive" title="Add its free key below before scanning">
        <KeyRoundIcon />
        Key missing
      </Badge>
    );
  }
  if (source.auth === 'public') {
    return (
      <Badge variant="outline" className="text-muted-foreground" title="Public feed: no login or API key">
        <GlobeIcon />
        Public
      </Badge>
    );
  }
  const hasCookie = Boolean(config.mygreenhouse_session_cookie?.trim());
  return hasCookie ? (
    <Badge variant="secondary" title="Scans with your pasted session cookie">
      <KeyRoundIcon />
      Session cookie
    </Badge>
  ) : (
    <Badge variant="destructive" title="Paste your session cookie below before scanning">
      <KeyRoundIcon />
      Cookie missing
    </Badge>
  );
}

/** A key that is not secret (Adzuna's app ID): an input with its own Save. */
function PlainKeyField({
  configKey,
  label,
  placeholder,
  appConfig,
  onSaved,
}: {
  configKey: string;
  label: string;
  placeholder: string;
  appConfig: AdminConfig | null;
  onSaved: () => void;
}) {
  const id = useId();
  const saved = appConfig?.[configKey] ?? '';
  const [value, setValue] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  const [saving, setSaving] = useState(false);
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setValue(saved);
  }
  async function save() {
    setSaving(true);
    try {
      await saveAdminConfig({ [configKey]: value.trim() });
      toast.success(`${label} saved`);
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 font-mono md:text-xs"
        />
        <Button size="sm" variant="outline" onClick={() => void save()} disabled={saving || value.trim() === saved}>
          {saving ? <Spinner /> : null}
          Save
        </Button>
      </div>
    </Field>
  );
}

/** One job board: enable switch, search settings or keys, the last run and the Run / Reset actions. */
export function SourceCard({
  source,
  config,
  result,
  scanning,
  canRun,
  now,
  onEdit,
  onSave,
  onPersist,
  onRun,
  appConfig,
  onKeysSaved,
}: {
  source: SourceDef;
  config: ScannerConfig;
  /** This page's run of the board, else its newest scan log. */
  result: RunSummary | null;
  scanning: boolean;
  /** False while any other scan runs. */
  canRun: boolean;
  now: number | null;
  onEdit: (key: string, value: string) => void;
  onSave: () => void;
  onPersist: (patch: ScannerConfig) => void;
  onRun: () => void;
  /** The app-wide settings: the keys some sources need. */
  appConfig: AdminConfig | null;
  onKeysSaved: () => void;
}) {
  const id = useId();
  const urlKey = `${source.key}_search_url`;
  const maxKey = `${source.key}_max_jobs`;
  const enabledKey = `${source.key}_enabled`;
  const enabled = sourceEnabled(source.key, config);
  const search = config[urlKey] ?? source.defaultSearchUrl;
  const canReset = Boolean(source.defaultSearchUrl) && search !== source.defaultSearchUrl;
  const portal = source.key === 'mygreenhouse';
  const meta = SOURCE_META[source.key];

  return (
    <Card className={cn(portal && 'col-span-full', !enabled && 'bg-muted/30')} data-testid={`source-${source.key}`}>
      <CardHeader>
        <CardTitle className={cn(!enabled && 'text-muted-foreground')}>{source.label}</CardTitle>
        <CardDescription className="space-y-1.5">
          <span className="flex flex-wrap items-center gap-1.5">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/80">{source.key}</code>
            <AuthBadge source={source} config={config} appConfig={appConfig} />
          </span>
          {meta ? (
            <span className="flex items-center gap-1 text-xs text-foreground/80">
              <MapPinIcon className="size-3 shrink-0" />
              {meta.coverage}
            </span>
          ) : null}
          <span className="block text-xs leading-relaxed">{source.summary}</span>
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <Label htmlFor={`${id}-enabled`} className="text-xs font-normal text-muted-foreground">
            Enabled
          </Label>
          <Switch
            id={`${id}-enabled`}
            aria-label={`${source.label} enabled`}
            checked={enabled}
            onCheckedChange={(checked) => onPersist({ [enabledKey]: String(checked) })}
          />
        </CardAction>
      </CardHeader>

      <CardContent className="@container flex flex-1 flex-col gap-4">
        <div className={cn('flex flex-col gap-4', !enabled && 'opacity-60')}>
          {portal ? (
            <MyGreenhouseSettings config={config} onEdit={onEdit} onSave={onSave} onPersist={onPersist} />
          ) : null}
          {source.keys?.length ? (
            <div className="space-y-3">
              {source.keys.map((k) =>
                k.secret ? (
                  <SecretField
                    key={k.configKey}
                    configKey={k.configKey}
                    label={k.label}
                    placeholder={k.placeholder}
                    state={appConfig?.secrets?.[k.configKey]}
                    onSaved={onKeysSaved}
                  />
                ) : (
                  <PlainKeyField
                    key={k.configKey}
                    configKey={k.configKey}
                    label={k.label}
                    placeholder={k.placeholder}
                    appConfig={appConfig}
                    onSaved={onKeysSaved}
                  />
                ),
              )}
            </div>
          ) : null}
          <div className="grid items-start gap-3 @xs:grid-cols-[minmax(0,1fr)_6rem]">
            {source.searches ? (
              <div className="space-y-1 rounded-lg border p-3 text-xs" data-testid="source-searches">
                <p className="flex items-center gap-1.5 font-medium text-foreground">
                  <SearchIcon className="size-3.5" />
                  Searches each user&apos;s roles in their countries
                </p>
                <p className="text-muted-foreground">
                  From{' '}
                  <Link href="/admin/settings#search" className="underline underline-offset-2">
                    Settings → What to look for
                  </Link>
                  . Max jobs is for each search.
                </p>
              </div>
            ) : (
              <Field>
                <FieldLabel htmlFor={`${id}-search`}>Search params / slugs</FieldLabel>
                <Input
                  id={`${id}-search`}
                  value={search}
                  onChange={(e) => onEdit(urlKey, e.target.value)}
                  onBlur={onSave}
                  placeholder={source.searchPlaceholder}
                  spellCheck={false}
                  className="font-mono md:text-xs"
                />
                {source.searchHelp ? <FieldDescription className="text-xs">{source.searchHelp}</FieldDescription> : null}
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor={`${id}-max`}>Max jobs</FieldLabel>
              <Input
                id={`${id}-max`}
                type="number"
                inputMode="numeric"
                min={1}
                max={200}
                value={config[maxKey] ?? String(source.defaultMax)}
                onChange={(e) => onEdit(maxKey, e.target.value)}
                onBlur={onSave}
                className="tabular"
              />
            </Field>
          </div>
          {source.note ? <p className="text-xs text-muted-foreground">{source.note}</p> : null}
        </div>
        <RunResult summary={result} scanning={scanning} now={now} className="mt-auto" />
      </CardContent>

      <CardFooter className="justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={!canReset}
          onClick={() => onPersist({ [urlKey]: source.defaultSearchUrl })}
          aria-label={`Reset the ${source.label} search to its default`}
          title={source.defaultSearchUrl ? 'Restore the default search' : 'This source has no default search'}
        >
          <RotateCcwIcon />
          Reset
        </Button>
        <Button size="sm" disabled={!canRun || !enabled} onClick={onRun} aria-label={`Run ${source.label}`}>
          {scanning ? <Spinner /> : <PlayIcon />}
          {scanning ? 'Running…' : 'Run'}
        </Button>
      </CardFooter>
    </Card>
  );
}
