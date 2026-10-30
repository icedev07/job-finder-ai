import type { Feed, NormalizedJob } from "../types";
import { stripHtml } from "../rss";

// Lever postings api: https://api.lever.co/v0/postings/{slug}?mode=json
// Public, no auth. The user supplies a comma-separated list of slugs.
type LeverPosting = {
  id?: string;
  text?: string;
  hostedUrl?: string;
  applyUrl?: string;
  categories?: { team?: string; location?: string; commitment?: string };
  description?: string;
  descriptionPlain?: string;
  lists?: Array<{ text?: string; content?: string }>;
};

// Lever's public api is sparse — many companies migrated away. These slugs
// returned >0 postings on direct probe at the time of writing.
export const LEVER_DEFAULT_SLUGS = [
  "palantir",
  "spotify",
  "rover",
  "highspot",
  "cherre",
];

function parseSlugs(searchUrl: string | undefined): string[] {
  if (!searchUrl || !searchUrl.trim()) return LEVER_DEFAULT_SLUGS;
  return searchUrl
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/(?:api\.)?lever\.co\/(?:v\d+\/postings\/)?([^/?#]+)/i);
      return m ? m[1] : s;
    });
}

function buildDescription(posting: LeverPosting): string {
  const parts: string[] = [];
  if (posting.descriptionPlain) {
    parts.push(posting.descriptionPlain);
  } else if (posting.description) {
    parts.push(stripHtml(posting.description));
  }
  if (Array.isArray(posting.lists)) {
    for (const block of posting.lists) {
      if (block.text) parts.push(`\n${block.text}`);
      if (block.content) parts.push(stripHtml(block.content));
    }
  }
  return parts.join("\n").trim();
}

export const leverFeed: Feed = {
  key: "lever",
  label: "Lever (multi-company)",
  fetch: async ({ maxJobs, searchUrl, signal }) => {
    const slugs = parseSlugs(searchUrl);
    const jobs: NormalizedJob[] = [];
    const warnings: string[] = [];
    const perCompany = Math.max(5, Math.ceil(maxJobs / Math.max(1, slugs.length)));
    for (const slug of slugs) {
      if (jobs.length >= maxJobs) break;
      const headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        "Accept": "application/json",
      };
      const path = `/v0/postings/${encodeURIComponent(slug)}?mode=json`;
      try {
        let res = await fetch(`https://api.lever.co${path}`, { headers, signal, cache: "no-store" });
        // Boards hosted in the EU (e.g. TomTom) are only on Lever's EU host.
        if (res.status === 404) res = await fetch(`https://api.eu.lever.co${path}`, { headers, signal, cache: "no-store" });
        if (!res.ok) {
          warnings.push(`${slug}: ${res.status}`);
          continue;
        }
        const list = (await res.json()) as LeverPosting[];
        if (!Array.isArray(list)) continue;
        let takenFromThisCompany = 0;
        for (const posting of list) {
          if (takenFromThisCompany >= perCompany) break;
          const title = (posting.text || "").trim();
          const u = (posting.hostedUrl || posting.applyUrl || "").trim();
          if (!title || !u) continue;
          jobs.push({
            platform: "lever",
            title,
            company: slug,
            url: u,
            applyUrl: posting.applyUrl || null,
            location: posting.categories?.location || null,
            description: buildDescription(posting) || null,
            salary: null,
          });
          takenFromThisCompany++;
          if (jobs.length >= maxJobs) break;
        }
      } catch (err) {
        warnings.push(`${slug}: ${(err as Error).message}`);
      }
    }
    return {
      jobs,
      warning: warnings.length ? warnings.join("; ") : undefined,
    };
  },
};
