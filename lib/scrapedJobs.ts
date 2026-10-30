import { prisma } from "./prisma";
import { shouldSkipJob } from "./jobSkipRules";

export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.searchParams.delete("utm_source");
    u.searchParams.delete("utm_medium");
    u.searchParams.delete("utm_campaign");
    u.searchParams.delete("utm_content");
    u.searchParams.delete("utm_term");
    u.searchParams.delete("ref");
    u.searchParams.delete("refId");
    u.searchParams.delete("clickId");
    u.searchParams.delete("trk");
    u.searchParams.delete("source");
    u.hash = "";
    const path = u.pathname.replace(/\/+$/, "");
    u.pathname = path || "/";
    const s = u.toString();
    return s.length <= 2048 ? s : s.slice(0, 2048);
  } catch {
    const t = raw.trim();
    return t.length <= 2048 ? t : t.slice(0, 2048);
  }
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeCompany(company: string): string {
  return company
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/,?\s*(inc\.?|llc|ltd\.?|corp\.?|co\.?|gmbh|s\.?a\.?)$/i, "")
    .trim();
}

type UpsertOptions = {
  /**
   * Time-based refresh window in days. When a duplicate is found and its
   * createdAt is older than this many days, the row is refreshed AND its
   * status is reset to PENDING so it gets re-analyzed against current rules.
   * Set to 0 to disable status reset entirely (refresh fields only).
   * Default 0 — preserve AI history unless caller opts in.
   */
  rescanAfterDays?: number;
};

/** The job as saved, with its verdict (so the caller need not read it again). */
export type SavedJob = {
  id: number;
  title: string;
  company: string;
  created: boolean;
  refreshed: boolean;
  rescanned: boolean;
  status: string;
  aiScore: number | null;
  aiReason: string | null;
  platform: string;
  applyMethod: string | null;
};

type FoundRow = {
  id: number;
  title: string;
  company: string;
  createdAt: Date;
  description: string | null;
  status: string;
  aiScore: number | null;
  aiReason: string | null;
  platform: string;
  applyMethod: string | null;
};

// Every lookup below is within one user's jobs: the same posting found for two
// users is two rows, each with its own verdict.
export async function upsertScrapedJob(params: {
  userId: number;
  platform: string;
  title: string;
  company: string;
  url: string;
  location?: string | null;
  description?: string | null;
  salary?: string | null;
  manualApplyUrl?: string | null;
} & UpsertOptions): Promise<SavedJob | null> {
  const {
    userId, platform, title, company, url, location, description, salary, manualApplyUrl,
    rescanAfterDays = 0,
  } = params;

  if (await shouldSkipJob({ userId, title, company, externalUrl: url })) {
    return null;
  }

  const normUrl = normalizeUrl(url);
  const normTitle = normalizeTitle(title);
  const normCompany = normalizeCompany(company);
  const normManual =
    typeof manualApplyUrl === "string" && manualApplyUrl.trim().length > 0
      ? normalizeUrl(manualApplyUrl.trim())
      : null;

  async function refreshRow(row: FoundRow): Promise<SavedJob> {
    const data: Record<string, unknown> = {};

    // Refresh data fields when the new payload has values. Description is
    // only overwritten if the new one is longer (so we don't replace a rich
    // detail-page description with a short list snippet).
    if (location && location.trim()) data.location = location;
    if (salary && salary.trim()) data.salary = salary;
    if (normManual) data.manualApplyUrl = normManual;
    if (description && (!row.description || description.length > row.description.length)) {
      data.description = description;
    }

    let rescanned = false;
    if (rescanAfterDays > 0) {
      const ageMs = Date.now() - new Date(row.createdAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays >= rescanAfterDays) {
        data.status = "PENDING";
        data.aiScore = null;
        data.aiReason = null;
        data.sheetSynced = false;
        rescanned = true;
      }
    }

    const saved: SavedJob = {
      id: row.id,
      title: row.title,
      company: row.company,
      created: false,
      refreshed: false,
      rescanned,
      status: rescanned ? "PENDING" : row.status,
      aiScore: rescanned ? null : row.aiScore,
      aiReason: rescanned ? null : row.aiReason,
      platform: row.platform,
      applyMethod: row.applyMethod,
    };
    if (Object.keys(data).length === 0) return saved;
    await prisma.scrapedJob.update({ where: { id: row.id }, data });
    return { ...saved, refreshed: true };
  }

  // The same job saved before, in one query, the closest match first: the same
  // link on this platform, then the same title and company on this platform,
  // then the same normalized title and company on any platform.
  const [found] = await prisma.$queryRaw<FoundRow[]>`
    SELECT id, title, company, "createdAt", description, status::text AS status, "aiScore", "aiReason", platform, "applyMethod"
    FROM "ScrapedJob"
    WHERE "userId" = ${userId} AND (
      (platform = ${platform} AND url = ${normUrl})
      OR (platform = ${platform} AND title = ${title} AND company = ${company})
      OR (LOWER(TRIM(title)) = ${normTitle}
          AND LOWER(TRIM(
            REGEXP_REPLACE(company, ',?\s*(inc\.?|llc|ltd\.?|corp\.?|co\.?|gmbh|s\.?a\.?)$', '', 'i')
          )) = ${normCompany})
    )
    ORDER BY CASE
      WHEN platform = ${platform} AND url = ${normUrl} THEN 0
      WHEN platform = ${platform} AND title = ${title} AND company = ${company} THEN 1
      ELSE 2
    END, id
    LIMIT 1
  `;
  if (found) return refreshRow(found);

  const job = await prisma.scrapedJob.create({
    data: {
      userId,
      platform,
      title,
      company,
      url: normUrl,
      manualApplyUrl: normManual,
      location: location || null,
      description: description || null,
      salary: salary || null,
    },
  });

  return {
    id: job.id,
    title: job.title,
    company: job.company,
    created: true,
    refreshed: false,
    rescanned: false,
    status: job.status,
    aiScore: job.aiScore,
    aiReason: job.aiReason,
    platform: job.platform,
    applyMethod: job.applyMethod,
  };
}

