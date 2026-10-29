'use client';

import { TriangleAlertIcon } from 'lucide-react';
import Link from 'next/link';

import { StatusDot, type StatusTone } from '@/components/common/status-dot';
import { useStatus } from '@/components/shell/status-provider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatBytes, formatPercent, formatUsd, timeAgo } from '@/lib/format';
import type { StatusSnapshot } from '@/lib/status';
import { cn } from '@/lib/utils';

type Chip = {
  key: string;
  label: string;
  value: string;
  tone: StatusTone;
  href: string;
  details: [string, string][];
  meter?: number;
};

const METER_TONE: Record<StatusTone, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  error: 'bg-red-500',
  idle: 'bg-muted-foreground/40',
  info: 'bg-sky-500',
};

const DAY = 24 * 60 * 60_000;

export function statusChips(s: StatusSnapshot): Chip[] {
  const now = new Date(s.generatedAt).getTime();
  const chips: Chip[] = [];

  const scanAge = s.lastScan ? now - new Date(s.lastScan.at).getTime() : null;
  chips.push({
    key: 'scan',
    label: 'Last scan',
    value: s.lastScan ? timeAgo(s.lastScan.at, now) : 'never',
    tone: !s.lastScan ? 'idle' : s.lastScan.error ? 'warn' : scanAge! > 2 * DAY ? 'warn' : 'ok',
    href: '/admin/logs?tab=scans',
    details: s.lastScan
      ? [
          ['Board', s.lastScan.board],
          ['When', new Date(s.lastScan.at).toLocaleString()],
          ['Note', s.lastScan.error ? s.lastScan.error.slice(0, 160) : 'OK'],
        ]
      : [['Note', 'No scan has run yet']],
  });

  const failRate = s.ai.calls24h ? s.ai.failures24h / s.ai.calls24h : 0;
  chips.push({
    key: 'ai',
    label: 'AI 24h',
    value: `${s.ai.calls24h} calls`,
    tone: s.ai.calls24h === 0 ? 'idle' : failRate > 0.5 ? 'error' : failRate > 0.15 ? 'warn' : 'ok',
    href: '/admin/ai?tab=usage',
    details: [
      ['Calls', String(s.ai.calls24h)],
      ['Failed', `${s.ai.failures24h} (${formatPercent(failRate)})`],
    ],
  });

  if (s.claude.keySet) {
    const pct = s.claude.budgetUsd > 0 ? (s.claude.spendUsd / s.claude.budgetUsd) * 100 : 0;
    chips.push({
      key: 'claude',
      label: 'Claude',
      value: s.claude.budgetUsd > 0 ? `${formatUsd(s.claude.spendUsd)} / ${formatUsd(s.claude.budgetUsd)}` : formatUsd(s.claude.spendUsd),
      tone: pct >= 100 ? 'error' : pct >= 80 ? 'warn' : 'ok',
      href: '/admin/ai?tab=usage',
      meter: s.claude.budgetUsd > 0 ? Math.min(100, pct) : undefined,
      details: [
        ['This month', formatUsd(s.claude.spendUsd)],
        ['Budget', s.claude.budgetUsd > 0 ? formatUsd(s.claude.budgetUsd) : 'no cap'],
        ['At the cap', 'routes fall back to the free providers'],
      ],
    });
  }

  if (s.db.sizeBytes != null) {
    const pct = (s.db.sizeBytes / s.db.limitBytes) * 100;
    chips.push({
      key: 'db',
      label: 'DB',
      value: formatBytes(s.db.sizeBytes),
      tone: pct >= 90 ? 'error' : pct >= 75 ? 'warn' : 'ok',
      href: '/admin/data',
      meter: Math.min(100, pct),
      details: [
        ['Size', formatBytes(s.db.sizeBytes)],
        ['Supabase free limit', formatBytes(s.db.limitBytes)],
      ],
    });
  }

  chips.push({
    key: 'extension',
    label: 'Extension',
    value: !s.extension.keySet ? 'no key' : s.extension.lastSeen ? timeAgo(s.extension.lastSeen, now) : 'not seen',
    tone: !s.extension.keySet ? 'warn' : s.extension.lastSeen ? 'ok' : 'idle',
    href: '/admin/extension',
    details: [
      ['API key', s.extension.keySet ? 'set' : 'missing — the extension is locked out'],
      ['Last LinkedIn job', s.extension.lastSeen ? new Date(s.extension.lastSeen).toLocaleString() : 'never'],
    ],
  });

  if (s.sheets.configured) {
    chips.push({
      key: 'sheets',
      label: 'Sheets',
      value: s.sheets.unsynced ? `${s.sheets.unsynced} unsynced` : 'synced',
      tone: s.sheets.unsynced > 50 ? 'warn' : 'ok',
      href: '/admin',
      details: [['Approved jobs not yet in the sheet', String(s.sheets.unsynced)]],
    });
  }

  return chips;
}

function StatusChip({ chip }: { chip: Chip }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={chip.href}
            className={cn(
              'group inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-transparent px-1.5 text-xs transition-colors hover:border-border hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
              chip.tone === 'error' && 'bg-destructive/8 text-destructive',
            )}
            aria-label={`${chip.label}: ${chip.value}`}
          />
        }
      >
        <StatusDot tone={chip.tone} />
        <span className="text-muted-foreground group-hover:text-foreground">{chip.label}</span>
        <span className="tabular font-medium">{chip.value}</span>
        {chip.meter !== undefined ? (
          <span className="hidden h-1 w-8 overflow-hidden rounded-full bg-muted 2xl:inline-block" aria-hidden>
            <span className={cn('block h-full rounded-full', METER_TONE[chip.tone])} style={{ width: `${chip.meter}%` }} />
          </span>
        ) : null}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="block max-w-sm">
        <p className="mb-1 font-medium">
          {chip.label}: {chip.value}
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          {chip.details.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="opacity-70">{k}</dt>
              <dd className="tabular break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </TooltipContent>
    </Tooltip>
  );
}

/** Live system status chips (last scan · AI · Claude spend · DB size · extension · Sheets) with tooltips. */
export function StatusStrip({ className }: { className?: string }) {
  const { snapshot, error } = useStatus();
  if (!snapshot) {
    return (
      <div className={cn('flex items-center gap-1.5 px-2 text-xs text-muted-foreground', className)} role="status">
        <TriangleAlertIcon className="size-3.5 text-amber-500" />
        {error ?? 'Status unavailable'}
      </div>
    );
  }
  return (
    <nav
      aria-label="System status"
      className={cn('no-scrollbar relative flex min-w-0 items-center gap-0.5 overflow-x-auto', className)}
    >
      {statusChips(snapshot).map((c) => (
        <StatusChip key={c.key} chip={c} />
      ))}
      {error ? (
        <span className="ml-1 inline-flex shrink-0 items-center gap-1 text-xs text-amber-700 dark:text-amber-400" title={error}>
          <TriangleAlertIcon className="size-3.5" />
          stale
        </span>
      ) : null}
    </nav>
  );
}
