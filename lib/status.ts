import { cache } from "react";

import { prisma } from "./prisma";
import { getConfig } from "./config";
import { claudeSpendThisMonth } from "./aiUsage";
import { parseAiRoutes, type ProviderId } from "./aiRoutes";
import { listExtensionBrowsers } from "./extensionTokens";
import { getProfile } from "./profile";
import { profileCompleteness } from "./profileModel";
import { measureDbPlacement, type DbPlacement } from "./dbLatency";
import { NEAR_DB_MS } from "./format";
import { nextActionCounts } from "./nextActions";
import type { CandidateProfile } from "./profileModel";
import { hasReview, reviewQueueWhere } from "./review";
import { scopedUsers, type AdminScope, type ScopedUser } from "./scope";
import { markStatusStale, slowStore } from "./statusCache";
import { usesDefaultPassword } from "./users";

// Live status for the admin shell: the top status strip, the sidebar badges
// and the Setup checklist, for the user being viewed (or all users). Every
// query is independent and fails soft, so one missing table (before /api/setup
// ran) never blanks the whole strip. Only reading the settings throws (the
// database is down or refusing connections), so every caller catches.

export const SUPABASE_FREE_DB_BYTES = 500 * 1024 * 1024;

export type SetupStep = {
  key: string;
  title: string;
  done: boolean;
  optional: boolean;
  href: string;
  hint: string;
};

export type StatusSnapshot = {
  generatedAt: string;
  lastScan: { at: string; board: string; error: string | null } | null;
  claude: { keySet: boolean; spendUsd: number; budgetUsd: number };
  ai: { calls24h: number; failures24h: number };
  /** latencyMs: one query's round trip; the regions when known (lib/dbLatency.ts). */
  db: { sizeBytes: number | null; limitBytes: number } & DbPlacement;
  sheets: { configured: boolean; unsynced: number };
  /** browsers: signed in to the extension, any user; keySet: the old shared key (extension 2.0) is on. */
  extension: { keySet: boolean; lastSeen: string | null; browsers: number };
  /** nextActions: follow-ups due, interviews coming up and the rest of Next actions (lib/nextActions.ts). */
  counts: { pending: number; review: number; nextActions: number; approved24h: number; applied: number };
  /** Review / Applications is on for at least one user in view (off, the page and its badge are hidden). */
  features: { review: boolean; applications: boolean };
  warnings: { defaultPassword: boolean; cronSecretMissing: boolean; sessionSecretMissing: boolean };
  setup: { done: number; total: number; steps: SetupStep[] };
};

async function soft<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

function providerHasKey(id: ProviderId, c: Awaited<ReturnType<typeof getConfig>>): boolean {
  switch (id) {
    case "claude":
      return !!c.anthropicApiKey;
    case "gemini":
      return !!c.geminiApiKey;
    case "groq":
      return !!c.groqApiKey;
    case "cerebras":
      return !!c.cerebrasApiKey;
    case "openrouter":
      return !!c.openrouterApiKey;
    case "cloudflare":
      return !!(c.cloudflareAccountId && c.cloudflareApiKey);
  }
}

// The parts that rarely change (the setup checks, the database's size and
// distance, the last scan, AI use in the last day, the extension's last call):
// kept for a minute for each admin and view, so the 30 s polls and page loads
// don't ask again. Any change drops them (markStatusStale: a write through the
// admin or extension API, /api/setup), so the strip and checklist follow what
// was just done. The counts behind the badges are read every time.
const SLOW_TTL_MS = 60_000;

type SlowPart = {
  lastScan: { createdAt: Date; board: string; errors: string | null } | null;
  spendUsd: number;
  calls24h: number;
  failures24h: number;
  dbSize: number | null;
  placement: DbPlacement;
  extensionLastSeen: Date | null;
  defaultPassword: boolean;
  profiles: CandidateProfile[];
  resumeUsers: Set<number>;
  tablesReady: boolean;
  extensionBrowsers: number;
};

const store = slowStore<SlowPart>();

