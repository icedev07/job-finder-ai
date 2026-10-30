'use client';

import { CircleAlertIcon, GlobeIcon, RefreshCwIcon } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/page-header';
import { useViewing } from '@/components/shell/viewing';
import { useStatus } from '@/components/shell/status-provider';
import { AnalysisCard, type AnalysisProgress } from '@/components/sources/analysis-card';
import { isSourceTab, SOURCE_TABS, SOURCES, sourcesInTab, type SourceDef } from '@/components/sources/catalog';
import { PipelineCard, type ScrapeAllProgress } from '@/components/sources/pipeline-card';
import {
  failedRun,
  latestDurations,
  summaryFromLog,
  summaryFromRun,
  type AnalyzeResponse,
  type LastScan,
  type RunResponse,
  type RunSummary,
  type ScannerConfig,
  type StatsResponse,
} from '@/components/sources/scan-results';
import { SourceCard } from '@/components/sources/source-card';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, ApiError, errorMessage } from '@/lib/clientApi';
import { formatNumber } from '@/lib/format';
import { sourceEnabled } from '@/lib/sourceMeta';
import { useAdminConfig } from '@/lib/useAdminConfig';

const GRID = 'grid gap-4 @2xl/sources:grid-cols-2 @6xl/sources:grid-cols-3';

// Relative times ("3m ago") tick once a minute; null while server rendering.
const MINUTE = 60_000;
function subscribeMinute(onTick: () => void) {
  const id = window.setInterval(onTick, MINUTE);
  return () => window.clearInterval(id);
}
const thisMinute = (): number | null => Math.ceil(Date.now() / MINUTE) * MINUTE;
const serverMinute = (): number | null => null;

type Stats = {
  pending: number;
  lastScans: Record<string, LastScan>;
  durations: Record<string, number>;
};

type BatchResult = {
  ok: boolean;
  approved: number;
  rejected: number;
  analyzed: number;
  remaining: number;
  rateLimited?: boolean;
  rateLimitReason?: string;
  retryAfterMs?: number;
  batchError?: string;
  error?: string;
};

/** Scans one board. An HTTP error body (status 500) is returned like a success body, so callers read `error`. */
async function postRun(board: string): Promise<RunResponse> {
  try {
    return await api<RunResponse>('/api/admin/scanners/run', { method: 'POST', json: { board } });
  } catch (e) {
    if (e instanceof ApiError && e.data && typeof e.data === 'object') {
      return { ...(e.data as RunResponse), success: false, error: e.message };
    }
    throw e;
  }
}

// /api/admin/analyze analyzes jobs in batched LLM calls (≈8 jobs per request)
// and returns once its time budget is spent, well under the 60s Vercel cap.
// runAnalysis keeps calling it until `remaining = 0`, so a full backlog clears
// in one click without ever hitting a 504.
async function analyzeBatchOnce(): Promise<BatchResult> {
  const failed = (error: string): BatchResult => ({
    ok: false,
    approved: 0,
    rejected: 0,
    analyzed: 0,
    remaining: 0,
    error,
  });
  try {
    const data = await api<AnalyzeResponse>('/api/admin/analyze', { method: 'POST', json: {} });
    if (!data.success) return failed(data.error || 'HTTP 200');
    return {
      ok: true,
      approved: Number(data.approved || 0),
      rejected: Number(data.rejected || 0),
      analyzed: Number(data.analyzed || 0),
      remaining: Number(data.remaining || 0),
      rateLimited: Boolean(data.rateLimited),
      rateLimitReason: data.rateLimitReason || undefined,
      retryAfterMs: typeof data.retryAfterMs === 'number' ? data.retryAfterMs : undefined,
      batchError: data.batchError || undefined,
    };
  } catch (e) {
    if (e instanceof ApiError) return failed((e.data as AnalyzeResponse | null)?.error || `HTTP ${e.status}`);
    return failed(errorMessage(e));
  }
}

