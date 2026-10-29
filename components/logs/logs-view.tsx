'use client';

import { BriefcaseIcon, PuzzleIcon, RadarIcon, SparklesIcon, XIcon, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useId, useRef, useState } from 'react';

import { PageHeader } from '@/components/common/page-header';
import {
  ANALYSIS_COLUMNS,
  analysisRowLabel,
  EXTENSION_COLUMNS,
  extensionRowLabel,
  JOB_COLUMNS,
  jobRowLabel,
  SCAN_COLUMNS,
  scanRowLabel,
} from '@/components/logs/log-columns';
import { LogPanel } from '@/components/logs/log-panel';
import {
  isLogType,
  LOG_TYPES,
  NOUN,
  ROW_CAP,
  type AnalysisLogRow,
  type ExtensionLogRow,
  type JobRow,
  type LogType,
  type ScanLogRow,
} from '@/components/logs/types';
import { useLogRows } from '@/components/logs/use-log-rows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/clientApi';
import { formatNumber, platformLabel } from '@/lib/format';

const DEFAULT_TAB: LogType = 'jobs';

const TAB_META: Record<LogType, { label: string; icon: LucideIcon }> = {
  jobs: { label: 'All jobs', icon: BriefcaseIcon },
  analysis: { label: 'AI analysis', icon: SparklesIcon },
  scans: { label: 'Scan logs', icon: RadarIcon },
  extension: { label: 'Extension logs', icon: PuzzleIcon },
};

// Every source that saves jobs (the LinkedIn extension plus the scraper feeds); values are ScrapedJob.platform.
const PLATFORMS = [
  'linkedin',
  'remoteok',
  'weworkremotely',
  'jobicy',
  'greenhouse',
  'mygreenhouse',
  'lever',
  'ashby',
  'landingjobs',
  'remotive',
  'workingnomads',
  'arbeitnow',
  'hnwhoishiring',
  'themuse',
  'realworkfromanywhere',
  'nofluffjobs',
  'jobspresso',
  'authenticjobs',
  'nodesk',
  'justremote',
];

const PLATFORM_ITEMS = [
  { value: '', label: 'All platforms' },
  ...PLATFORMS.map((p) => ({ value: p, label: platformLabel(p) })).sort((a, b) => a.label.localeCompare(b.label)),
];

const STATUS_ITEMS = [
  { value: '', label: 'All statuses' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PENDING', label: 'Pending' },
];

/** Query string for GET /api/admin/logs, in the order the old page built it. */
function logsQuery(type: LogType, from: string, to: string, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  p.set('type', type);
  for (const [key, value] of Object.entries(extra)) if (value) p.set(key, value);
  return p.toString();
}

function FilterSelect({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select items={items} value={value} onValueChange={(v) => onChange(v ?? '')}>
      <SelectTrigger size="sm" aria-label={label} className="min-w-32">
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

function DateRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const id = useId();
  const fromRef = useRef<HTMLInputElement>(null);
  return (
    <div role="group" aria-label="Date range" className="flex flex-wrap items-center gap-2">
      <Label htmlFor={`${id}-from`} className="text-xs font-normal text-muted-foreground">
        From
      </Label>
      <Input
        ref={fromRef}
        id={`${id}-from`}
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => onChange(e.target.value, to)}
        className="w-auto"
      />
      <Label htmlFor={`${id}-to`} className="text-xs font-normal text-muted-foreground">
        To
      </Label>
      <Input
        id={`${id}-to`}
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => onChange(from, e.target.value)}
        className="w-auto"
      />
      {from || to ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange('', '');
            fromRef.current?.focus();
          }}
        >
          <XIcon />
          Clear dates
        </Button>
      ) : null}
    </div>
  );
}

function TabBadge({ rows, loading, error }: { rows: unknown[]; loading: boolean; error: string | null }) {
  if (error) {
    return (
      <>
        <span aria-hidden title="Failed to load" className="size-1.5 rounded-full bg-destructive" />
        <span className="sr-only">(failed to load)</span>
      </>
    );
  }
  if (loading && rows.length === 0) return null;
  return <span className="tabular text-xs font-normal text-muted-foreground">{formatNumber(rows.length)}</span>;
}

/**
 * The Logs page: scraped jobs, AI analysis, scan runs and extension logs, each in a tab (?tab=analysis|scans|
 * extension) with its own selection and bulk delete. The date range applies to every tab.
 */
