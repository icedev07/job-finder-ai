'use client';

import { GlobeIcon, KeyRoundIcon, PlayIcon, RotateCcwIcon } from 'lucide-react';
import { useId } from 'react';

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
import { cn } from '@/lib/utils';

function AuthBadge({ source, config }: { source: SourceDef; config: ScannerConfig }) {
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

/** One job board: enable switch, search settings, the last run and the Run / Reset actions. */
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
}) {
  const id = useId();
  const urlKey = `${source.key}_search_url`;
  const maxKey = `${source.key}_max_jobs`;
  const enabledKey = `${source.key}_enabled`;
  const enabled = config[enabledKey] !== 'false';
  const search = config[urlKey] ?? source.defaultSearchUrl;
  const canReset = Boolean(source.defaultSearchUrl) && search !== source.defaultSearchUrl;
  const portal = source.key === 'mygreenhouse';

  return (
    <Card className={cn(portal && 'col-span-full', !enabled && 'bg-muted/30')}>
      <CardHeader>
        <CardTitle className={cn(!enabled && 'text-muted-foreground')}>{source.label}</CardTitle>
        <CardDescription className="space-y-1.5">
          <span className="flex flex-wrap items-center gap-1.5">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/80">{source.key}</code>
            <AuthBadge source={source} config={config} />
          </span>
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
          <div className="grid items-start gap-3 @xs:grid-cols-[minmax(0,1fr)_6rem]">
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
              {source.searchHelp ? (
                <FieldDescription className="text-xs">{source.searchHelp}</FieldDescription>
              ) : null}
            </Field>
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
