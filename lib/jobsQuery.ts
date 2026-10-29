import type { Prisma } from "../generated/prisma";
import { isJobStage } from "./format";

// Filters shared by the Jobs list, the CSV export and saved views. Every
// parameter is optional and validated; anything unknown is ignored.

export type JobsQuery = {
  q?: string;
  status?: string;
  platforms?: string[];
  stages?: string[];
  applyMethod?: string;
  minScore?: number;
  maxScore?: number;
  feedback?: string;
  eligibility?: string;
  days?: number;
  sort?: string;
  page?: number;
  limit?: number;
};

export const SORTS = ["date_desc", "date_asc", "score_desc", "score_asc", "company_asc", "title_asc"] as const;
export const PAGE_SIZES = [25, 50, 100] as const;

function list(v: string | null): string[] {
  return (v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
}

function int(v: string | null, min: number, max: number): number | undefined {
  if (v == null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : undefined;
}

export function parseJobsQuery(params: URLSearchParams): JobsQuery {
  const limit = int(params.get("limit"), 1, 100) ?? 25;
  return {
    q: params.get("q")?.trim().slice(0, 200) || undefined,
    status: params.get("status") || undefined,
    platforms: list(params.get("platform")),
    stages: list(params.get("stage")),
    applyMethod: params.get("apply") || undefined,
    minScore: int(params.get("minScore"), 0, 100),
    maxScore: int(params.get("maxScore"), 0, 100),
    feedback: params.get("feedback") || undefined,
    eligibility: params.get("eligibility") || undefined,
    days: int(params.get("days"), 1, 3650),
    sort: (SORTS as readonly string[]).includes(params.get("sort") || "") ? params.get("sort")! : "date_desc",
    page: int(params.get("page"), 1, 100_000) ?? 1,
    limit,
  };
}

// userId: one user's jobs, or null for every user's (the "All users" view).
export function jobsWhere(q: JobsQuery, userId: number | null = null): Prisma.ScrapedJobWhereInput {
  const and: Prisma.ScrapedJobWhereInput[] = [];
  if (userId != null) and.push({ userId });
  if (q.q) {
    // "exact phrase" is matched as-is; -word excludes; other words must all match.
    const tokens = q.q.match(/-?"[^"]+"|\S+/g) ?? [];
    for (const raw of tokens) {
      const negative = raw.startsWith("-") && raw.length > 1;
      const term = (negative ? raw.slice(1) : raw).replace(/^"|"$/g, "");
      if (!term) continue;
      const anyField: Prisma.ScrapedJobWhereInput = {
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { company: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { techStack: { contains: term, mode: "insensitive" } },
          { location: { contains: term, mode: "insensitive" } },
        ],
      };
      and.push(negative ? { NOT: anyField } : anyField);
    }
  }
  if (q.status && ["PENDING", "APPROVED", "REJECTED"].includes(q.status)) {
    and.push({ status: q.status as "PENDING" | "APPROVED" | "REJECTED" });
  }
  if (q.platforms?.length) and.push({ platform: { in: q.platforms } });
  if (q.stages?.length) {
    const stages = q.stages.filter(isJobStage);
    const none = q.stages.includes("NONE");
    const or: Prisma.ScrapedJobWhereInput[] = [];
    if (stages.length) or.push({ stage: { in: stages } });
    if (none) or.push({ stage: null });
    if (or.length) and.push({ OR: or });
  }
  if (q.applyMethod === "EASY_APPLY" || q.applyMethod === "EXTERNAL") and.push({ applyMethod: q.applyMethod });
  if (q.applyMethod === "UNKNOWN") and.push({ applyMethod: null });
  if (q.minScore != null || q.maxScore != null) {
    and.push({ aiScore: { ...(q.minScore != null ? { gte: q.minScore } : {}), ...(q.maxScore != null ? { lte: q.maxScore } : {}) } });
  }
  if (q.feedback === "up") and.push({ feedback: 1 });
  if (q.feedback === "down") and.push({ feedback: -1 });
  if (q.feedback === "none") and.push({ feedback: null });
  if (q.eligibility) and.push({ eligibility: q.eligibility });
  if (q.days) and.push({ createdAt: { gte: new Date(Date.now() - q.days * 24 * 60 * 60_000) } });
  return and.length ? { AND: and } : {};
}

export function jobsOrderBy(sort: string | undefined): Prisma.ScrapedJobOrderByWithRelationInput[] {
  switch (sort) {
    case "date_asc":
      return [{ createdAt: "asc" }];
    case "score_desc":
      return [{ aiScore: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
    case "score_asc":
      return [{ aiScore: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
    case "company_asc":
      return [{ company: "asc" }, { createdAt: "desc" }];
    case "title_asc":
      return [{ title: "asc" }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

// Columns returned by the list (the description is fetched per job).
export const JOB_LIST_SELECT = {
  id: true,
  userId: true,
  platform: true,
  title: true,
  company: true,
  location: true,
  url: true,
  manualApplyUrl: true,
  applyMethod: true,
  salary: true,
  techStack: true,
  status: true,
  aiScore: true,
  aiReason: true,
  stage: true,
  appliedAt: true,
  followUpAt: true,
  feedback: true,
  eligibility: true,
  createdAt: true,
} satisfies Prisma.ScrapedJobSelect;

export type JobListRow = Prisma.ScrapedJobGetPayload<{ select: typeof JOB_LIST_SELECT }>;
