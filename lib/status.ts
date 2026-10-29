import { cache } from "react";

import { prisma } from "./prisma";
import { getConfig } from "./config";
import { claudeSpendThisMonth } from "./aiUsage";
import { parseAiRoutes, type ProviderId } from "./aiRoutes";
import { getProfile } from "./profile";
import { profileCompleteness } from "./profileModel";
import { usesDefaultPassword } from "./users";

// Live status for the admin shell: the top status strip, the sidebar badges
// and the Setup checklist. Every query is independent and fails soft, so one
// missing table (before /api/setup ran) never blanks the whole strip. Only
// reading the settings throws (the database is down or refusing connections),
// so every caller catches.

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
  db: { sizeBytes: number | null; limitBytes: number };
  sheets: { configured: boolean; unsynced: number };
  extension: { keySet: boolean; lastSeen: string | null };
  counts: { pending: number; review: number; followUpsDue: number; approved24h: number; applied: number };
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

// adminId: the signed-in admin, for the "change the default password" step.
async function loadStatusSnapshot(adminId: number | null): Promise<StatusSnapshot> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
  const config = await getConfig();
  const routes = parseAiRoutes(config.aiRoutesRaw, config.aiProviders);

  const reviewWhere = {
    status: { in: ["APPROVED", "REJECTED"] as ("APPROVED" | "REJECTED")[] },
    feedback: null,
    stage: null,
    aiScore: { gte: config.reviewBandMin, lte: config.reviewBandMax },
    createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60_000) },
  };

  const [
    lastScan,
    spendUsd,
    aiGroups,
    dbSize,
    unsynced,
    lastExtensionCall,
    lastLinkedInJob,
    pending,
    review,
    followUpsDue,
    approved24h,
    applied,
    defaultPassword,
    profile,
    resumeCount,
    tablesReady,
  ] = await Promise.all([
    soft(prisma.scanLog.findFirst({ orderBy: { createdAt: "desc" } }), null),
    soft(claudeSpendThisMonth(), 0),
    soft(
      prisma.aiUsage.groupBy({ by: ["ok"], where: { createdAt: { gte: dayAgo } }, _count: { _all: true } }),
      [] as { ok: boolean; _count: { _all: number } }[],
    ),
    soft(
      prisma
        .$queryRaw<{ size: bigint }[]>`SELECT pg_database_size(current_database())::bigint AS size`
        .then((r) => Number(r[0]?.size ?? 0)),
      null as number | null,
    ),
    soft(prisma.scrapedJob.count({ where: { status: "APPROVED", sheetSynced: false } }), 0),
    soft(
      prisma.aiUsage.findFirst({ where: { task: "extension" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      null,
    ),
    soft(
      prisma.scrapedJob.findFirst({
        where: { platform: "linkedin" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      null,
    ),
    soft(prisma.scrapedJob.count({ where: { status: "PENDING" } }), 0),
    soft(prisma.scrapedJob.count({ where: reviewWhere }), 0),
    soft(
      prisma.scrapedJob.count({
        where: {
          stage: { in: ["APPLIED", "INTERVIEW"] },
          followUpAt: { lte: new Date(now.getTime() + 24 * 60 * 60_000) },
        },
      }),
      0,
    ),
    soft(prisma.scrapedJob.count({ where: { status: "APPROVED", createdAt: { gte: dayAgo } } }), 0),
    soft(prisma.scrapedJob.count({ where: { stage: { in: ["APPLIED", "INTERVIEW", "OFFER"] } } }), 0),
    soft(adminId == null ? Promise.resolve(false) : usesDefaultPassword(adminId), false),
    soft(getProfile(), null),
    soft(prisma.resume.count(), 0),
    soft(prisma.$queryRaw<{ ok: boolean }[]>`SELECT to_regclass('"Resume"') IS NOT NULL AS ok`.then((r) => !!r[0]?.ok), false),
  ]);

  const calls24h = aiGroups.reduce((s, g) => s + g._count._all, 0);
  const failures24h = aiGroups.filter((g) => !g.ok).reduce((s, g) => s + g._count._all, 0);
  const seen = [lastExtensionCall?.createdAt, lastLinkedInJob?.createdAt].filter(Boolean) as Date[];
  const extensionLastSeen = seen.length ? new Date(Math.max(...seen.map((d) => d.getTime()))) : null;
  const sheetsConfigured = !!(config.googleSheetsCredentials && config.googleSheetId);
  const cronSecretMissing = !process.env.CRON_SECRET?.trim();
  const sessionSecretMissing = !process.env.SESSION_SECRET?.trim();

  const routeReady = (task: "scan" | "extension") => routes[task].providers.some((p) => providerHasKey(p, config));
  const completeness = profile ? profileCompleteness(profile) : { filled: 0, total: 1, missing: [] };

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
      key: "extension-key",
      title: "Generate the extension API key",
      done: !!config.extensionApiKey,
      optional: false,
      href: "/admin/extension",
      hint: "The extension cannot talk to the server without it.",
    },
    {
      key: "extension-seen",
      title: "Run a LinkedIn scan with the extension",
      done: !!extensionLastSeen,
      optional: true,
      href: "/admin/extension",
      hint: "Load the extension/ folder in chrome://extensions, paste the server URL and key, scan a search.",
    },
    {
      key: "profile",
      title: "Fill in your profile",
      done: completeness.filled >= Math.ceil(completeness.total * 0.6),
      optional: true,
      href: "/admin/profile",
      hint: "Autofill and AI answers use it; matching can use it too.",
    },
    {
      key: "resume",
      title: "Upload a resume",
      done: resumeCount > 0,
      optional: true,
      href: "/admin/profile?tab=resumes",
      hint: "Autofill attaches it to application forms.",
    },
    {
      key: "sheets",
      title: "Connect Google Sheets",
      done: sheetsConfigured,
      optional: true,
      href: "/admin/settings#sheets",
      hint: "Optional export of approved jobs.",
    },
  ];

  return {
    generatedAt: now.toISOString(),
    lastScan: lastScan
      ? { at: lastScan.createdAt.toISOString(), board: lastScan.board, error: lastScan.errors ?? null }
      : null,
    claude: { keySet: !!config.anthropicApiKey, spendUsd, budgetUsd: config.claudeMonthlyBudgetUsd },
    ai: { calls24h, failures24h },
    db: { sizeBytes: dbSize, limitBytes: SUPABASE_FREE_DB_BYTES },
    sheets: { configured: sheetsConfigured, unsynced },
    extension: { keySet: !!config.extensionApiKey, lastSeen: extensionLastSeen?.toISOString() ?? null },
    counts: { pending, review, followUpsDue, approved24h, applied },
    warnings: { defaultPassword, cronSecretMissing, sessionSecretMissing },
    setup: { done: steps.filter((s) => s.done).length, total: steps.length, steps },
  };
}

// Once per page render: the admin layout and a page that also needs the
// snapshot (Dashboard, Setup, Extension) share one round of queries instead of
// doubling the load on the connection pool (React's cache() matches on the
// admin id argument). Outside a render (the status API) every call runs fresh.
export const getStatusSnapshot = cache(loadStatusSnapshot);
