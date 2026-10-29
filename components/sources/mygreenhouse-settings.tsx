'use client';

import { CookieIcon, ExternalLinkIcon, MapPinIcon, SlidersHorizontalIcon } from 'lucide-react';
import { useId } from 'react';

import {
  MYGH_DATE_POSTED,
  MYGH_EMPLOYMENT_TYPES,
  MYGH_SALARY,
  MYGH_WORK_TYPES,
  splitCsv,
} from '@/components/sources/catalog';
import type { ScannerConfig } from '@/components/sources/scan-results';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Stands for the empty config value ("no filter") inside the selects.
const ANY = '__any';

type Option = { value: string; label: string };

function FacetSelect({
  id,
  value,
  anyLabel,
  options,
  onChange,
}: {
  id: string;
  value: string | undefined;
  anyLabel: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const items = [{ value: ANY, label: anyLabel }, ...options];
  return (
    <Select
      items={items}
      value={value || ANY}
      onValueChange={(v) => {
        if (v !== null) onChange(v === ANY ? '' : v);
      }}
    >
      <SelectTrigger id={id} className="w-full">
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

function CheckboxGroup({
  legend,
  idPrefix,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  idPrefix: string;
  options: Option[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <FieldSet className="gap-2">
      <FieldLegend variant="label" className="mb-0">
        {legend}
      </FieldLegend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((o) => {
          const id = `${idPrefix}-${o.value}`;
          return (
            <div key={o.value} className="flex items-center gap-2">
              <Checkbox id={id} checked={selected.includes(o.value)} onCheckedChange={() => onToggle(o.value)} />
              <Label htmlFor={id} className="font-normal">
                {o.label}
              </Label>
            </div>
          );
        })}
      </div>
    </FieldSet>
  );
}

/**
 * MyGreenhouse session cookie and the portal's four search facets plus our location filter. Picks (selects,
 * checkboxes, the Europe preset) are saved at once; typed values on blur, like every other field on the page.
 */
export function MyGreenhouseSettings({
  config,
  onEdit,
  onSave,
  onPersist,
}: {
  config: ScannerConfig;
  onEdit: (key: string, value: string) => void;
  onSave: () => void;
  onPersist: (patch: ScannerConfig) => void;
}) {
  const id = useId();
  // Work type defaults to remote-only until it is touched, like the scanner,
  // whose historical behaviour is remote-only.
  const workTypes =
    'mygreenhouse_work_types' in config ? splitCsv(config.mygreenhouse_work_types) : ['remote'];
  const employmentTypes = splitCsv(config.mygreenhouse_employment_types);

  function toggle(key: string, current: string[], value: string) {
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onPersist({ [key]: next.join(',') });
  }

  return (
    <div className="grid gap-3 @3xl:grid-cols-2">
      <section className="space-y-3 rounded-lg border p-3" aria-labelledby={`${id}-session`}>
        <h4 id={`${id}-session`} className="flex items-center gap-1.5 text-sm font-medium">
          <CookieIcon className="size-4 text-muted-foreground" aria-hidden />
          Session
        </h4>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Sign in at{' '}
          <a
            href="https://my.greenhouse.io"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-4 hover:underline"
          >
            my.greenhouse.io
            <ExternalLinkIcon className="size-3" aria-hidden />
          </a>
          , open DevTools → Application → Cookies → my.greenhouse.io, and paste the{' '}
          <code className="rounded bg-muted px-1 font-mono">_session_id</code> value below: the bare value is fine,
          or the full <code className="rounded bg-muted px-1 font-mono">_session_id=&lt;value&gt;</code> pair. That
          one cookie is all the scanner needs, no CSRF / XSRF token. The session lasts ~2 weeks; paste it again when
          a scan warns that it expired.
        </p>
        <Field>
          <FieldLabel htmlFor={`${id}-cookie`}>Session cookie</FieldLabel>
          <Input
            id={`${id}-cookie`}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={config.mygreenhouse_session_cookie ?? ''}
            onChange={(e) => onEdit('mygreenhouse_session_cookie', e.target.value)}
            onBlur={onSave}
            placeholder="_session_id=05384b3f..."
            className="font-mono"
          />
        </Field>
      </section>

      <section className="@container space-y-3 rounded-lg border p-3" aria-labelledby={`${id}-facets`}>
        <h4 id={`${id}-facets`} className="flex items-center gap-1.5 text-sm font-medium">
          <SlidersHorizontalIcon className="size-4 text-muted-foreground" aria-hidden />
          Search facets
        </h4>
        <div className="grid gap-3 @sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${id}-date`}>Date posted</FieldLabel>
            <FacetSelect
              id={`${id}-date`}
              value={config.mygreenhouse_date_posted}
              anyLabel="Any time"
              options={MYGH_DATE_POSTED}
              onChange={(v) => onPersist({ mygreenhouse_date_posted: v })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-salary`}>Minimum salary</FieldLabel>
            <FacetSelect
              id={`${id}-salary`}
              value={config.mygreenhouse_salary}
              anyLabel="Any salary"
              options={MYGH_SALARY}
              onChange={(v) => onPersist({ mygreenhouse_salary: v })}
            />
          </Field>
          <CheckboxGroup
            legend="Work type"
            idPrefix={`${id}-work`}
            options={MYGH_WORK_TYPES}
            selected={workTypes}
            onToggle={(v) => toggle('mygreenhouse_work_types', workTypes, v)}
          />
          <CheckboxGroup
            legend="Employment type"
            idPrefix={`${id}-employment`}
            options={MYGH_EMPLOYMENT_TYPES}
            selected={employmentTypes}
            onToggle={(v) => toggle('mygreenhouse_employment_types', employmentTypes, v)}
          />
          <Field className="@sm:col-span-2">
            <FieldLabel htmlFor={`${id}-locations`}>Locations</FieldLabel>
            <div className="flex gap-2">
              <Input
                id={`${id}-locations`}
                value={config.mygreenhouse_locations ?? ''}
                onChange={(e) => onEdit('mygreenhouse_locations', e.target.value)}
                onBlur={onSave}
                placeholder="e.g. Europe, Germany, Remote — blank = all locations"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => onPersist({ mygreenhouse_locations: 'Europe' })}
              >
                <MapPinIcon />
                Europe
              </Button>
            </div>
            <FieldDescription className="text-xs">
              Comma-separated. The keyword <code className="rounded bg-muted px-1 font-mono">Europe</code> matches
              every EU/EEA country plus remote roles. Jobs whose location does not match are dropped before AI
              analysis.
            </FieldDescription>
          </Field>
        </div>
      </section>
    </div>
  );
}