// What the tab's sources do, above their cards.
function TabNote({ tab }: { tab: string }) {
  if (tab === 'europe') {
    return (
      <Alert>
        <GlobeIcon />
        <AlertTitle>The European job market</AlertTitle>
        <AlertDescription>
          The search engines and public employment services here search each user&apos;s roles in their countries (
          <Link href="/admin/settings#search" className="underline underline-offset-2">
            Settings → What to look for
          </Link>
          ), and every posting from every source goes through that free check before the AI. Reed and Adzuna need a free key.
        </AlertDescription>
      </Alert>
    );
  }
  if (tab === 'us') {
    return (
      <Alert>
        <GlobeIcon />
        <AlertTitle>Mostly US, or remote jobs mostly closed to Europe</AlertTitle>
        <AlertDescription>
          These start off. Switch one on to scan it too: its postings go through each user&apos;s free check, which leaves out
          remote jobs limited to the US.
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}

/** The Sources page: scanner settings per job board, single and full scans, and the pending-analysis queue. */
export function SourcesView({ initialTab }: { initialTab: string }) {
  const { refresh: refreshStatus } = useStatus();
  // The app-wide settings, for the keys some sources need (Reed, Adzuna).
  const { config: appConfig, reload: reloadAppConfig } = useAdminConfig();
  const { viewing, userName } = useViewing();
  const now = useSyncExternalStore(subscribeMinute, thisMinute, serverMinute);
  const [tab, setTab] = useState(initialTab);
  const [config, setConfig] = useState<ScannerConfig>({});
  const [configState, setConfigState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [configError, setConfigError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  // "all" during the full scrape, else the board of a single scan.
  const [running, setRunning] = useState<string | null>(null);
  // The board whose scan request is in flight (single scan or full scrape).
  const [scanning, setScanning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, RunSummary>>({});
  const [scrapeAll, setScrapeAll] = useState<ScrapeAllProgress | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisProgress | null>(null);
  const pendingCount = stats?.pending ?? 0;
  const ready = configState === 'ready';

  const loadConfig = useCallback(
    () =>
      api<ScannerConfig>('/api/admin/scanners').then(
        (data) => {
          setConfig(data);
          setConfigState('ready');
        },
        (e: unknown) => {
          setConfigError(errorMessage(e));
          setConfigState('error');
        },
      ),
    [],
  );

  const refreshStats = useCallback(
    () =>
      api<StatsResponse>('/api/admin/stats').then(
        (s) => {
          const lastScans: Record<string, LastScan> = {};
          for (const row of s.latestPerBoard || []) lastScans[row.board] = row;
          setStats({
            pending: s.pendingJobs || 0,
            lastScans,
            durations: latestDurations(s.recentScans || [], lastScans),
          });
        },
        (e: unknown) => {
          toast.error('Could not load the scan stats', { description: errorMessage(e) });
        },
      ),
    [],
  );

  useEffect(() => {
    void loadConfig();
    void refreshStats();
  }, [loadConfig, refreshStats]);

  function afterRun() {
    void refreshStats();
    refreshStatus();
  }

  // Every save sends the whole scanner config, as before: typed values on blur,
  // discrete picks (switches, selects, checkboxes, presets) at once.
  async function putConfig(next: ScannerConfig) {
    try {
      await api('/api/admin/scanners', { method: 'PUT', json: next });
    } catch (e) {
      toast.error('Could not save the source settings', { description: errorMessage(e) });
    }
  }

  function editConfig(key: string, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function saveConfig() {
    void putConfig(config);
  }

  function persistConfig(patch: ScannerConfig) {
    const next = { ...config, ...patch };
    setConfig(next);
    void putConfig(next);
  }

  function changeTab(value: unknown) {
    if (typeof value !== 'string' || !isSourceTab(value)) return;
    setTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.replaceState(null, '', url);
  }

  async function runScan(source: SourceDef) {
    setRunning(source.key);
    setScanning(source.key);
    let summary: RunSummary;
    try {
      const data = await postRun(source.key);
      const at = new Date().toISOString();
      summary = data.success ? summaryFromRun(data, at) : failedRun(data.error || 'Scan failed', at);
    } catch (e) {
      summary = failedRun(errorMessage(e), new Date().toISOString());
    }
    setResults((prev) => ({ ...prev, [source.key]: summary }));
    if (summary.error) {
      toast.error(`${source.label}: scan failed`, { description: summary.error });
    } else {
      toast.success(`${source.label}: ${formatNumber(summary.saved)} new`, {
        description: `${formatNumber(summary.found)} found · ${formatNumber(summary.approved)} approved · ${formatNumber(summary.rejected)} rejected`,
      });
    }
    setScanning(null);
    setRunning(null);
    afterRun();
  }

  // Scrape + analyze every enabled source, one request per board so each board
  // gets a full server-side budget (scrape + inline AI analysis). Looping
  // client-side sidesteps the 60s function cap that limits the server "all"
  // path. Each board only stores its CHECKED results; nothing is left pending.
  async function runAllBoards() {
    setRunning('all');
    const enabled = SOURCES.filter((s) => sourceEnabled(s.key, config));
    const totals = { found: 0, saved: 0, approved: 0, rejected: 0, unanalyzed: 0 };
    const errors: ScrapeAllProgress['errors'] = [];
    for (let idx = 0; idx < enabled.length; idx++) {
      const s = enabled[idx];
      setScanning(s.key);
      setScrapeAll({
        status: 'running',
        done: idx,
        total: enabled.length,
        current: s.label,
        ...totals,
        errors: [...errors],
      });
      let summary: RunSummary;
      try {
        const data = await postRun(s.key);
        totals.found += Number(data.jobsFound || 0);
        totals.saved += Number(data.jobsSaved || 0);
        totals.approved += Number(data.approved || 0);
        totals.rejected += Number(data.rejected || 0);
        totals.unanalyzed += Number(data.unanalyzed || 0);
        if (data.error) errors.push({ board: s.key, message: data.error });
        const at = new Date().toISOString();
        summary = data.error ? failedRun(data.error, at) : summaryFromRun(data, at);
      } catch (e) {
        errors.push({ board: s.key, message: errorMessage(e) });
        summary = failedRun(errorMessage(e), new Date().toISOString());
      }
      setResults((prev) => ({ ...prev, [s.key]: summary }));
    }
    setScanning(null);
    setScrapeAll({
      status: 'done',
      done: enabled.length,
      total: enabled.length,
      current: null,
      ...totals,
      errors,
    });
    const description =
      `${formatNumber(totals.saved)} stored — ${formatNumber(totals.approved)} suitable, ` +
      `${formatNumber(totals.rejected)} not suitable, from ${formatNumber(totals.found)} found` +
      (totals.unanalyzed > 0 ? `; ${formatNumber(totals.unanalyzed)} not yet checked (run again to continue)` : '');
    if (errors.length) {
      toast.warning(`Scrape finished, ${errors.length} ${errors.length === 1 ? 'source' : 'sources'} failed`, {
        description,
      });
    } else {
      toast.success('All sources scraped', { description });
    }
    setRunning(null);
    afterRun();
  }

  async function runAnalysis() {
    setAnalyzing(true);
    let totalApproved = 0;
    let totalRejected = 0;
    let totalAnalyzed = 0;
    let lastRemaining = pendingCount;
    let rateLimitWaits = 0;
    const show = (status: AnalysisProgress['status'], message: string) =>
      setAnalysis({ status, message, analyzed: totalAnalyzed, remaining: lastRemaining });
    const finish = () => {
      setAnalyzing(false);
      afterRun();
    };

    show('running', `Analyzing 0/${lastRemaining}…`);
    // Hard cap on iterations: protects against an analyzer that never reduces
    // the remaining count. Each call clears ~16 jobs, so 200 is far more than
    // any real backlog needs.
    for (let i = 0; i < 200; i++) {
      const r = await analyzeBatchOnce();
      if (!r.ok) {
        show('error', `Error: ${r.error}`);
        toast.error('Analysis failed', { description: r.error });
        finish();
        return;
      }
      totalApproved += r.approved;
      totalRejected += r.rejected;
      totalAnalyzed += r.analyzed;
      lastRemaining = r.remaining;
      show(
        'running',
        `Analyzing… ${totalAnalyzed} done, ${totalApproved} approved, ${totalRejected} rejected, ${lastRemaining} remaining`,
      );

      if (r.rateLimited) {
        const waitMs = r.retryAfterMs ?? 60_000;
        // Long backoff (daily free quota or insufficient credits): nothing the
        // loop can do; stop and let the user retry later.
        if (waitMs > 5 * 60_000 || rateLimitWaits >= 5) {
          const message =
            `Stopped — ${r.rateLimitReason || 'AI provider rate limit'}. ` +
            `${totalApproved} approved, ${totalRejected} rejected so far; ${lastRemaining} still pending. Try again later.`;
          show('stopped', message);
          toast.warning('Analysis stopped', { description: message });
          finish();
          return;
        }
        // Short transient throttle: wait it out and keep going so the run
        // finishes every pending job without the user clicking again.
        rateLimitWaits++;
        const waitSecs = Math.max(1, Math.ceil(waitMs / 1000));
        for (let s = waitSecs; s > 0; s--) {
          show('waiting', `Rate limited — auto-resuming in ${s}s… (${totalAnalyzed} done, ${lastRemaining} remaining)`);
          await new Promise((res) => setTimeout(res, 1000));
        }
        continue;
      }
      rateLimitWaits = 0;

      // The AI call failed for this batch and nothing was analyzed: stop rather
      // than spin. The rows stay PENDING for a later retry.
      if (r.batchError && r.analyzed === 0) {
        const message =
          `Stopped — ${r.batchError}. ` +
          `${totalApproved} approved, ${totalRejected} rejected so far; ${lastRemaining} still pending. Click again to retry.`;
        show('stopped', message);
        toast.warning('Analysis stopped', { description: message });
        finish();
        return;
      }

      if (r.remaining === 0 || r.analyzed === 0) break;
    }
    const message =
      `Done: ${totalApproved} approved, ${totalRejected} rejected out of ${totalAnalyzed}` +
      (lastRemaining > 0 ? ` (${lastRemaining} still pending — click again to continue)` : '');
    show('done', message);
    toast.success('Analysis finished', { description: message });
    finish();
  }

  async function runScanAndAnalyze() {
    await runAllBoards();
    // Inline analysis already ran inside the scan above; this pass only drains
    // any leftover PENDING rows (a rescan reset, or a pre-upgrade backlog).
    await runAnalysis();
  }

  function resultFor(key: string): RunSummary | null {
    if (results[key]) return results[key];
    const log = stats?.lastScans[key];
    return log && stats ? summaryFromLog(log, stats.durations[key] ?? null) : null;
  }

  function renderSources(tabId: string) {
    if (configState === 'loading') {
      return (
        <div className={GRID} aria-busy="true">
          {Array.from({ length: Math.min(sourcesInTab(tabId).length, 6) }, (_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      );
    }
    if (configState === 'error') {
      return (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Could not load the source settings</AlertTitle>
          <AlertDescription>{configError}</AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setConfigState('loading');
                void loadConfig();
              }}
            >
              <RefreshCwIcon />
              Retry
            </Button>
          </AlertAction>
        </Alert>
      );
    }
    return (
      <div className={GRID}>
        {sourcesInTab(tabId).map((s) => (
          <SourceCard
            key={s.key}
            source={s}
            config={config}
            result={resultFor(s.key)}
            scanning={scanning === s.key}
            canRun={running === null}
            now={now}
            onEdit={editConfig}
            onSave={saveConfig}
            onPersist={persistConfig}
            onRun={() => void runScan(s)}
            appConfig={appConfig}
            onKeysSaved={reloadAppConfig}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="@container/sources flex flex-col gap-6">
      <PageHeader
        title="Sources"
        description={`Job boards and public APIs scanned server-side; each scan analyzes every job with AI inline and stores only the verdict. ${
          viewing === 'all'
            ? 'Runs judge new jobs for every user who gets each board (Settings → Job boards).'
            : `Runs judge new jobs for ${userName(viewing)} only.`
        } The board settings here are shared by everyone.`}
      />

      <div className="grid gap-4 @4xl/sources:grid-cols-2">
        <PipelineCard
          enabledCount={SOURCES.filter((s) => sourceEnabled(s.key, config)).length}
          totalCount={SOURCES.length}
          rescanDays={config.scanner_rescan_after_days ?? '0'}
          ready={ready}
          busy={running !== null || analyzing}
          runningAll={running === 'all'}
          progress={scrapeAll}
          onRescanDaysChange={(v) => editConfig('scanner_rescan_after_days', v)}
          onRescanDaysBlur={saveConfig}
          onScrapeAll={() => void runAllBoards()}
          onScrapeAndAnalyze={() => void runScanAndAnalyze()}
        />
        <AnalysisCard
          pending={stats ? stats.pending : null}
          batchSize={config.analyzer_batch_size ?? '5'}
          ready={ready}
          analyzing={analyzing}
          progress={analysis}
          onBatchSizeChange={(v) => editConfig('analyzer_batch_size', v)}
          onBatchSizeBlur={saveConfig}
          onAnalyze={() => void runAnalysis()}
        />
      </div>

      <Tabs value={tab} onValueChange={changeTab} className="gap-4">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList>
            {SOURCE_TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="px-2.5">
                {t.label}
                <span className="tabular ml-0.5 rounded-full bg-muted-foreground/10 px-1.5 text-[10px] text-muted-foreground">
                  {t.keys.length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {SOURCE_TABS.map((t) => (
          <TabsContent key={t.id} value={t.id} className="flex flex-col gap-4">
            <TabNote tab={t.id} />
            {renderSources(t.id)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