export function LogsView() {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [tab, setTab] = useState<LogType>(isLogType(urlTab) ? urlTab : DEFAULT_TAB);
  const [seenUrlTab, setSeenUrlTab] = useState(urlTab);
  if (urlTab !== seenUrlTab) {
    // Followed a link to another ?tab= while the page was open.
    setSeenUrlTab(urlTab);
    setTab(isLogType(urlTab) ? urlTab : DEFAULT_TAB);
  }

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');

  const jobsQuery = logsQuery('jobs', from, to, { platform, status });
  const analysisQuery = logsQuery('analysis', from, to);
  const scansQuery = logsQuery('scans', from, to);
  const extensionQuery = logsQuery('extension', from, to);

  const jobs = useLogRows<JobRow>(jobsQuery);
  const analysis = useLogRows<AnalysisLogRow>(analysisQuery);
  const scans = useLogRows<ScanLogRow>(scansQuery);
  const extension = useLogRows<ExtensionLogRow>(extensionQuery);
  const states = { jobs, analysis, scans, extension };

  const datesSet = Boolean(from || to);

  function setDates(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
  }

  function changeTab(value: unknown) {
    if (!isLogType(value)) return;
    setTab(value);
    const url = new URL(window.location.href);
    if (value === DEFAULT_TAB) url.searchParams.delete('tab');
    else url.searchParams.set('tab', value);
    window.history.replaceState(null, '', url);
  }

  async function remove(type: LogType, ids: number[]) {
    await api('/api/admin/logs', { method: 'DELETE', json: { type, ids } });
    // The server deletes a job's analysis logs with it, so that tab reloads too.
    if (type === 'jobs') await Promise.all([jobs.reload(), analysis.reload()]);
    else await states[type].reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Logs"
        description="Scraped jobs, AI analysis, scan runs and extension activity. The date range applies to every tab."
        actions={<DateRange from={from} to={to} onChange={setDates} />}
      />

      <Tabs value={tab} onValueChange={changeTab} className="gap-4">
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            {LOG_TYPES.map((type) => {
              const Icon = TAB_META[type].icon;
              return (
                <TabsTrigger key={type} value={type} className="px-2.5">
                  <Icon />
                  {TAB_META[type].label}
                  <TabBadge {...states[type]} />
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="jobs" keepMounted>
          <LogPanel
            noun={NOUN.jobs}
            cap={ROW_CAP.jobs}
            rows={jobs.rows}
            loading={jobs.loading}
            error={jobs.error}
            onReload={jobs.reload}
            columns={JOB_COLUMNS}
            rowLabel={jobRowLabel}
            caption="Scraped jobs, newest first"
            filters={
              <>
                <FilterSelect label="Platform" items={PLATFORM_ITEMS} value={platform} onChange={setPlatform} />
                <FilterSelect label="Status" items={STATUS_ITEMS} value={status} onChange={setStatus} />
              </>
            }
            empty={{
              icon: BriefcaseIcon,
              title: 'No jobs found',
              description: 'Jobs show up here once a scan or the LinkedIn extension saves them.',
            }}
            filtered={datesSet || Boolean(platform || status)}
            onClearFilters={() => {
              setDates('', '');
              setPlatform('');
              setStatus('');
            }}
            resetKey={jobsQuery}
            deleteNote="This also deletes the matching AI analysis logs."
            onDelete={(ids) => remove('jobs', ids)}
            tableClassName="min-w-[1040px]"
          />
        </TabsContent>

        <TabsContent value="analysis" keepMounted>
          <LogPanel
            noun={NOUN.analysis}
            cap={ROW_CAP.analysis}
            rows={analysis.rows}
            loading={analysis.loading}
            error={analysis.error}
            onReload={analysis.reload}
            columns={ANALYSIS_COLUMNS}
            rowLabel={analysisRowLabel}
            caption="AI analysis logs, newest first"
            empty={{
              icon: SparklesIcon,
              title: 'No analysis logs yet',
              description: 'Every AI verdict on a job is logged here.',
            }}
            filtered={datesSet}
            onClearFilters={() => setDates('', '')}
            resetKey={analysisQuery}
            onDelete={(ids) => remove('analysis', ids)}
            tableClassName="min-w-[1000px]"
          />
        </TabsContent>

        <TabsContent value="scans" keepMounted>
          <LogPanel
            noun={NOUN.scans}
            cap={ROW_CAP.scans}
            rows={scans.rows}
            loading={scans.loading}
            error={scans.error}
            onReload={scans.reload}
            columns={SCAN_COLUMNS}
            rowLabel={scanRowLabel}
            caption="Scan logs, newest first"
            empty={{
              icon: RadarIcon,
              title: 'No scan logs yet',
              description: (
                <>
                  Each source scan adds a row here. Run one from <Link href="/admin/sources">Sources</Link>.
                </>
              ),
            }}
            filtered={datesSet}
            onClearFilters={() => setDates('', '')}
            resetKey={scansQuery}
            onDelete={(ids) => remove('scans', ids)}
            tableClassName="min-w-[760px]"
          />
        </TabsContent>

        <TabsContent value="extension" keepMounted>
          <LogPanel
            noun={NOUN.extension}
            cap={ROW_CAP.extension}
            rows={extension.rows}
            loading={extension.loading}
            error={extension.error}
            onReload={extension.reload}
            columns={EXTENSION_COLUMNS}
            rowLabel={extensionRowLabel}
            caption="Extension logs, newest first"
            empty={{
              icon: PuzzleIcon,
              title: 'No extension logs yet',
              description: 'Enable “Send logs to server” in the extension.',
            }}
            filtered={datesSet}
            onClearFilters={() => setDates('', '')}
            resetKey={extensionQuery}
            onDelete={(ids) => remove('extension', ids)}
            tableClassName="min-w-[760px]"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