// ── Analyze-before-store path (feed scanners) ───────────────────────────────
// Feed scanners no longer persist a raw, unanalyzed job list. They look a job
// up first (findExistingJob), run AI analysis on the genuinely new ones, and
// then store ONLY the checked result via createAnalyzedScrapedJob. A feed scan
// never writes a row in PENDING state.

export type ExistingJob = {
  id: number;
  title: string;
  company: string;
  createdAt: Date;
  description: string | null;
  status: string;
};

// Read-only twin of upsertScrapedJob's dedup: same three tiers (same-platform
// URL, same-platform title+company, cross-platform normalized title+company)
// but it returns the existing row instead of mutating anything.
export async function findExistingJob(params: {
  userId: number;
  platform: string;
  url: string;
  title: string;
  company: string;
}): Promise<ExistingJob | null> {
  const normUrl = normalizeUrl(params.url);
  const { userId } = params;

  const byUrl = await prisma.scrapedJob.findFirst({
    where: { userId, platform: params.platform, url: normUrl },
    select: { id: true, title: true, company: true, createdAt: true, description: true, status: true },
  });
  if (byUrl) return byUrl as ExistingJob;

  const byTitle = await prisma.scrapedJob.findFirst({
    where: { userId, platform: params.platform, title: params.title, company: params.company },
    select: { id: true, title: true, company: true, createdAt: true, description: true, status: true },
  });
  if (byTitle) return byTitle as ExistingJob;

  const normTitle = normalizeTitle(params.title);
  const normCompany = normalizeCompany(params.company);
  const crossPlatform = await prisma.$queryRaw<ExistingJob[]>`
    SELECT id, title, company, "createdAt", description, status FROM "ScrapedJob"
    WHERE "userId" = ${userId}
      AND LOWER(TRIM(title)) = ${normTitle}
      AND LOWER(TRIM(
        REGEXP_REPLACE(company, ',?\s*(inc\.?|llc|ltd\.?|corp\.?|co\.?|gmbh|s\.?a\.?)$', '', 'i')
      )) = ${normCompany}
    LIMIT 1
  `;
  return crossPlatform[0] ?? null;
}

