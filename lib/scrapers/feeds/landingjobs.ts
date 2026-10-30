import type { Feed, NormalizedJob } from "../types";
import { stripHtml } from "../rss";

// Landing.Jobs public api. Skews EU/dev-heavy, which fits the Armenia → Europe
// target. We default to remote-friendly listings when no filter is supplied.
const LANDING_JOBS_BASE = "https://landing.jobs/api/v1/jobs";

type LandingJobsRaw = {
  id?: number | string;
  title?: string;
  short_description?: string;
  description?: string;
  // Landing.Jobs uses these field names in their public api: role_description,
  // main_requirements, perks. There is no company_name field — company is in
  // the url path (https://landing.jobs/at/{company-slug}/...).
  role_description?: string;
  main_requirements?: string;
  perks?: string;
  url?: string;
  company_name?: string;
  city_name?: string;
  country_name?: string;
  location?: string;
  locations?: Array<{ city?: string; country_code?: string }>;
  remote?: boolean;
  is_remote?: boolean;
  published_at?: string;
  created_at?: string;
  salary?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  gross_salary_low?: number;
  gross_salary_high?: number;
  currency_code?: string;
  tags?: string[];
};

type LandingJobsResponse = { jobs?: LandingJobsRaw[] } | LandingJobsRaw[];

function buildUrl(searchUrl: string | undefined, count: number): string {
  if (searchUrl && /^https?:/i.test(searchUrl.trim())) {
    const u = new URL(searchUrl.trim());
    if (!u.searchParams.has("limit")) u.searchParams.set("limit", String(count));
    return u.toString();
  }
  const params = new URLSearchParams();
  if (searchUrl) {
    for (const pair of searchUrl.split(",").map((s) => s.trim()).filter(Boolean)) {
      const [k, v] = pair.split("=").map((s) => s?.trim());
      if (k && v) params.set(k, v);
    }
  }
  if (!params.has("limit")) params.set("limit", String(count));
  return `${LANDING_JOBS_BASE}?${params.toString()}`;
}

function formatSalary(j: LandingJobsRaw): string | null {
  if (j.salary && typeof j.salary === "string") return j.salary;
  const cur = j.salary_currency || j.currency_code || "";
  const lo = j.salary_min ?? j.gross_salary_low;
  const hi = j.salary_max ?? j.gross_salary_high;
  if (lo && hi && lo !== hi) {
    return `${cur ? cur + " " : ""}${lo.toLocaleString()} – ${hi.toLocaleString()}`;
  }
  const single = lo || hi;
  if (single) return `${cur ? cur + " " : ""}${single.toLocaleString()}`;
  return null;
}

function locationOf(j: LandingJobsRaw): string | null {
  if (j.is_remote || j.remote) return "Remote";
  if (j.location) return j.location;
  if (Array.isArray(j.locations) && j.locations.length > 0) {
    const parts = j.locations
      .map((l) => [l.city, l.country_code].filter(Boolean).join(", "))
      .filter(Boolean);
    if (parts.length) return parts.join(" / ");
  }
  const parts = [j.city_name, j.country_name].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function companyFromUrl(url: string): string {
  // Landing.Jobs URLs look like https://landing.jobs/at/{company-slug}/{role-title}
  // Convert "cliftonlarsonallen" → "Cliftonlarsonallen", or "smart-mind" → "Smart Mind".
  const m = url.match(/\/at\/([^/?#]+)/i);
  if (!m) return "";
  return m[1]
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function buildDescription(j: LandingJobsRaw): string {
  const parts: string[] = [];
  if (j.role_description) parts.push(stripHtml(j.role_description));
  if (j.main_requirements) parts.push("Requirements:\n" + stripHtml(j.main_requirements));
  if (j.perks) parts.push("Perks:\n" + stripHtml(j.perks));
  if (j.description) parts.push(stripHtml(j.description));
  if (j.short_description) parts.push(stripHtml(j.short_description));
  return parts.filter(Boolean).join("\n\n").trim();
}

/** A date the board gives, as ISO 8601 (null when it does not parse). */
function iso(value: string | number | null | undefined, unit: "ms" | "s" = "ms"): string | null {
  if (value == null || value === "") return null;
  const t = typeof value === "number" ? value * (unit === "s" ? 1000 : 1) : Date.parse(value);
  return Number.isFinite(t) && t > 0 ? new Date(t).toISOString() : null;
}

export const landingJobsFeed: Feed = {
  key: "landingjobs",
  label: "Landing.Jobs",
  fetch: async ({ maxJobs, searchUrl, signal }) => {
    const url = buildUrl(searchUrl, Math.min(200, Math.max(1, maxJobs)));
    const res = await fetch(url, {
      headers: { "User-Agent": "JobFinderBot/1.0", "Accept": "application/json" },
      signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Landing.Jobs responded ${res.status}`);
    const data = (await res.json()) as LandingJobsResponse;
    const list: LandingJobsRaw[] = Array.isArray(data) ? data : Array.isArray(data.jobs) ? data.jobs : [];

    const jobs: NormalizedJob[] = [];
    for (const entry of list) {
      const title = (entry.title || "").trim();
      const u = (entry.url || "").trim();
      if (!title || !u) continue;
      const company = (entry.company_name || "").trim() || companyFromUrl(u);
      if (!company) continue;
      const description = buildDescription(entry);
      const tagSuffix = Array.isArray(entry.tags) && entry.tags.length
        ? `\n\nTags: ${entry.tags.join(", ")}`
        : "";
      jobs.push({
        platform: "landingjobs",
        title,
        company,
        url: u,
        location: locationOf(entry),
        description: (description + tagSuffix).trim() || null,
        salary: formatSalary(entry),
        postedAt: iso(entry.published_at ?? entry.created_at),
        workplace: entry.is_remote || entry.remote ? "remote" : null,
        country: entry.is_remote || entry.remote ? null : entry.locations?.[0]?.country_code?.toUpperCase() ?? null,
      });
      if (jobs.length >= maxJobs) break;
    }

    return { jobs };
  },
};
