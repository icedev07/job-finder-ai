// Skip rules: types, labels and pure helpers shared by the Skip rules page.

import { formatNumber } from '@/lib/format';

export const SKIP_RULE_TYPES = ['COMPANY', 'TITLE', 'URL'] as const;
export type SkipRuleType = (typeof SKIP_RULE_TYPES)[number];

/** A row of GET /api/admin/skip-rules (the Prisma SkipRule as JSON). */
export type SkipRule = {
  id: number;
  type: SkipRuleType;
  pattern: string;
  active: boolean;
  createdAt: string;
};

/** Body of a successful POST /api/admin/skip-rules/import. */
export type ImportResult = { ok: boolean; imported: number; dropped: number; skipped: number };

type RuleTypeMeta = {
  /** Badge and filter label. */
  label: string;
  /** Lower-case form for running text ("the company rule"). */
  noun: string;
  /** Option label in the add-rule picker. */
  option: string;
  /** Theme chart colour of the type's dot. */
  dot: string;
  hint: string;
  placeholder: string;
};

export const RULE_TYPE_META: Record<SkipRuleType, RuleTypeMeta> = {
  COMPANY: {
    label: 'Company',
    noun: 'company',
    option: 'Company',
    dot: 'bg-chart-1',
    hint: 'Skips jobs whose company name contains the pattern, so “Meta” also blocks “Metabase”.',
    placeholder: 'Company name, e.g. Acme',
  },
  TITLE: {
    label: 'Title',
    noun: 'title',
    option: 'Title keyword',
    dot: 'bg-chart-5',
    hint: 'Skips jobs whose title contains the pattern, so “intern” also blocks “international”.',
    placeholder: 'Word or phrase, e.g. vice president',
  },
  URL: {
    label: 'URL',
    noun: 'URL',
    option: 'URL contains',
    dot: 'bg-chart-2',
    hint: 'Skips jobs whose link contains the pattern, usually a domain such as “usajobs.gov”.',
    placeholder: 'Part of the link, e.g. usajobs.gov',
  },
};

export const RULE_TYPE_ITEMS = SKIP_RULE_TYPES.map((value) => ({ value, label: RULE_TYPE_META[value].option }));

/** plural(3, 'rule') → "3 rules". */
export function plural(n: number, word: string): string {
  return `${formatNumber(n)} ${word}${n === 1 ? '' : 's'}`;
}

function csvEscape(value: string): string {
  // Quote when the value holds a comma, quote or line break; double inner quotes.
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** type,pattern,active: the columns the import route reads back. */
export function rulesToCsv(rules: readonly SkipRule[]): string {
  const lines = rules.map((r) => `${csvEscape(r.type)},${csvEscape(r.pattern)},${r.active}`);
  return ['type,pattern,active', ...lines].join('\n');
}

export function downloadRulesCsv(rules: readonly SkipRule[]): void {
  const url = URL.createObjectURL(new Blob([rulesToCsv(rules)], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `skip-rules-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type JobProbe = { title: string; company: string; url: string };

/**
 * Mirrors shouldSkipJob in lib/jobSkipRules.ts: a case-insensitive substring test on the rule type's field.
 * Only the job title is trimmed; patterns are compared as stored.
 */
export function ruleMatches(rule: SkipRule, job: JobProbe): boolean {
  const pattern = rule.pattern.toLowerCase();
  switch (rule.type) {
    case 'TITLE':
      return job.title.trim().toLowerCase().includes(pattern);
    case 'COMPANY':
      return job.company.toLowerCase().includes(pattern);
    case 'URL':
      return job.url.toLowerCase().includes(pattern);
  }
}
