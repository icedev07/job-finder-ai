import type { Feed, NormalizedJob } from "../types";
import { stripHtml } from "../rss";
import { feedHttpGet, parseJsonOrWarn } from "../http";

// Remotive publishes a fully public, no-auth JSON endpoint of remote jobs.
//   https://remotive.com/api/remote-jobs?category=software-dev&search=react
// The user's "search URL" is either a full https url (we honor its query
// string) or a comma-separated list of "key=value" pairs. Supported server
// filters: category (slug, see /api/remote-jobs/categories), search
// (case-insensitive partial match over title+description), company_name.
const REMOTIVE_BASE = "https://remotive.com/api/remote-jobs";

type RemotiveRaw = {
  id?: number | string;
  url?: string;
  title?: string;
  company_name?: string;
  category?: string;
  tags?: string[];
  job_type?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
  publication_date?: string;
};

type RemotiveResponse = { jobs?: RemotiveRaw[] };

/** A date the board gives, as ISO 8601 (null when it does not parse). */
function iso(value: string | number | null | undefined, unit: "ms" | "s" = "ms"): string | null {
  if (value == null || value === "") return null;
  const t = typeof value === "number" ? value * (unit === "s" ? 1000 : 1) : Date.parse(value);
  return Number.isFinite(t) && t > 0 ? new Date(t).toISOString() : null;
}

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
  // Remotive's `limit` is loose — it frequently ignores the value — so we still
  // cap the result list client-side. Sending it is a polite hint, not a
  // guarantee.
  if (!params.has("limit")) params.set("limit", String(count));
  return `${REMOTIVE_BASE}?${params.toString()}`;
}

export const remotiveFeed: Feed = {
  key: "remotive",
  label: "Remotive",
  fetch: async ({ maxJobs, searchUrl, signal }) => {
    const url = buildUrl(searchUrl, Math.min(100, Math.max(1, maxJobs)));
    const r = await feedHttpGet("Remotive", url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "application/json",
      },
      signal,
      cache: "no-store",
    });
    if (!r.ok) return { jobs: [], warning: r.warning };
    const parsed = parseJsonOrWarn<RemotiveResponse>("Remotive", r.body);
    if (!parsed.ok) return { jobs: [], warning: parsed.warning };
    const list = Array.isArray(parsed.data.jobs) ? parsed.data.jobs : [];

    const jobs: NormalizedJob[] = [];
    for (const entry of list) {
      const title = (entry.title || "").trim();
      const company = (entry.company_name || "").trim();
      const u = (entry.url || "").trim();
      if (!title || !company || !u) continue;

      const description = stripHtml(entry.description || "");
      const tagList = Array.isArray(entry.tags) ? entry.tags.filter(Boolean) : [];
      const descWithTags = tagList.length
        ? `${description}\n\nTags: ${tagList.join(", ")}`.trim()
        : description;
      const salary = (entry.salary || "").trim();

      jobs.push({
        platform: "remotive",
        title,
        company,
        url: u,
        location: entry.candidate_required_location || "Remote",
        description: descWithTags || null,
        salary: salary || null,
        postedAt: iso(entry.publication_date),
        workplace: "remote",
      });
      if (jobs.length >= maxJobs) break;
    }

    return { jobs };
  },
};
