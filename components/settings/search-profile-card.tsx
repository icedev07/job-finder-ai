'use client';

import { SparklesIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SectionCard } from '@/components/common/section-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/clientApi';
import type { CandidateProfile } from '@/lib/profileModel';
import {
  AGE_CHOICES,
  EUROPE_COUNTRIES,
  MAX_COUNTRIES,
  MAX_ROLES,
  parseSearchProfile,
  suggestRoles,
  type SearchProfile,
  type TitleMatch,
  type Workplace,
} from '@/lib/searchProfile';

// Settings → What to look for: the roles and places the boards are searched
// for, and the free check every posting goes through before the AI.

const AGE_ITEMS = AGE_CHOICES.map((d) => ({
  value: String(d),
  label: d === 0 ? 'Any age' : d === 1 ? 'The last day' : `The last ${d} days`,
}));

const WORKPLACE_LABEL: Record<Workplace, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' };

const TITLE_MATCH: { value: TitleMatch; label: string; help: string }[] = [
  { value: 'loose', label: 'Loose', help: 'The title has a word of a role, and the posting has all of them.' },
  { value: 'strict', label: 'Strict', help: 'The title has every word of a role.' },
  { value: 'off', label: 'Off', help: 'Any title; only the other checks.' },
];

const lines = (text: string) => text.split('\n');
const commas = (text: string) => text.split(',');
const same = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);

