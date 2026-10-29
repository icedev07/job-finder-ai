import type { Feed, FeedFetchResult, NormalizedJob } from "./types";
import { remoteOkFeed } from "./feeds/remoteok";
import { weWorkRemotelyFeed } from "./feeds/weworkremotely";
import { jobicyFeed } from "./feeds/jobicy";
import { greenhouseFeed } from "./feeds/greenhouse";
import { leverFeed } from "./feeds/lever";
import { ashbyFeed } from "./feeds/ashby";
import { landingJobsFeed } from "./feeds/landingjobs";
import { jobspressoFeed } from "./feeds/jobspresso";
import { authenticJobsFeed } from "./feeds/authenticjobs";
import { nodeskFeed } from "./feeds/nodesk";
import { justRemoteFeed } from "./feeds/justremote";
import { myGreenhouseFeed } from "./feeds/mygreenhouse";
// Hidden / low-competition sources — zero-auth public APIs & feeds that bypass
// the crowded commercial boards (see README "Hidden sources").
import { remotiveFeed } from "./feeds/remotive";
import { workingNomadsFeed } from "./feeds/workingnomads";
import { arbeitnowFeed } from "./feeds/arbeitnow";
import { hackerNewsFeed } from "./feeds/hackernews";
import { theMuseFeed } from "./feeds/themuse";
import { realWorkFromAnywhereFeed } from "./feeds/realworkfromanywhere";
import { noFluffJobsFeed } from "./feeds/nofluffjobs";
import {
  findExistingJob,
  refreshScrapedJob,
  createAnalyzedScrapedJob,
  applyVerdictToJob,
  type JobVerdict,
} from "../scrapedJobs";
import { shouldSkipJob } from "../jobSkipRules";
import { analyzeScrapedJobs, type InlineVerdict } from "../jobAnalyzer";
import { getAllConfig } from "../config";

const FEEDS: Feed[] = [
  // single-endpoint json feeds
  remoteOkFeed,
  jobicyFeed,
  landingJobsFeed,
  // hidden / low-competition zero-auth sources
  remotiveFeed,
  workingNomadsFeed,
  arbeitnowFeed,
  hackerNewsFeed,
  theMuseFeed,
  realWorkFromAnywhereFeed,
  noFluffJobsFeed,
  // RSS-driven boards (default URL, user can override)
  weWorkRemotelyFeed,
  jobspressoFeed,
  authenticJobsFeed,
  nodeskFeed,
  // SPA boards with no public api — scraped from embedded SSR payload
  justRemoteFeed,
  // multi-company ATS
  greenhouseFeed,
  leverFeed,
  ashbyFeed,
  // authenticated candidate-portal aggregator (requires pasted session cookie)
  myGreenhouseFeed,
];

export const FEED_KEYS = FEEDS.map((f) => f.key);

export function getFeed(key: string): Feed | undefined {
  return FEEDS.find((f) => f.key === key);
}

export type ScanOutcome = {
  /** Jobs returned by the feed. */
  found: number;
  /** New jobs analyzed and stored this run (APPROVED + REJECTED). */
  saved: number;
  /** Of the stored / re-analyzed jobs, how many the AI judged suitable. */
  approved: number;
  /** Of the stored / re-analyzed jobs, how many the AI judged not suitable. */
  rejected: number;
  /** Existing duplicates whose data fields were refreshed. */
  refreshed: number;
  /** Existing duplicates re-analyzed in place (rescan window). */
  rescanned: number;
  /** Jobs dropped before analysis (skip rule, or duplicate with nothing to refresh). */
  skipped: number;
  /** New / rescan jobs not checked this run — deliberately NOT stored, retried next scan. */
  unanalyzed: number;
  warning?: string;
};

export type RunFeedScanOptions = {
  /** Hard wall-clock budget for the whole scan: scrape + inline AI analysis. */
  timeBudgetMs?: number;
};

function verdictFrom(v: InlineVerdict): JobVerdict {
  return {
    status: v.approved ? "APPROVED" : "REJECTED",
    aiScore: v.score,
    aiReason: v.reason,
    techStack: v.techStack,
    eligibility: v.eligibility ?? null,
    model: v.model,
    tokensUsed: v.tokensUsed,
    durationMs: v.durationMs,
  };
}