async function loadSlowPart(scope: AdminScope, activeScoped: ScopedUser[], now: Date): Promise<SlowPart> {
  const key = `${scope.admin.id}:${scope.viewing}`;
  const hit = store.entries.get(key);
  if (hit && hit.expiresAt > now.getTime()) return hit.value;
  const generation = store.generation;
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
  const mine = scope.viewing === "all" ? {} : { userId: scope.viewing };
  const [
    lastScan,
    spendUsd,
    aiGroups,
    dbSize,
    placement,
    lastExtensionCall,
    lastLinkedInJob,
    defaultPassword,
    profiles,
    resumeGroups,
    tablesReady,
    extensionBrowsers,
  ] = await Promise.all([
    soft(prisma.scanLog.findFirst({ where: mine, orderBy: { createdAt: "desc" }, select: { createdAt: true, board: true, errors: true } }), null),
    soft(claudeSpendThisMonth(), 0),
    soft(
      prisma.aiUsage.groupBy({ by: ["ok"], where: { ...mine, createdAt: { gte: dayAgo } }, _count: { _all: true } }),
      [] as { ok: boolean; _count: { _all: number } }[],
    ),
    soft(
      prisma
        .$queryRaw<{ size: bigint }[]>`SELECT pg_database_size(current_database())::bigint AS size`
        .then((r) => Number(r[0]?.size ?? 0)),
      null as number | null,
    ),
    measureDbPlacement(),
    soft(
      prisma.aiUsage.findFirst({
        where: { ...mine, task: "extension" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      null,
    ),
    soft(
      prisma.scrapedJob.findFirst({
        where: { ...mine, platform: "linkedin" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      null,
    ),
    soft(scope.degraded ? Promise.resolve(false) : usesDefaultPassword(scope.admin.id), false),
    soft(Promise.all(activeScoped.map((u) => getProfile(u.id))), [] as CandidateProfile[]),
    soft(
      prisma.resume.groupBy({ by: ["userId"], where: mine, _count: { _all: true } }),
      [] as { userId: number; _count: { _all: number } }[],
    ),
    // The newest table and column: both exist once /api/setup ran after the last upgrade.
    soft(
      prisma
        .$queryRaw<{ ok: boolean }[]>`SELECT to_regclass('"Draft"') IS NOT NULL
          AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'ScrapedJob' AND column_name = 'closeReason') AS ok`
        .then((r) => !!r[0]?.ok),
      false,
    ),
    // Any user's: an admin scanning for someone uses their own sign-in.
    soft(listExtensionBrowsers(null).then((b) => b.length), 0),
  ]);
  const seen = [lastExtensionCall?.createdAt, lastLinkedInJob?.createdAt].filter(Boolean) as Date[];
  const value: SlowPart = {
    lastScan,
    spendUsd,
    calls24h: aiGroups.reduce((s, g) => s + g._count._all, 0),
    failures24h: aiGroups.filter((g) => !g.ok).reduce((s, g) => s + g._count._all, 0),
    dbSize,
    placement,
    extensionLastSeen: seen.length ? new Date(Math.max(...seen.map((d) => d.getTime()))) : null,
    defaultPassword,
    profiles,
    resumeUsers: new Set(resumeGroups.filter((g) => g._count._all > 0).map((g) => g.userId)),
    tablesReady,
    extensionBrowsers,
  };
  // Not when something changed while it was being read.
  if (store.generation === generation) store.entries.set(key, { value, expiresAt: now.getTime() + SLOW_TTL_MS });
  return value;
}

type JobCounts = { pending: number; unsynced: number; approved24h: number; applied: number };

// The jobs' counts in one pass; an older database (before /api/setup) one at a time, each failing on its own.
async function jobCounts(userId: number | null, dayAgo: Date): Promise<JobCounts> {
  try {
    const rows = await prisma.$queryRaw<{ pending: bigint; unsynced: bigint; approved24h: bigint; applied: bigint }[]>`
      SELECT COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
             COUNT(*) FILTER (WHERE status = 'APPROVED' AND NOT "sheetSynced") AS unsynced,
             COUNT(*) FILTER (WHERE status = 'APPROVED' AND "createdAt" >= ${dayAgo}) AS approved24h,
             COUNT(*) FILTER (WHERE stage IN ('APPLIED', 'INTERVIEW', 'OFFER')) AS applied
      FROM "ScrapedJob" WHERE ${userId}::int IS NULL OR "userId" = ${userId}::int`;
    const r = rows[0];
    return { pending: Number(r?.pending ?? 0), unsynced: Number(r?.unsynced ?? 0), approved24h: Number(r?.approved24h ?? 0), applied: Number(r?.applied ?? 0) };
  } catch {
    const mine = userId == null ? {} : { userId };
    const [pending, unsynced, approved24h, applied] = await Promise.all([
      soft(prisma.scrapedJob.count({ where: { ...mine, status: "PENDING" } }), 0),
      soft(prisma.scrapedJob.count({ where: { ...mine, status: "APPROVED", sheetSynced: false } }), 0),
      soft(prisma.scrapedJob.count({ where: { ...mine, status: "APPROVED", createdAt: { gte: dayAgo } } }), 0),
      soft(prisma.scrapedJob.count({ where: { ...mine, stage: { in: ["APPLIED", "INTERVIEW", "OFFER"] } } }), 0),
    ]);
    return { pending, unsynced, approved24h, applied };
  }
}

// What to do about a far database: the exact region when the database's is known.
function regionHint(p: DbPlacement): string {
  if (p.latencyMs == null) return "The database did not answer the timing check.";
  const each = `Each database query takes about ${p.latencyMs} ms`;
  if (p.latencyMs < NEAR_DB_MS) return `${each}: the app and its database are close.`;
  if (p.suggest) {
    return `${each}: the app runs in ${p.functionRegion} and the database in ${p.databaseRegion}. In Vercel → your project → Settings → Functions, set the Function Region to ${p.suggest.city} (${p.suggest.id}) and redeploy: every page gets faster.`;
  }
  return `${each}. Run the app in the region of your database (Vercel → your project → Settings → Functions → Function Region, the one closest to your Supabase project's region), then redeploy: every page gets faster.`;
}

async function loadStatusSnapshot(scope: AdminScope): Promise<StatusSnapshot> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
  const config = await getConfig();
  const routes = parseAiRoutes(config.aiRoutesRaw, config.aiProviders);
  const users = await scopedUsers(scope);
  // Only users whose searches run count for "every user has …" steps.
  const activeScoped = users.filter((u) => u.user.active);
  const reviewOn = hasReview(users);
  const reviewWhere = reviewQueueWhere(users, now);
  // Next actions count only for users with Applications on.
  const pipelineUsers = users.filter((u) => u.settings.applicationsEnabled);
  const applicationsOn = pipelineUsers.length > 0;

  const [slow, counts, review, nextActions] = await Promise.all([
    loadSlowPart(scope, activeScoped, now),
    jobCounts(scope.viewing === "all" ? null : scope.viewing, dayAgo),
    soft(reviewOn ? prisma.scrapedJob.count({ where: reviewWhere }) : Promise.resolve(0), 0),
    soft(
      nextActionCounts(pipelineUsers, now).then((c) => [...c.values()].reduce((s, n) => s + n, 0)),
      0,
    ),
  ]);
  const { lastScan, spendUsd, calls24h, failures24h, dbSize, placement, extensionLastSeen, defaultPassword, profiles, resumeUsers, tablesReady, extensionBrowsers } = slow;
  const { pending, unsynced, approved24h, applied } = counts;
  const cronSecretMissing = !process.env.CRON_SECRET?.trim();
  const sessionSecretMissing = !process.env.SESSION_SECRET?.trim();

  const routeReady = (task: "scan" | "extension") => routes[task].providers.some((p) => providerHasKey(p, config));

  // Per-user steps are done when every active user in view has it; with more
  // than one user, the hint names who is missing.
  const many = activeScoped.length > 1;
  const missing = (has: (u: (typeof activeScoped)[number], i: number) => boolean) =>
    activeScoped.filter((u, i) => !has(u, i)).map((u) => u.user.name);
  const hintFor = (hint: string, names: string[]) => (many && names.length ? `${hint} Missing for: ${names.join(", ")}.` : hint);
  const noSearch = missing((u) => !!(u.settings.currentLocation && u.settings.targetMarket));
  const noProfile = missing((_u, i) => {
    const c = profiles[i] ? profileCompleteness(profiles[i]) : { filled: 0, total: 1 };
    return c.filled >= Math.ceil(c.total * 0.6);
  });
  const noResume = missing((u) => resumeUsers.has(u.id));
  const noSheet = missing((u) => !!(config.googleSheetsCredentials && u.settings.googleSheetId));
  const sheetsConfigured = !!config.googleSheetsCredentials && users.some((u) => !!u.settings.googleSheetId);

  const steps: SetupStep[] = [
    {
      key: "tables",
      title: "Create / update the database tables",
      done: tablesReady,
      optional: false,
      href: "/api/setup",
      hint: "Open /api/setup once after every upgrade — it adds new tables and columns safely.",
    },
    {
      key: "region",
      title: "Run the app next to its database",
      done: placement.latencyMs != null && placement.latencyMs < NEAR_DB_MS,
      optional: true,
      href: "/admin/setup#region",
      hint: regionHint(placement),
    },
    {
      key: "password",
      title: "Change the default admin password",
      done: !defaultPassword,
      optional: false,
      href: "/admin/settings#password",
      hint: "The shipped password is “admin”.",
    },
    {
      key: "cron",
      title: "Set CRON_SECRET for the daily scan",
      done: !cronSecretMissing,
      optional: false,
      href: "/admin/setup#cron",
      hint: "Vercel → Settings → Environment Variables → CRON_SECRET (any long random string). Without it the daily scan is skipped.",
    },
    {
      key: "session",
      title: "Set SESSION_SECRET",
      done: !sessionSecretMissing,
      optional: true,
      href: "/admin/setup#session",
      hint: "Optional: a dedicated secret for sign-in cookies (otherwise derived from DATABASE_URL).",
    },
    {
      key: "scan-ai",
      title: "Give the board-scan route an AI provider with a key",
      done: routeReady("scan"),
      optional: false,
      href: "/admin/ai?tab=routes",
      hint: "Add at least one key (Gemini, Groq, Cerebras, OpenRouter, Cloudflare or Claude).",
    },
    {
      key: "extension-ai",
      title: "Give the LinkedIn-extension route an AI provider with a key",
      done: routeReady("extension"),
      optional: false,
      href: "/admin/ai?tab=routes",
      hint: "Fast providers (Cerebras, Groq) or Claude work best while you watch the scan.",
    },
    {
      key: "claude",
      title: "Add your Claude API key",
      done: !!config.anthropicApiKey,
      optional: true,
      href: "/admin/ai?tab=providers",
      hint: "Better verdicts, strict JSON, resume reading and form answers.",
    },
    {
      key: "extension-signin",
      title: "Sign in to the Chrome extension",
      done: extensionBrowsers > 0,
      optional: false,
      href: "/admin/extension",
      hint: "Install extension 2.1 or newer, then sign in with a user ID and password from System → Users. Admins can scan for any user.",
    },
    {
      key: "extension-seen",
      title: "Run a LinkedIn scan with the extension",
      done: !!extensionLastSeen,
      optional: true,
      href: "/admin/extension",
      hint: "Open a LinkedIn job search and click Start Scan in the extension popup.",
    },
    {
      key: "search",
      title: "Set where each user is based and their target market",
      done: noSearch.length === 0,
      optional: false,
      href: "/admin/settings",
      hint: hintFor("The AI judges every job against them (Settings → Target & matching).", noSearch),
    },
    {
      key: "profile",
      title: "Fill in the profile",
      done: noProfile.length === 0,
      optional: true,
      href: "/admin/profile",
      hint: hintFor("Autofill and AI answers use it; matching can use it too.", noProfile),
    },
    {
      key: "resume",
      title: "Upload a resume",
      done: noResume.length === 0,
      optional: true,
      href: "/admin/profile?tab=resumes",
      hint: hintFor("Autofill attaches it to application forms.", noResume),
    },
    {
      key: "sheets",
      title: "Connect Google Sheets",
      done: noSheet.length === 0,
      optional: true,
      href: "/admin/settings#sheets",
      hint: hintFor("Optional export of approved jobs to each user's own spreadsheet.", noSheet),
    },
    {
      key: "users",
      title: "Add the people you search for",
      done: scope.users.length > 1,
      optional: true,
      href: "/admin/users",
      hint: "Each user gets their own location, profile, results and extension sign-in.",
    },
  ];

  return {
    generatedAt: now.toISOString(),
    lastScan: lastScan
      ? { at: lastScan.createdAt.toISOString(), board: lastScan.board, error: lastScan.errors ?? null }
      : null,
    claude: { keySet: !!config.anthropicApiKey, spendUsd, budgetUsd: config.claudeMonthlyBudgetUsd },
    ai: { calls24h, failures24h },
    db: { sizeBytes: dbSize, limitBytes: SUPABASE_FREE_DB_BYTES, ...placement },
    sheets: { configured: sheetsConfigured, unsynced },
    extension: {
      keySet: !!config.extensionApiKey,
      lastSeen: extensionLastSeen?.toISOString() ?? null,
      browsers: extensionBrowsers,
    },
    counts: { pending, review, nextActions, approved24h, applied },
    features: { review: reviewOn, applications: applicationsOn },
    warnings: { defaultPassword, cronSecretMissing, sessionSecretMissing },
    setup: { done: steps.filter((s) => s.done).length, total: steps.length, steps },
  };
}

// Once per page render: the admin layout and a page that also needs the
// snapshot (Dashboard, Setup, Extension) share one round of queries instead of
// doubling the load on the connection pool (React's cache() matches on the
// scope object, which pageScope() returns once per render). Outside a render
// (the status API) every call runs fresh.
export const getStatusSnapshot = cache(loadStatusSnapshot);

/** Everything read again (the Setup page: people come back to it to see what they just fixed). */
export async function freshStatusSnapshot(scope: AdminScope): Promise<StatusSnapshot> {
  markStatusStale();
  return loadStatusSnapshot(scope);
}
