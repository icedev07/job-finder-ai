import type { Feed, FeedFetchResult, FeedQuery, NormalizedJob } from "./types";
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
// European search engines and public employment services: searched with each
// user's roles in their countries (Settings → What to look for).
import { euresFeed } from "./feeds/eures";
import { arbeitsagenturFeed } from "./feeds/arbeitsagentur";
import { jobtechFeed } from "./feeds/jobtech";
import { reedFeed } from "./feeds/reed";
import { adzunaFeed } from "./feeds/adzuna";
import {
  findExistingJob,
  refreshScrapedJob,
  createAnalyzedScrapedJob,
  applyVerdictToJob,
  type JobVerdict,
} from "../scrapedJobs";
import { shouldSkipJob } from "../jobSkipRules";
import { analyzeScrapedJobs, type InlineVerdict } from "../jobAnalyzer";
import { getAllConfig, setConfigValue } from "../config";
import { filterJob, filterSummary, type FilterReason, type SearchProfile } from "../searchProfile";
import { sourceEnabled } from "../sourceMeta";
import { activeUsers } from "../users";
import { getUserSettings, wantsBoard } from "../userSettings";

// The order of "Scrape all sources" and the daily scan: Europe first.
const FEEDS: Feed[] = [
  // European search engines and public employment services (searched)
  euresFeed,
  arbeitsagenturFeed,
  jobtechFeed,
  reedFeed,
  adzunaFeed,
  // European job boards
  arbeitnowFeed,
  landingJobsFeed,
  noFluffJobsFeed,
  // remote jobs open to Europe
  jobicyFeed,
  remotiveFeed,
  realWorkFromAnywhereFeed,
  // companies' own careers sites
  greenhouseFeed,
  leverFeed,
  ashbyFeed,
  // mostly US, or remote jobs mostly closed to Europe: off until an admin switches them on
  remoteOkFeed,
  workingNomadsFeed,
  hackerNewsFeed,
  theMuseFeed,
  weWorkRemotelyFeed,
  jobspressoFeed,
  authenticJobsFeed,
  nodeskFeed,
  justRemoteFeed,
  // Greenhouse's candidate portal (needs a pasted session cookie)
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
  /** Jobs the free filter dropped (Settings → What to look for), by reason. */
  filtered: Partial<Record<FilterReason, number>>;
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
  filtered: {},
  unanalyzed: 0,
});

/** The active users who get this board's results (with what they look for), limited to `only` when given. */
async function usersForBoard(key: string, only?: number[]): Promise<{ id: number; profile: SearchProfile }[]> {
  const out: { id: number; profile: SearchProfile }[] = [];
  for (const user of await activeUsers()) {
    if (only && !only.includes(user.id)) continue;
    const settings = await getUserSettings(user.id);
    if (wantsBoard(settings, key)) out.push({ id: user.id, profile: settings.searchProfile });
  }
  return out;
}

// A searching source runs at most this many searches a scan; the next scan
// goes on from where this one stopped, so every role and country gets its turn.
const MAX_QUERIES_PER_RUN = 12;

/**
 * The searches a source runs for these users: each of their roles in each of
 * their countries the source covers (remote boards: each role). The same
 * search for two users runs once, with the longer age limit.
 */
export function plannedQueries(feed: Feed, profiles: SearchProfile[]): FeedQuery[] {
  const byKey = new Map<string, FeedQuery>();
  for (const p of profiles) {
    if (!p.roles.length) continue;
    const covered = feed.countries;
    const countries: (string | null)[] =
      covered === "remote" || !covered ? [null] : p.countries.filter((c) => covered.includes(c));
    for (const role of p.roles) {
      for (const country of countries) {
        const key = `${role.toLowerCase()}|${country ?? ""}`;
        const prev = byKey.get(key);
        const maxAgeDays = prev && (prev.maxAgeDays === 0 || p.maxAgeDays === 0) ? 0 : Math.max(prev?.maxAgeDays ?? 0, p.maxAgeDays);
        byKey.set(key, { keywords: role, country, maxAgeDays: prev ? maxAgeDays : p.maxAgeDays });
      }
    }
  }
  return [...byKey.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, q]) => q);
}

/**
 * Run a searching source's queries in turn, from where the last scan stopped,
 * until the budget is spent; the jobs of every query, each once.
 */
async function runQueries(
  feed: Feed,
  queries: FeedQuery[],
  opts: { maxJobs: number; signal: AbortSignal; config: Record<string, string> },
): Promise<FeedFetchResult & { queriesRun: number }> {
  const cursorKey = `${feed.key}_query_cursor`;
  const start = Math.max(0, Number(opts.config[cursorKey]) || 0) % queries.length;
  const jobs: NormalizedJob[] = [];
  const warnings: string[] = [];
  let run = 0;
  for (; run < Math.min(queries.length, MAX_QUERIES_PER_RUN); run++) {
    if (opts.signal.aborted) break;
    const q = queries[(start + run) % queries.length];
    const r = await feed.search!(q, { maxJobs: opts.maxJobs, signal: opts.signal, config: opts.config });
    jobs.push(...r.jobs);
    if (r.warning && !warnings.includes(r.warning)) warnings.push(r.warning);
  }
  if (queries.length > run) {
    await setConfigValue(cursorKey, String((start + run) % queries.length)).catch(() => undefined);
  }
  const more = queries.length > run ? ` (${run} of ${queries.length} searches this scan; the next scan runs the others)` : "";
  return { jobs, queriesRun: run, warning: [`${run} search${run === 1 ? "" : "es"}${more}`, ...warnings].join("; ") };
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
  /** The source's details call, for jobs about to be judged (Feed.describe). */
  describe?: (jobs: NormalizedJob[]) => Promise<void>;
};

