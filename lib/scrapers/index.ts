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
import { activeUsers } from "../users";
import { getUserSettings, wantsBoard } from "../userSettings";

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
  /**
   * Judge the jobs for these users only. Default: every active user who gets
   * this board's results (their Settings → Job boards).
   */
  userIds?: number[];
};

/** One user's share of a board scan. */
export type UserScanOutcome = ScanOutcome & { userId: number };

export type FeedScanResult = ScanOutcome & {
  /** Per user, in the order they were judged. */
  users: UserScanOutcome[];
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

/** The active users who get this board's results, limited to `only` when given. */
async function usersForBoard(key: string, only?: number[]): Promise<number[]> {
  const ids: number[] = [];
  for (const user of await activeUsers()) {
    if (only && !only.includes(user.id)) continue;
    if (wantsBoard(await getUserSettings(user.id), key)) ids.push(user.id);
  }
  return ids;
}

// Why a scan stopped early. A rate limit or an AI error stops the whole board
// (the next user would hit the same wall); the time budget is checked per wave.
type StopFlags = { rateLimited: boolean; timedOut: boolean; analyzeError?: string };

type JudgeContext = {
  batchSize: number;
  rescanAfterDays: number;
  /** Latest moment we may still begin analyzing a wave. */
  analyzeDeadline?: number;
  flags: StopFlags;
};

type Counts = Omit<ScanOutcome, "found" | "warning">;

function summarize(feedWarning: string | undefined, o: Counts, flags: StopFlags): string | undefined {
  const parts: string[] = [];
  if (feedWarning) parts.push(feedWarning);
  const checked = o.approved + o.rejected;
  if (checked > 0) {
    parts.push(`checked ${checked}: ${o.approved} suitable, ${o.rejected} not suitable`);
  }
  if (o.unanalyzed > 0) {
    const why = flags.rateLimited
      ? "AI rate-limited"
      : flags.analyzeError
        ? flags.analyzeError
        : flags.timedOut
          ? "time budget reached"
          : "not reached";
    parts.push(`${o.unanalyzed} left for next run (${why})`);
  }
  return parts.length ? parts.join("; ") : undefined;
}

/**
 * Scrape one feed ONCE, then judge it for every user who wants this board:
 * each user's genuinely-new jobs are analyzed inline with that user's search
 * options and stored as their own rows, and ONLY the checked result is stored.
 * A feed scan never persists a job in PENDING state — the database holds
 * analyzed jobs (suitable / not suitable) only.
 *
 * Users are judged one after another inside the same time budget. Jobs a user
 * already has cost no AI, so a user not reached in this run gets the budget on
 * the next one, and re-running is always safe.
 */
export async function runFeedScan(
  key: string,
  preloadedConfig?: Record<string, string>,
  options: RunFeedScanOptions = {},
): Promise<FeedScanResult> {
  const feed = getFeed(key);
  if (!feed) throw new Error(`Unknown scanner: ${key}`);

  // One config read per scan (or zero, if the caller already loaded it).
  const config = preloadedConfig ?? (await getAllConfig());

  if (config[`${key}_enabled`] === "false") {
    return { ...emptyOutcome(), warning: "scanner disabled", users: [] };
  }
  const userIds = await usersForBoard(key, options.userIds);
  if (userIds.length === 0) {
    return { ...emptyOutcome(), warning: "no active user gets this board's results", users: [] };
  }

  const maxJobs = Math.min(200, Math.max(1, Number(config[`${key}_max_jobs`]) || 25));
  const rescanAfterDays = Math.max(0, Number(config["scanner_rescan_after_days"]) || 0);
  const batchSize = Math.min(12, Math.max(1, Number(config["analyzer_batch_size"]) || 8));

  const startedAt = Date.now();
  const totalBudget = options.timeBudgetMs;
  // Scraping is usually the fast part — reserve the bulk of the budget for the
  // AI analysis that now runs inside every scan.
  const scrapeBudget = totalBudget ? Math.max(8_000, Math.round(totalBudget * 0.4)) : undefined;
  const analyzeDeadline = totalBudget ? startedAt + totalBudget - 3_000 : undefined;

  // --- Scrape (once, for everyone) ----------------------------------------
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

  // Collapse exact duplicates within a single fetch so we never spend two AI
  // slots — or hit a unique-constraint race — on the same posting.
  const seenInFetch = new Set<string>();
  const jobs = result.jobs.filter((job) => {
    const dedupKey = `${job.url}\n${job.title.toLowerCase()}\n${job.company.toLowerCase()}`;
    if (seenInFetch.has(dedupKey)) return false;
    seenInFetch.add(dedupKey);
    return true;
  });

  // --- Judge for each user ------------------------------------------------
  const flags: StopFlags = { rateLimited: false, timedOut: false };
  const ctx: JudgeContext = { batchSize, rescanAfterDays, analyzeDeadline, flags };
  const users: UserScanOutcome[] = [];
  for (const userId of userIds) {
    let counts: Counts;
    if (flags.rateLimited || flags.analyzeError || (analyzeDeadline && Date.now() >= analyzeDeadline)) {
      if (!flags.rateLimited && !flags.analyzeError) flags.timedOut = true;
      // Not reached in this run: nothing stored for them, the next scan retries.
      counts = { ...emptyOutcome(), unanalyzed: jobs.length };
    } else {
      counts = await judgeForUser(userId, jobs, ctx);
    }
    users.push({ ...counts, userId, found: result.jobs.length, warning: summarize(result.warning, counts, flags) });
  }

  const total: Counts = { ...emptyOutcome() };
  for (const u of users) {
    total.saved += u.saved;
    total.approved += u.approved;
    total.rejected += u.rejected;
    total.refreshed += u.refreshed;
    total.rescanned += u.rescanned;
    total.skipped += u.skipped;
    total.unanalyzed += u.unanalyzed;
  }
  return { ...total, found: result.jobs.length, warning: summarize(result.warning, total, flags), users };
}

/**
 * One user's pass over the scraped jobs, in waves: a wave's jobs are deduped
 * against the user's own jobs, the new ones analyzed in a single batched LLM
 * call with the user's search options, and the verdicts stored, before the next
 * wave starts. Working in waves keeps the per-job dedup cost proportional to
 * how many jobs we can actually analyze inside the time budget. Jobs not
 * reached before the budget is spent are simply not stored; the next scan
 * re-fetches and retries them.
 */
async function judgeForUser(userId: number, jobs: NormalizedJob[], ctx: JudgeContext): Promise<Counts> {
  const counts: Counts = { ...emptyOutcome() };
  const { flags } = ctx;
  let stopped = false;
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
        userId,
        batchSize: ctx.batchSize,
        timeBudgetMs: ctx.analyzeDeadline ? Math.max(0, ctx.analyzeDeadline - Date.now()) : undefined,
      },
    );

    for (let i = 0; i < batch.length; i++) {
      const verdict = analysis.verdicts.get(i);
      if (!verdict) {
        counts.unanalyzed++; // not checked — deliberately NOT stored
        continue;
      }
      const job = batch[i];
      const jv = verdictFrom(verdict);
      if (i < freshCount) {
        const created = await createAnalyzedScrapedJob({
          userId,
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
          counts.saved++;
          if (jv.status === "APPROVED") counts.approved++;
          else counts.rejected++;
        }
      } else {
        await applyVerdictToJob(rescanRows[i - freshCount].rowId, jv);
        counts.rescanned++;
        if (jv.status === "APPROVED") counts.approved++;
        else counts.rejected++;
      }
    }

    if (analysis.rateLimited) {
      flags.rateLimited = true;
      stopped = true;
    }
    if (analysis.timedOut) {
      flags.timedOut = true;
      stopped = true;
    }
    if (analysis.error) {
      flags.analyzeError = analysis.error;
      stopped = true;
    }
  };

  let idx = 0;
  for (; idx < jobs.length; idx++) {
    if (stopped) break;
    if (ctx.analyzeDeadline && Date.now() >= ctx.analyzeDeadline) {
      flags.timedOut = true;
      break;
    }
    const job = jobs[idx];

    if (await shouldSkipJob({ userId, title: job.title, company: job.company, externalUrl: job.url })) {
      counts.skipped++;
      continue;
    }

    const existing = await findExistingJob({
      userId,
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
      if (ctx.rescanAfterDays > 0 && ageDays >= ctx.rescanAfterDays) {
        pendingRescan.push({ job, rowId: existing.id });
      } else if (didRefresh) {
        counts.refreshed++;
      } else {
        counts.skipped++;
      }
    }

    if (pendingFresh.length + pendingRescan.length >= ctx.batchSize) {
      await storeWave();
    }
  }
  // Final partial wave — only if we did not already stop on a rate-limit / error.
  if (!stopped) await storeWave();

  // Jobs still queued (a stop hit mid-wave) plus jobs never reached before the
  // budget ran out — none of these were stored; the next scan retries them.
  counts.unanalyzed += pendingFresh.length + pendingRescan.length;
  if (idx < jobs.length) counts.unanalyzed += jobs.length - idx;
  return counts;
}
