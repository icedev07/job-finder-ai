import type { Feed, NormalizedJob } from "../types";
import { parseRss, stripHtml } from "../rss";
import { feedHttpGet } from "../http";

// Real Work From Anywhere lists only TRUE work-from-anywhere remote roles (no
// region locks) — an ideal fit for an Armenia-based applicant. It publishes a
// public RSS feed, plus per-category feeds. Titles are "Role at Company" and
// the company is also carried in <author>, so we can't reuse the generic
// "Company: Title" rssFactory. The user's "search URL" picks the feed: a full
// https url, or a path/slug like "remote-software-developer-jobs" (mapped to
// /<slug>/rss.xml). Blank uses the all-jobs feed.
const RWFA_BASE = "https://www.realworkfromanywhere.com";
const DEFAULT_FEED = `${RWFA_BASE}/rss.xml`;

function resolveFeedUrl(searchUrl: string | undefined): string {
  const raw = (searchUrl || "").trim();
  if (!raw) return DEFAULT_FEED;
  if (/^https?:/i.test(raw)) return raw;
  const slug = raw.replace(/^\/+|\/+$/g, "");
  if (!slug) return DEFAULT_FEED;
  // Already a full "…/rss.xml" path fragment?
  if (/rss\.xml$/i.test(slug)) return `${RWFA_BASE}/${slug}`;
  return `${RWFA_BASE}/${slug}/rss.xml`;
}

// "Senior Product Engineer, Scalability at Railway" → company "Railway",
// title "Senior Product Engineer, Scalability". Split on the LAST " at " so a
// role like "Engineer at Scale at Acme" still attributes the right company.
function splitRoleAtCompany(raw: string): { company: string; title: string } {
  const matches = [...raw.matchAll(/\s+at\s+/gi)];
  if (matches.length === 0) return { company: "", title: raw.trim() };
  const last = matches[matches.length - 1];
  const idx = last.index ?? -1;
  if (idx < 0) return { company: "", title: raw.trim() };
  return {
    company: raw.slice(idx + last[0].length).trim(),
    title: raw.slice(0, idx).trim() || raw.trim(),
  };
}

export const realWorkFromAnywhereFeed: Feed = {
  key: "realworkfromanywhere",
  label: "Real Work From Anywhere",
  fetch: async ({ maxJobs, searchUrl, signal }) => {
    const url = resolveFeedUrl(searchUrl);
    const r = await feedHttpGet("Real Work From Anywhere", url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      signal,
      cache: "no-store",
    });
    if (!r.ok) return { jobs: [], warning: r.warning };
    const items = parseRss(r.body);

    const jobs: NormalizedJob[] = [];
    for (const it of items) {
      const { company: fromTitle, title } = splitRoleAtCompany(it.title);
      const company = (it.author && it.author.trim()) || fromTitle || "Unknown";
      if (!title || !it.link) continue;
      const description = stripHtml(it.contentEncoded || it.description || "");
      jobs.push({
        platform: "realworkfromanywhere",
        title,
        company,
        url: it.link,
        // Every listing here is by definition work-from-anywhere.
        location: it.categories?.[0] ? `Worldwide · ${it.categories[0]}` : "Worldwide / Remote",
        description: description || null,
        salary: null,
        postedAt: it.pubDate && Number.isFinite(Date.parse(it.pubDate)) ? new Date(Date.parse(it.pubDate)).toISOString() : null,
        workplace: "remote",
      });
      if (jobs.length >= maxJobs) break;
    }

    return { jobs };
  },
};
