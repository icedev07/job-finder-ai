'use client';

import { BanIcon, CircleCheckIcon, InfoIcon } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { SectionCard } from '@/components/common/section-card';
import { plural, ruleMatches, type JobProbe, type SkipRule } from '@/components/rules/lib/skip-rules';
import { RuleTypeBadge } from '@/components/rules/rule-type-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const EMPTY_JOB: JobProbe = { title: '', company: '', url: '' };

const FIELDS: { key: keyof JobProbe; label: string; placeholder: string }[] = [
  { key: 'title', label: 'Job title', placeholder: 'Senior Backend Engineer' },
  { key: 'company', label: 'Company', placeholder: 'Acme Corp' },
  { key: 'url', label: 'Job or apply link', placeholder: 'https://boards.greenhouse.io/acme/jobs/123' },
];

function MatchList({ rules, muted = false }: { rules: SkipRule[]; muted?: boolean }) {
  return (
    <ul className="max-h-48 space-y-1.5 overflow-y-auto">
      {rules.map((r) => (
        <li key={r.id} className={cn('flex items-start gap-2', muted && 'opacity-60')}>
          <RuleTypeBadge type={r.type} />
          <span className="min-w-0 font-mono text-xs leading-5 wrap-anywhere">{r.pattern}</span>
        </li>
      ))}
    </ul>
  );
}

/** "Would this job be skipped?" Checked in the browser against the loaded rules, with the scanner's matching. */
export function RuleTester({ rules }: { rules: SkipRule[] | null }) {
  const id = useId();
  const [job, setJob] = useState<JobProbe>(EMPTY_JOB);
  const hasInput = FIELDS.some((f) => job[f.key].trim() !== '');

  const { matched, turnedOff } = useMemo(() => {
    const matched: SkipRule[] = [];
    const turnedOff: SkipRule[] = [];
    for (const r of rules ?? []) {
      if (!ruleMatches(r, job)) continue;
      if (r.active) matched.push(r);
      else turnedOff.push(r);
    }
    return { matched, turnedOff };
  }, [rules, job]);

  // With no active rule the scanner uses its built-in default list, which only the server knows.
  const usesDefaults = rules !== null && !rules.some((r) => r.active);

  let result = null;
  if (hasInput && rules !== null) {
    result = usesDefaults ? (
      <Alert>
        <InfoIcon />
        <AlertDescription>
          No rule is turned on, so scans use a built-in default list instead. This tester only checks your own rules.
        </AlertDescription>
      </Alert>
    ) : (
      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex flex-wrap items-center gap-2">
          {matched.length > 0 ? (
            <Badge variant="destructive">
              <BanIcon />
              Skipped
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-tier-match/15 text-tier-match-ink">
              <CircleCheckIcon />
              Kept
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">
            {matched.length > 0
              ? `Matched by ${plural(matched.length, 'active rule')}.`
              : 'No active rule matches, so the job would be stored and analyzed.'}
          </span>
        </div>
        {matched.length > 0 ? <MatchList rules={matched} /> : null}
        {turnedOff.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Also matches {plural(turnedOff.length, 'rule')} that {turnedOff.length === 1 ? 'is' : 'are'} turned
              off:
            </p>
            <MatchList rules={turnedOff} muted />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <SectionCard
      title="Test a job"
      description="See which rules would skip a job. Runs in your browser against the rules on this page."
      contentClassName="space-y-0"
      actions={
        hasInput ? (
          <Button variant="ghost" size="xs" onClick={() => setJob(EMPTY_JOB)}>
            Clear
          </Button>
        ) : null
      }
    >
      <FieldGroup className="gap-3">
        {FIELDS.map((f) => (
          <Field key={f.key} className="gap-1.5">
            <FieldLabel htmlFor={`${id}-${f.key}`}>{f.label}</FieldLabel>
            <Input
              id={`${id}-${f.key}`}
              value={job[f.key]}
              onChange={(e) => {
                const value = e.target.value;
                setJob((prev) => ({ ...prev, [f.key]: value }));
              }}
              placeholder={f.placeholder}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
        ))}
      </FieldGroup>
      {/* Always mounted so screen readers announce the verdict; no gap while it is empty. */}
      <div aria-live="polite" className="mt-4 empty:mt-0">
        {result}
      </div>
    </SectionCard>
  );
}