type Counts = Omit<ScanOutcome, "found" | "warning">;

function summarize(feedWarning: string | undefined, o: Counts, flags: StopFlags): string | undefined {
  const parts: string[] = [];
  if (feedWarning) parts.push(feedWarning);
  const filtered = filterSummary(o.filtered);
  if (filtered) parts.push(filtered);
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

  if (!sourceEnabled(key, config)) {
    return { ...emptyOutcome(), warning: "scanner disabled", users: [] };
  }
  const wanting = await usersForBoard(key, options.userIds);
  if (wanting.length === 0) {
    return { ...emptyOutcome(), warning: "no active user gets this board's results", users: [] };
  }
  // A searching source finds the roles users look for: someone without roles
  // gets nothing from it (else every posting found for the others would go to
  // the AI for them too), and their log says why.
  const roleless = feed.search ? wanting.filter((u) => u.profile.roles.length === 0) : [];
  const judged = wanting.filter((u) => !roleless.includes(u));
  const userIds = judged.map((u) => u.id);
  const profiles = new Map(judged.map((u) => [u.id, u.profile]));

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
    if (feed.search) {
      // A searching source runs the users' searches (Settings → What to look for).
      const queries = plannedQueries(feed, judged.map((u) => u.profile));
      result = queries.length
        ? await runQueries(feed, queries, { maxJobs, signal: controller.signal, config })
        : {
            jobs: [],
            warning:
              feed.countries === "remote"
                ? "no searches: add the roles to look for (Settings → What to look for)"
                : "no searches: add the roles and countries to look for (Settings → What to look for)",
          };
    } else {
      result = await feed.fetch({
        maxJobs,
        searchUrl: config[`${key}_search_url`] || undefined,
        signal: controller.signal,
        config,
      });
    }
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
  const describe = feed.describe;
  const ctx: JudgeContext = {
    batchSize,
    rescanAfterDays,
    analyzeDeadline,
    flags,
    describe: describe ? (list) => describe(list, { signal: AbortSignal.timeout(15_000), config }) : undefined,
  };
  const users: UserScanOutcome[] = [];
  for (const userId of userIds) {
    let counts: Counts;
    if (flags.rateLimited || flags.analyzeError || (analyzeDeadline && Date.now() >= analyzeDeadline)) {
      if (!flags.rateLimited && !flags.analyzeError) flags.timedOut = true;
      // Not reached in this run: nothing stored for them, the next scan retries.
      counts = { ...emptyOutcome(), unanalyzed: jobs.length };
    } else {
      counts = await judgeForUser(userId, jobs, ctx, profiles.get(userId)!);
    }
    users.push({ ...counts, userId, found: result.jobs.length, warning: summarize(result.warning, counts, flags) });
  }
  for (const u of roleless) {
    users.push({ ...emptyOutcome(), userId: u.id, found: 0, warning: "no searches for this user: add the roles to look for (Settings → What to look for)" });
  }

  const total: Counts = { ...emptyOutcome() };
  for (const u of users) {
    for (const [reason, n] of Object.entries(u.filtered) as [FilterReason, number][]) {
      total.filtered[reason] = (total.filtered[reason] ?? 0) + n;
    }
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
async function judgeForUser(userId: number, jobs: NormalizedJob[], ctx: JudgeContext, profile: SearchProfile): Promise<Counts> {
  const counts: Counts = { ...emptyOutcome(), filtered: {} };
  const now = new Date();
  const { flags } = ctx;
  let stopped = false;
  let pendingFresh: NormalizedJob[] = [];
  let pendingRescan: { job: NormalizedJob; rowId: number }[] = [];

  // Analyze the accumulated wave with one batched LLM call, then store every
  // job that came back with a verdict. Jobs the model could not classify, or
  // that we ran out of budget for, are left unstored for the next scan.
  const storeWave = async (): Promise<void> => {
    if (ctx.describe && pendingFresh.length + pendingRescan.length > 0) {
      // The text the source's search left out, only for these jobs about to be judged.
      await ctx.describe([...pendingFresh, ...pendingRescan.map((r) => r.job)]).catch(() => undefined);
      // The checks that read it (language, closed to Europe, the loose role check), now that it is there.
      pendingFresh = pendingFresh.filter((job) => {
        const fit = filterJob(job, profile, now);
        if (!fit.keep) counts.filtered[fit.reason] = (counts.filtered[fit.reason] ?? 0) + 1;
        return fit.keep;
      });
    }
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
          signals: boardSignals(job),
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

    // Free, before anything else: another role or country, too old, … (Settings → What to look for).
    const fit = filterJob(job, profile, now);
    if (!fit.keep) {
      counts.filtered[fit.reason] = (counts.filtered[fit.reason] ?? 0) + 1;
      continue;
    }

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

/** What a source said about a job that the job row has no column for (shown in the job's panel). */
function boardSignals(job: NormalizedJob): string | null {
  const signals: Record<string, string> = {};
  if (job.postedAt) signals.postedAt = job.postedAt;
  if (job.country) signals.country = job.country.toUpperCase();
  if (job.workplace) signals.workplace = job.workplace;
  return Object.keys(signals).length ? JSON.stringify(signals) : null;
}
