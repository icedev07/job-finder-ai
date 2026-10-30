import type { Feed, NormalizedJob } from "../types";
import { stripHtml } from "../rss";
import { feedHttpGet, parseJsonOrWarn } from "../http";

// Jobicy publishes a documented JSON v2 endpoint of remote jobs. Filters can be
// passed via query string; we support the common ones (count, geo, industry,
// tag). The user's "search URL" is either a full https URL (we honor its query
// string) or a comma-separated list of "key=value" pairs.
//
// The board asks API consumers to fetch only a few times per day and warns that
// excessive requests get throttled, so the feed must DEGRADE GRACEFULLY on a
// 429 / block rather than throw and abort a "Scrape all sources" run.
const JOBICY_BASE = "https://jobicy.com/api/v2/remote-jobs";

type JobicyRaw = {
  id?: string | number;
  url?: string;
  jobTitle?: string;
  companyName?: string;
  companyLogo?: string;
  jobIndustry?: string | string[];
  jobType?: string | string[];
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  annualSalaryMin?: string | number;
  annualSalaryMax?: string | number;
  salaryCurrency?: string;
};

type JobicyResponse = { jobs?: JobicyRaw[] };

/** A date the board gives, as ISO 8601 (null when it does not parse). */
function iso(value: string | number | null | undefined, unit: "ms" | "s" = "ms"): string | null {
  if (value == null || value === "") return null;
  const t = typeof value === "number" ? value * (unit === "s" ? 1000 : 1) : Date.parse(value);
  return Number.isFinite(t) && t > 0 ? new Date(t).toISOString() : null;
}

function buildUrl(searchUrl: string | undefined, count: number): string {
  if (searchUrl && /^https?:/i.test(searchUrl.trim())) {
    try {
      const u = new URL(searchUrl.trim());
      if (!u.searchParams.has("count")) u.searchParams.set("count", String(count));
      return u.toString();
    } catch {
      // A malformed paste (e.g. "https://", "http://[bad") must not throw past
      // the graceful-degradation boundary — fall back to the base endpoint.
      return `${JOBICY_BASE}?count=${count}`;
    }
  }
  const params = new URLSearchParams();
  if (searchUrl) {
    for (const pair of searchUrl.split(",").map((s) => s.trim()).filter(Boolean)) {
      const [k, v] = pair.split("=").map((s) => s?.trim());
      if (k && v) params.set(k, v);
    }
  }
  if (!params.has("count")) params.set("count", String(count));
  // Remote jobs open to European candidates, unless the search names another geo.
  if (!params.has("geo") && !params.has("jobGeo")) params.set("geo", "europe");
  return `${JOBICY_BASE}?${params.toString()}`;
}

function formatSalary(min?: string | number, max?: string | number, currency?: string): string | null {
  const minN = Number(min);
  const maxN = Number(max);
  const cur = (currency || "").trim();
  if (!minN && !maxN) return null;
  if (minN && maxN && minN !== maxN) {
    return `${cur ? cur + " " : ""}${minN.toLocaleString()} – ${maxN.toLocaleString()}`;
  }
  const single = minN || maxN;
  if (!single) return null;
  return `${cur ? cur + " " : ""}${single.toLocaleString()}`;
}

/** Publish time in ms, 0 when missing / unparseable (defensive newest-first). */
function pubTime(e: JobicyRaw): number {
  const t = e.pubDate ? Date.parse(e.pubDate) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

export const jobicyFeed: Feed = {
  key: "jobicy",
  label: "Jobicy",
  fetch: async ({ maxJobs, searchUrl, signal }) => {
    const url = buildUrl(searchUrl, Math.min(50, Math.max(1, maxJobs)));
    const r = await feedHttpGet("Jobicy", url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "application/json",
      },
      signal,
      cache: "no-store",
    });
    if (!r.ok) return { jobs: [], warning: r.warning };
    const parsed = parseJsonOrWarn<JobicyResponse>("Jobicy", r.body);
    if (!parsed.ok) return { jobs: [], warning: parsed.warning };
    const list = Array.isArray(parsed.data.jobs) ? parsed.data.jobs : [];

    // Newest-first by publish date. The API is roughly chronological but does
    // not guarantee ordering, so sort before we slice to maxJobs.
    const sorted = [...list].sort((a, b) => pubTime(b) - pubTime(a));

    const jobs: NormalizedJob[] = [];
    for (const entry of sorted) {
      const title = (entry.jobTitle || "").trim();
      const company = (entry.companyName || "").trim();
      const u = (entry.url || "").trim();
      if (!title || !company || !u) continue;
      const description = stripHtml(entry.jobDescription || entry.jobExcerpt || "");
      jobs.push({
        platform: "jobicy",
        title,
        company,
        url: u,
        location: entry.jobGeo || "Remote",
        description: description || null,
        salary: formatSalary(entry.annualSalaryMin, entry.annualSalaryMax, entry.salaryCurrency),
        postedAt: iso(entry.pubDate),
        workplace: "remote",
      });
      if (jobs.length >= maxJobs) break;
    }

    return { jobs };
  },
};
