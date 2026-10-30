'use client';

import { PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useState } from 'react';

import { SectionCard } from '@/components/common/section-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DECLINE, type CandidateProfile, type ProfileEducation, type ProfileExperience } from '@/lib/profileModel';

type Set = (patch: Partial<CandidateProfile>) => void;

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  description,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  description?: string;
  type?: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

const TRI = [
  { value: 'unset', label: 'Not set' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

function TriSelect({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select
        items={TRI}
        value={value === null ? 'unset' : value ? 'yes' : 'no'}
        onValueChange={(v) => onChange(v === 'unset' ? null : v === 'yes')}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TRI.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

const EEO_OPTIONS: Record<keyof CandidateProfile['eeo'], string[]> = {
  gender: [DECLINE, 'Male', 'Female', 'Non-binary'],
  ethnicity: [DECLINE, 'White', 'Asian', 'Black or African American', 'Hispanic or Latino', 'Two or more races'],
  veteran: [DECLINE, 'I am not a protected veteran', 'I identify as one or more of the classifications of protected veteran'],
  disability: [DECLINE, 'No, I do not have a disability', 'Yes, I have a disability (or previously had a disability)'],
};

function SkillsEditor({ profile, set }: { profile: CandidateProfile; set: Set }) {
  const [name, setName] = useState('');
  const [years, setYears] = useState('');
  function add() {
    const n = name.trim();
    if (!n || profile.skills.some((s) => s.name.toLowerCase() === n.toLowerCase())) return;
    const y = years.trim() ? Number(years) : null;
    set({ skills: [...profile.skills, { name: n, years: y != null && Number.isFinite(y) ? y : null }] });
    setName('');
    setYears('');
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {profile.skills.length === 0 ? <span className="text-sm text-muted-foreground">No skills yet.</span> : null}
        {profile.skills.map((s) => (
          <Badge key={s.name} variant="secondary" className="gap-1 pr-1">
            {s.name}
            {s.years != null ? <span className="text-muted-foreground">· {s.years}y</span> : null}
            <button
              type="button"
              aria-label={`Remove ${s.name}`}
              className="rounded p-0.5 hover:bg-foreground/10"
              onClick={() => set({ skills: profile.skills.filter((x) => x.name !== s.name) })}
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Skill, e.g. C#"
          className="max-w-56"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Input value={years} onChange={(e) => setYears(e.target.value)} placeholder="Years" inputMode="decimal" className="w-24" />
        <Button type="button" variant="outline" onClick={add}>
          <PlusIcon />
          Add
        </Button>
      </div>
    </div>
  );
}

function ListEditor<T extends object>({
  items,
  onChange,
  empty,
  fields,
  blank,
  addLabel,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  empty: string;
  fields: { key: keyof T; label: string; wide?: boolean; multiline?: boolean }[];
  blank: T;
  addLabel: string;
}) {
  const update = (i: number, key: keyof T, value: string) =>
    onChange(items.map((it, j) => (j === i ? { ...it, [key]: value } : it)));
  return (
    <div className="space-y-3">
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : null}
      {items.map((item, i) => (
        <div key={i} className="relative grid gap-2 rounded-lg border p-3 pr-10 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={String(f.key)} className={f.wide ? 'space-y-1 sm:col-span-2' : 'space-y-1'}>
              <label className="text-xs text-muted-foreground">{f.label}</label>
              {f.multiline ? (
                <Textarea rows={2} value={String(item[f.key] ?? '')} onChange={(e) => update(i, f.key, e.target.value)} />
              ) : (
                <Input value={String(item[f.key] ?? '')} onChange={(e) => update(i, f.key, e.target.value)} />
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2"
            aria-label="Remove"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <Trash2Icon />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { ...blank }])}>
        <PlusIcon />
        {addLabel}
      </Button>
    </div>
  );
}

const BLANK_EXPERIENCE: ProfileExperience = { company: '', title: '', start: '', end: '', location: '', summary: '' };
const BLANK_EDUCATION: ProfileEducation = { school: '', degree: '', field: '', start: '', end: '' };

/** The profile form. Values are a controlled draft; the parent owns saving. */
export function ProfileForm({ profile, onChange }: { profile: CandidateProfile; onChange: (p: CandidateProfile) => void }) {
  const set: Set = (patch) => onChange({ ...profile, ...patch });
  const text = (key: keyof CandidateProfile) => (v: string) => set({ [key]: v } as Partial<CandidateProfile>);

  return (
    <div className="space-y-4">
      <SectionCard title="Contact" description="Filled into the name, e-mail, phone and link fields of application forms.">
        <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField id="first" label="First name" value={profile.firstName} onChange={text('firstName')} />
          <TextField id="last" label="Last name" value={profile.lastName} onChange={text('lastName')} />
          <TextField id="email" label="E-mail" type="email" value={profile.email} onChange={text('email')} />
          <TextField id="phone" label="Phone" type="tel" value={profile.phone} onChange={text('phone')} placeholder="+48 …" />
          <TextField id="city" label="City" value={profile.city} onChange={text('city')} placeholder="Warsaw" />
          <TextField id="country" label="Country" value={profile.country} onChange={text('country')} placeholder="Poland" />
          <TextField id="tz" label="Time zone" value={profile.timezone} onChange={text('timezone')} placeholder="UTC+1" />
          <TextField id="li" label="LinkedIn URL" value={profile.linkedin} onChange={text('linkedin')} placeholder="https://linkedin.com/in/…" />
          <TextField id="gh" label="GitHub URL" value={profile.github} onChange={text('github')} placeholder="https://github.com/…" />
          <TextField id="pf" label="Portfolio / website" value={profile.portfolio} onChange={text('portfolio')} />
        </FieldGroup>
      </SectionCard>

      <SectionCard title="About you" description="Used for matching and for drafting free-text answers.">
        <FieldGroup className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <TextField id="headline" label="Headline" value={profile.headline} onChange={text('headline')} placeholder="Senior .NET backend engineer" />
          <Field>
            <FieldLabel htmlFor="years">Years of experience</FieldLabel>
            <Input
              id="years"
              inputMode="decimal"
              value={profile.yearsExperience ?? ''}
              onChange={(e) => {
                const n = e.target.value.trim() ? Number(e.target.value) : null;
                set({ yearsExperience: n != null && Number.isFinite(n) ? n : null });
              }}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="summary">Summary</FieldLabel>
            <Textarea id="summary" rows={4} value={profile.summary} onChange={(e) => set({ summary: e.target.value })} />
          </Field>
        </FieldGroup>
      </SectionCard>

      <SectionCard
        title="Work terms"
        description="The questions most forms ask that a resume does not answer. Autofill uses these verbatim — keep them accurate."
      >
        <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="auth">Work authorization</FieldLabel>
            <Textarea
              id="auth"
              rows={2}
              value={profile.workAuthorization}
              onChange={(e) => set({ workAuthorization: e.target.value })}
              placeholder="EU citizen. No US work permit — open to contractor (B2B) or employer-of-record roles."
            />
          </Field>
          <TriSelect label="Needs visa sponsorship" value={profile.needsSponsorship} onChange={(v) => set({ needsSponsorship: v })} />
          <TriSelect label="Open to contractor / B2B" value={profile.contractorOk} onChange={(v) => set({ contractorOk: v })} />
          <TriSelect label="Willing to relocate" value={profile.willingToRelocate} onChange={(v) => set({ willingToRelocate: v })} />
          <TextField id="remote" label="Work mode" value={profile.remotePreference} onChange={text('remotePreference')} placeholder="Remote only" />
          <TextField id="notice" label="Notice period" value={profile.noticePeriod} onChange={text('noticePeriod')} placeholder="2 weeks" />
          <TextField id="avail" label="Available from" value={profile.availableFrom} onChange={text('availableFrom')} placeholder="Immediately" />
          <Field className="sm:col-span-2 lg:col-span-3">
            <FieldLabel htmlFor="salary">Salary expectation</FieldLabel>
            <Input id="salary" value={profile.salaryExpectation} onChange={(e) => set({ salaryExpectation: e.target.value })} placeholder="€4,500 / month gross, B2B" />
            <FieldDescription>Numeric salary fields get the first number; text fields get the whole line.</FieldDescription>
          </Field>
        </FieldGroup>
      </SectionCard>

      <SectionCard title="Skills">
        <SkillsEditor profile={profile} set={set} />
      </SectionCard>

      <SectionCard title="Languages">
        <ListEditor
          items={profile.languages}
          onChange={(languages) => set({ languages })}
          empty="No languages yet."
          blank={{ name: '', level: '' }}
          addLabel="Add a language"
          fields={[
            { key: 'name', label: 'Language' },
            { key: 'level', label: 'Level (e.g. C1, native)' },
          ]}
        />
      </SectionCard>

      <SectionCard title="Experience" description="Newest first.">
        <ListEditor
          items={profile.experience}
          onChange={(experience) => set({ experience })}
          empty="No experience yet — fill it in from a resume at the top of this tab."
          blank={BLANK_EXPERIENCE}
          addLabel="Add a role"
          fields={[
            { key: 'title', label: 'Title' },
            { key: 'company', label: 'Company' },
            { key: 'start', label: 'Start' },
            { key: 'end', label: 'End (or present)' },
            { key: 'location', label: 'Location', wide: true },
            { key: 'summary', label: 'What you did', wide: true, multiline: true },
          ]}
        />
      </SectionCard>

      <SectionCard title="Education">
        <ListEditor
          items={profile.education}
          onChange={(education) => set({ education })}
          empty="No education yet."
          blank={BLANK_EDUCATION}
          addLabel="Add education"
          fields={[
            { key: 'school', label: 'School', wide: true },
            { key: 'degree', label: 'Degree' },
            { key: 'field', label: 'Field' },
            { key: 'start', label: 'Start' },
            { key: 'end', label: 'End' },
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Voluntary self-identification"
        description="US forms often ask these. The default “Decline to self-identify” is always accepted."
      >
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(EEO_OPTIONS) as (keyof CandidateProfile['eeo'])[]).map((k) => {
            const options = EEO_OPTIONS[k].includes(profile.eeo[k]) ? EEO_OPTIONS[k] : [...EEO_OPTIONS[k], profile.eeo[k]];
            return (
              <Field key={k}>
                <FieldLabel className="capitalize">{k}</FieldLabel>
                <Select
                  items={options.map((o) => ({ value: o, label: o }))}
                  value={profile.eeo[k]}
                  onValueChange={(v) => set({ eeo: { ...profile.eeo, [k]: String(v) } })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            );
          })}
        </FieldGroup>
      </SectionCard>

      <SectionCard
        title="Other facts for the AI"
        description="Achievements, preferences, the kind of company you want — anything true the AI may use when drafting answers. It never invents facts beyond your profile."
      >
        <Textarea rows={5} value={profile.extraFacts} onChange={(e) => set({ extraFacts: e.target.value })} aria-label="Other facts" />
      </SectionCard>
    </div>
  );
}