// Refresh the data fields of a job already in the database (a duplicate seen
// again on a later scan). Never touches status / AI verdict — re-analysis is
// the rescan path's job. Description is only replaced when the new one is
// longer. Returns true when something actually changed.
export async function refreshScrapedJob(
  row: { id: number; description: string | null },
  params: {
    location?: string | null;
    salary?: string | null;
    description?: string | null;
    manualApplyUrl?: string | null;
  },
): Promise<boolean> {
  const data: Record<string, unknown> = {};
  if (params.location && params.location.trim()) data.location = params.location;
  if (params.salary && params.salary.trim()) data.salary = params.salary;
  if (params.manualApplyUrl && params.manualApplyUrl.trim()) {
    data.manualApplyUrl = normalizeUrl(params.manualApplyUrl.trim());
  }
  if (
    params.description &&
    (!row.description || params.description.length > row.description.length)
  ) {
    data.description = params.description;
  }
  if (Object.keys(data).length === 0) return false;
  await prisma.scrapedJob.update({ where: { id: row.id }, data });
  return true;
}

export type JobVerdict = {
  status: "APPROVED" | "REJECTED";
  aiScore: number;
  aiReason: string;
  techStack: string[];
  eligibility?: string | null;
  model: string;
  tokensUsed: number;
  durationMs: number;
};

// Create a brand-new job row that already carries its AI verdict, plus the
// matching AnalysisLog entry. This is the only create path for feed scans, so
// a scanned job is never stored without first being checked. Returns null when
// a concurrent scan already inserted the same job (unique-constraint race).
export async function createAnalyzedScrapedJob(params: {
  userId: number;
  platform: string;
  title: string;
  company: string;
  url: string;
  location?: string | null;
  description?: string | null;
  salary?: string | null;
  manualApplyUrl?: string | null;
  verdict: JobVerdict;
}): Promise<{ id: number } | null> {
  const { verdict } = params;
  const normUrl = normalizeUrl(params.url);
  const normManual =
    typeof params.manualApplyUrl === "string" && params.manualApplyUrl.trim().length > 0
      ? normalizeUrl(params.manualApplyUrl.trim())
      : null;
  try {
    const job = await prisma.scrapedJob.create({
      data: {
        userId: params.userId,
        platform: params.platform,
        title: params.title,
        company: params.company,
        url: normUrl,
        manualApplyUrl: normManual,
        location: params.location || null,
        description: params.description || null,
        salary: params.salary || null,
        status: verdict.status,
        aiScore: verdict.aiScore,
        aiReason: verdict.aiReason,
        techStack: verdict.techStack.length > 0 ? verdict.techStack.join(", ") : null,
        eligibility: verdict.eligibility ?? null,
      },
    });
    await prisma.analysisLog.create({
      data: {
        scrapedJobId: job.id,
        model: verdict.model,
        approved: verdict.status === "APPROVED",
        score: verdict.aiScore,
        reason: verdict.aiReason,
        tokensUsed: verdict.tokensUsed,
        durationMs: verdict.durationMs,
      },
    });
    return { id: job.id };
  } catch {
    // Unique constraint hit — a concurrent scan inserted the same job first.
    return null;
  }
}

// Apply a fresh verdict to a job that already exists (the rescan path). Clears
// sheetSynced so a job that flips to APPROVED on rescan is re-exported.
export async function applyVerdictToJob(rowId: number, verdict: JobVerdict): Promise<void> {
  await prisma.scrapedJob.update({
    where: { id: rowId },
    data: {
      status: verdict.status,
      aiScore: verdict.aiScore,
      aiReason: verdict.aiReason,
      techStack: verdict.techStack.length > 0 ? verdict.techStack.join(", ") : null,
      eligibility: verdict.eligibility ?? null,
      sheetSynced: false,
    },
  });
  await prisma.analysisLog.create({
    data: {
      scrapedJobId: rowId,
      model: verdict.model,
      approved: verdict.status === "APPROVED",
      score: verdict.aiScore,
      reason: verdict.aiReason,
      tokensUsed: verdict.tokensUsed,
      durationMs: verdict.durationMs,
    },
  });
}