export function SearchProfileCard({
  value,
  onChange,
  whose,
}: {
  /** The profile as saved (JSON). */
  value: string;
  onChange: (json: string) => void;
  /** "Anna's" or "your". */
  whose: string;
}) {
  const profile = parseSearchProfile(value);
  // Stored the way the server stores it, so the save bar only shows real changes.
  const update = (patch: Partial<SearchProfile>) => onChange(JSON.stringify(parseSearchProfile(JSON.stringify({ ...profile, ...patch }))));

  // The text as typed; the saved lists are its cleaned-up words.
  const [rolesText, setRolesText] = useState(profile.roles.join('\n'));
  const [excludeText, setExcludeText] = useState(profile.exclude.join(', '));
  const cleaned = (text: string, split: (t: string) => string[], key: 'roles' | 'exclude') =>
    parseSearchProfile(JSON.stringify({ [key]: split(text) }))[key];
  if (!same(cleaned(rolesText, lines, 'roles'), profile.roles)) setRolesText(profile.roles.join('\n'));
  if (!same(cleaned(excludeText, commas, 'exclude'), profile.exclude)) setExcludeText(profile.exclude.join(', '));

  const [suggesting, setSuggesting] = useState(false);
  async function suggest() {
    setSuggesting(true);
    try {
      const { profile: candidate } = await api<{ profile: CandidateProfile }>('/api/admin/profile');
      const added = suggestRoles(candidate).filter((r) => !profile.roles.some((o) => o.toLowerCase() === r.toLowerCase()));
      if (!added.length) {
        toast.info('Nothing new in the profile: fill in its headline or experience first (Profile & resumes).');
        return;
      }
      const roles = [...profile.roles, ...added].slice(0, MAX_ROLES);
      setRolesText(roles.join('\n'));
      update({ roles });
      toast.success(`Added from the profile: ${added.join(', ')}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSuggesting(false);
    }
  }

  const toggleCountry = (code: string, on: boolean) =>
    update({ countries: on ? [...profile.countries, code] : profile.countries.filter((c) => c !== code) });
  const toggleWorkplace = (w: Workplace, on: boolean) => {
    const next = on ? [...profile.workplaces, w] : profile.workplaces.filter((x) => x !== w);
    if (next.length) update({ workplaces: next });
  };

  return (
    <div id="search" className="scroll-mt-20">
      <SectionCard
        title="What to look for"
        description={`The roles and places ${whose} job boards are searched for. Every posting is also checked here, for free, before the AI: another role, another country, too old or remote but closed to Europe never costs an AI call.`}
      >
        <FieldGroup className="grid gap-4 lg:grid-cols-2">
          <Field>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="search-roles">Roles (one per line)</FieldLabel>
              <Button size="xs" variant="ghost" onClick={() => void suggest()} disabled={suggesting}>
                {suggesting ? <Spinner /> : <SparklesIcon />}
                Suggest from the profile
              </Button>
            </div>
            <Textarea
              id="search-roles"
              rows={4}
              value={rolesText}
              onChange={(e) => {
                setRolesText(e.target.value);
                update({ roles: lines(e.target.value) });
              }}
              placeholder={'Backend Developer\n.NET Developer'}
            />
            <FieldDescription>
              Up to {MAX_ROLES}. Each is searched on the boards that can search, and a posting must fit one: developer, engineer
              and Entwickler mean the same, and so do back-end and backend.
              {profile.roles.length === 0 &&
                ` With none, the boards that search find nothing on ${whose} behalf, and the other boards' postings go to the AI whatever their role.`}
            </FieldDescription>
          </Field>
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="search-exclude">Leave out titles with</FieldLabel>
              <Input
                id="search-exclude"
                value={excludeText}
                onChange={(e) => {
                  setExcludeText(e.target.value);
                  update({ exclude: commas(e.target.value) });
                }}
                placeholder="Intern, Werkstudent, Sales"
              />
              <FieldDescription>Comma-separated whole words: “Intern” leaves out “Backend Intern”, not “International”.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Posted within</FieldLabel>
              <Select items={AGE_ITEMS} value={String(profile.maxAgeDays)} onValueChange={(v) => update({ maxAgeDays: Number(v) })}>
                <SelectTrigger className="w-48" aria-label="Posted within">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGE_ITEMS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </FieldGroup>

        <Field>
          <FieldLabel>
            Countries for on-site and hybrid jobs{' '}
            <span className="font-normal text-muted-foreground">
              ({profile.countries.length ? `${profile.countries.length} chosen` : 'none: any country'}, up to {MAX_COUNTRIES})
            </span>
          </FieldLabel>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-5" data-testid="search-countries">
            {EUROPE_COUNTRIES.map((c) => {
              const on = profile.countries.includes(c.code);
              return (
                <label key={c.code} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={on}
                    disabled={!on && profile.countries.length >= MAX_COUNTRIES}
                    onCheckedChange={(v) => toggleCountry(c.code, !!v)}
                  />
                  {c.name}
                </label>
              );
            })}
          </div>
          <FieldDescription>
            Boards with countries (search engines, national job services) search each role in each of these. Remote jobs can be
            anywhere.
          </FieldDescription>
        </Field>

        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel>Workplace</FieldLabel>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {(Object.keys(WORKPLACE_LABEL) as Workplace[]).map((w) => (
                <label key={w} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={profile.workplaces.includes(w)}
                    disabled={profile.workplaces.length === 1 && profile.workplaces.includes(w)}
                    onCheckedChange={(v) => toggleWorkplace(w, !!v)}
                  />
                  {WORKPLACE_LABEL[w]}
                </label>
              ))}
            </div>
            <FieldDescription>A posting the board marks as another workplace is left out.</FieldDescription>
          </Field>
          <div className="space-y-3">
            <Field orientation="horizontal">
              <Switch id="search-remote-europe" checked={profile.remoteEurope} onCheckedChange={(v) => update({ remoteEurope: !!v })} />
              <div className="space-y-0.5">
                <FieldLabel htmlFor="search-remote-europe">Remote jobs must be open to Europe</FieldLabel>
                <FieldDescription>Leaves out remote postings that say “US only”, “must be based in the US” and the like.</FieldDescription>
              </div>
            </Field>
            <Field orientation="horizontal">
              <Switch id="search-english" checked={profile.englishOnly} onCheckedChange={(v) => update({ englishOnly: !!v })} />
              <div className="space-y-0.5">
                <FieldLabel htmlFor="search-english">English-language postings only</FieldLabel>
                <FieldDescription>Leaves out postings written in German, French, Polish and so on.</FieldDescription>
              </div>
            </Field>
          </div>
        </FieldGroup>

        <Field>
          <FieldLabel>How closely the title must fit a role</FieldLabel>
          <RadioGroup
            value={profile.titleMatch}
            onValueChange={(v) => update({ titleMatch: v as TitleMatch })}
            className="grid gap-2 sm:grid-cols-3"
            aria-label="How closely the title must fit a role"
          >
            {TITLE_MATCH.map((t) => (
              <Field key={t.value} orientation="horizontal">
                <RadioGroupItem value={t.value} id={`title-match-${t.value}`} />
                <div className="space-y-0.5">
                  <FieldLabel htmlFor={`title-match-${t.value}`}>{t.label}</FieldLabel>
                  <FieldDescription>{t.help}</FieldDescription>
                </div>
              </Field>
            ))}
          </RadioGroup>
        </Field>
      </SectionCard>
    </div>
  );
}
