import type { Feed, NormalizedJob } from "../types";
import { stripHtml } from "../rss";
import { feedHttpGet, parseJsonOrWarn } from "../http";

// Arbeitnow is a Germany/DACH-leaning job board with a public, no-auth JSON API
// — a strong fit for the Armenia → Europe target. It is paginated (?page=N,
// 1-indexed, 100 jobs/page) and rate-limited to 5 requests/minute, so we pull
// at most a few pages per scan and pace each request. There is no reliable
// server-side filter (the `remote` flag is best-effort), so the user's
// "search URL" is an optional comma-separated keyword filter matched
// case-insensitively against each job's title + tags (OR semantics). Blank
// keeps everything and lets the AI analyzer judge suitability.
const ARBEITNOW_URL = "https://www.arbeitnow.com/api/job-board-api";
const PAGE_SIZE = 100;
// 5 req/min rate limit — keep page count low and space requests out.
const MAX_PAGES = 3;
const INTER_PAGE_DELAY_MS = 900;

type ArbeitnowRaw = {
  slug?: string;
  title?: string;
  company_name?: string;
  url?: string;
  location?: string;
  description?: string;
  remote?: boolean;
  tags?: string[];
  job_types?: string[];
  /** Unix seconds. */
  created_at?: number;
};

/** A date the board gives, as ISO 8601 (null when it does not parse). */
function iso(value: string | number | null | undefined, unit: "ms" | "s" = "ms"): string | null {
  if (value == null || value === "") return null;
  const t = typeof value === "number" ? value * (unit === "s" ? 1000 : 1) : Date.parse(value);
  return Number.isFinite(t) && t > 0 ? new Date(t).toISOString() : null;
}


type ArbeitnowResponse = {
  data?: ArbeitnowRaw[];
  links?: { next?: string | null };
};

function parseKeywordFilter(searchUrl: string | undefined): string[] {
  return (searchUrl ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function matchesKeyword(entry: ArbeitnowRaw, filter: string[]): boolean {
  if (!filter.length) return true;
  const hay = [entry.title || "", ...(entry.tags ?? [])].join(" ").toLowerCase();
  return filter.some((f) => hay.includes(f));
}

function locationOf(entry: ArbeitnowRaw): string {
  const loc = (entry.location || "").trim();
  if (entry.remote) return loc ? `${loc} · Remote` : "Remote";
  return loc || "Germany";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const arbeitnowFeed: Feed = {
  key: "arbeitnow",
  label: "Arbeitnow (EU)",
  fetch: async ({ maxJobs, searchUrl, signal }) => {
    const keywordFilter = parseKeywordFilter(searchUrl);
    const jobs: NormalizedJob[] = [];
    let nextUrl: string | null = `${ARBEITNOW_URL}?page=1`;
    let warning: string | undefined;

    for (let page = 0; page < MAX_PAGES && jobs.length < maxJobs && nextUrl; page++) {
      if (signal?.aborted) break;
      if (page > 0) await sleep(INTER_PAGE_DELAY_MS);

      const r = await feedHttpGet("Arbeitnow", nextUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          "Accept": "application/json",
        },
        signal,
        cache: "no-store",
      });
      if (!r.ok) {
        // First page blocked → surface the reason; a later page (often the
        // 5 req/min cap) just stops with whatever we already gathered.
        if (page === 0) warning = r.warning;
        break;
      }
      const parsed = parseJsonOrWarn<ArbeitnowResponse>("Arbeitnow", r.body);
      if (!parsed.ok) {
        if (page === 0) warning = parsed.warning;
        break;
      }
      const list = Array.isArray(parsed.data.data) ? parsed.data.data : [];
      nextUrl = parsed.data.links?.next || null;
      if (list.length === 0) break;

      for (const entry of list) {
        const title = (entry.title || "").trim();
        const company = (entry.company_name || "").trim();
        const u = (entry.url || "").trim();
        if (!title || !company || !u) continue;
        if (!matchesKeyword(entry, keywordFilter)) continue;

        const description = stripHtml(entry.description || "");
        const tagList = Array.isArray(entry.tags) ? entry.tags.filter(Boolean) : [];
        const descWithTags = tagList.length
          ? `${description}\n\nTags: ${tagList.join(", ")}`.trim()
          : description;

        jobs.push({
          platform: "arbeitnow",
          title,
          company,
          url: u,
          location: locationOf(entry),
          description: descWithTags || null,
          salary: null,
          postedAt: iso(entry.created_at, "s"),
          workplace: entry.remote ? "remote" : null,
        });
        if (jobs.length >= maxJobs) break;
      }
      // PAGE_SIZE is informational; pagination is driven by links.next.
      void PAGE_SIZE;
    }

    return { jobs, warning };
  },
};