const emptyOutcome = (): ScanOutcome => ({
  found: 0,
  saved: 0,
  approved: 0,
  rejected: 0,
  refreshed: 0,
  rescanned: 0,
  skipped: 0,
  unanalyzed: 0,
});

/**
 * Scrape one feed, analyze every genuinely-new job inline, and store ONLY the
 * checked result. A feed scan never persists a job in PENDING state — the
 * database holds analyzed jobs (suitable / not suitable) only.
 *
 * Scraped jobs are processed in waves: a wave's jobs are deduped, the new ones
 * analyzed in a single batched LLM call, and the verdicts stored, before the
 * next wave starts. Working in waves keeps the per-job dedup cost proportional
 * to how many jobs we can actually analyze inside the time budget, instead of
 * paying it for the whole list up front. Jobs not reached before the budget is
 * spent are simply not stored; the next scan re-fetches and retries them.
 */
export async function runFeedScan(
  key: string,
  preloadedConfig?: Record<string, string>,
  options: RunFeedScanOptions = {},
): Promise<ScanOutcome> {
  const feed = getFeed(key);
  if (!feed) throw new Error(`Unknown scanner: ${key}`);

  // One config read per scan (or zero, if the caller already loaded it).
  const config = preloadedConfig ?? (await getAllConfig());

  if (config[`${key}_enabled`] === "false") {
    return { ...emptyOutcome(), warning: "scanner disabled" };
  }

  const maxJobs = Math.min(200, Math.max(1, Number(config[`${key}_max_jobs`]) || 25));
  const rescanAfterDays = Math.max(0, Number(config["scanner_rescan_after_days"]) || 0);
  const batchSize = Math.min(12, Math.max(1, Number(config["analyzer_batch_size"]) || 8));

  const startedAt = Date.now();
  const totalBudget = options.timeBudgetMs;
  // Scraping is usually the fast part — reserve the bulk of the budget for the
  // AI analysis that now runs inside every scan.
  const scrapeBudget = totalBudget ? Math.max(8_000, Math.round(totalBudget * 0.4)) : undefined;
  // Latest moment we may still begin analyzing a wave.
  const analyzeDeadline = totalBudget ? startedAt + totalBudget - 3_000 : undefined;

  // --- Scrape -------------------------------------------------------------
  const controller = new AbortController();
  const timer = scrapeBudget ? setTimeout(() => controller.abort(), scrapeBudget) : null;
  let result: FeedFetchResult;
  try {
    result = await feed.fetch({
      maxJobs,
      searchUrl: config[`${key}_search_url`] || undefined,
      signal: controller.signal,
      config,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }

  // --- Process the scraped jobs in waves ----------------------------------
  let saved = 0;
  let approved = 0;
  let rejected = 0;
  let refreshed = 0;
  let rescanned = 0;
  let skipped = 0;
  let unanalyzed = 0;
  let rateLimited = false;
  let timedOut = false;
  let analyzeError: string | undefined;
  let stopped = false;

  const seenInFetch = new Set<string>();
  let pendingFresh: NormalizedJob[] = [];
  let pendingRescan: { job: NormalizedJob; rowId: number }[] = [];

  // Analyze the accumulated wave with one batched LLM call, then store every
  // job that came back with a verdict. Jobs the model could not classify, or
  // that we ran out of budget for, are left unstored for the next scan.
  const storeWave = async (): Promise<void> => {
    const freshCount = pendingFresh.length;
    const batch: NormalizedJob[] = [...pendingFresh, ...pendingRescan.map((r) => r.job)];
    const rescanRows = pendingRescan;
    pendingFresh = [];
    pendingRescan = [];
    if (batch.length === 0) return;

    const analysis = await analyzeScrapedJobs(
      batch.map((j) => ({
        title: j.title,
        company: j.company,
        location: j.location ?? null,
        description: j.description ?? null,
      })),
      {
        batchSize,
        timeBudgetMs: analyzeDeadline ? Math.max(0, analyzeDeadline - Date.now()) : undefined,
      },
    );

    for (let i = 0; i < batch.length; i++) {
      const verdict = analysis.verdicts.get(i);
      if (!verdict) {
        unanalyzed++; // not checked — deliberately NOT stored
        continue;
      }
      const job = batch[i];
      const jv = verdictFrom(verdict);
      if (i < freshCount) {
        const created = await createAnalyzedScrapedJob({
          platform: job.platform,
          title: job.title,
          company: job.company,
          url: job.url,
          location: job.location ?? null,
          description: job.description ?? null,
          salary: job.salary ?? null,
          manualApplyUrl: job.applyUrl ?? null,
          verdict: jv,
        });
        if (created) {
          saved++;
          if (jv.status === "APPROVED") approved++;
          else rejected++;
        }
      } else {
        await applyVerdictToJob(rescanRows[i - freshCount].rowId, jv);
        rescanned++;
        if (jv.status === "APPROVED") approved++;
        else rejected++;
      }
    }

    if (analysis.rateLimited) {
      rateLimited = true;
      stopped = true;
    }
    if (analysis.timedOut) {
      timedOut = true;
      stopped = true;
    }
    if (analysis.error) {
      analyzeError = analysis.error;
      stopped = true;
    }
  };

  let idx = 0;
  for (; idx < result.jobs.length; idx++) {
    if (stopped) break;
    if (analyzeDeadline && Date.now() >= analyzeDeadline) {
      timedOut = true;
      break;
    }
    const job = result.jobs[idx];

    // Collapse exact duplicates within a single fetch so we never spend two AI
    // slots — or hit a unique-constraint race — on the same posting.
    const dedupKey = `${job.url}\n${job.title.toLowerCase()}\n${job.company.toLowerCase()}`;
    if (seenInFetch.has(dedupKey)) continue;
    seenInFetch.add(dedupKey);

    if (await shouldSkipJob({ title: job.title, company: job.company, externalUrl: job.url })) {
      skipped++;
      continue;
    }

    const existing = await findExistingJob({
      platform: job.platform,
      url: job.url,
      title: job.title,
      company: job.company,
    });
    if (!existing) {
      pendingFresh.push(job);
    } else {
      const didRefresh = await refreshScrapedJob(existing, {
        location: job.location,
        salary: job.salary,
        description: job.description,
        manualApplyUrl: job.applyUrl,
      });
      const ageDays = (Date.now() - new Date(existing.createdAt).getTime()) / 86_400_000;
      if (rescanAfterDays > 0 && ageDays >= rescanAfterDays) {
        pendingRescan.push({ job, rowId: existing.id });
      } else if (didRefresh) {
        refreshed++;
      } else {
        skipped++;
      }
    }

    if (pendingFresh.length + pendingRescan.length >= batchSize) {
      await storeWave();
    }
  }
  // Final partial wave — only if we did not already stop on a rate-limit / error.
  if (!stopped) await storeWave();

  // Jobs still queued (a stop hit mid-wave) plus jobs never reached before the
  // budget ran out — none of these were stored; the next scan retries them.
  unanalyzed += pendingFresh.length + pendingRescan.length;
  if (idx < result.jobs.length) unanalyzed += result.jobs.length - idx;

  // --- Human-readable summary --------------------------------------------
  const parts: string[] = [];
  if (result.warning) parts.push(result.warning);
  const checked = approved + rejected;
  if (checked > 0) {
    parts.push(`checked ${checked}: ${approved} suitable, ${rejected} not suitable`);
  }
  if (unanalyzed > 0) {
    const why = rateLimited
      ? "AI rate-limited"
      : analyzeError
        ? analyzeError
        : timedOut
          ? "time budget reached"
          : "not reached";
    parts.push(`${unanalyzed} left for next run (${why})`);
  }

  return {
    found: result.jobs.length,
    saved,
    approved,
    rejected,
    refreshed,
    rescanned,
    skipped,
    unanalyzed,
    warning: parts.length ? parts.join("; ") : undefined,
  };
}
