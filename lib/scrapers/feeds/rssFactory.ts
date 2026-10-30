import type { Feed, NormalizedJob } from "../types";
import { parseRss, stripHtml } from "../rss";

// Many small remote-job boards expose nothing but an RSS feed. They all
// share the same shape: title is "Company: Title" or just the title with
// the company in <author> / <dc:creator>. This factory turns a default URL
// into a Feed; user can override the URL via the search-url config field.

export type RssFeedOptions = {
  key: string;
  label: string;
  defaultUrl: string;
  /**
   * Some feeds embed company in the title before a colon ("Acme Inc: Senior Engineer").
   * Default true since it covers most known boards. Disable for feeds that put the
   * company elsewhere.
   */
  splitCompanyFromTitle?: boolean;
  /** Heuristic fallback when splitCompanyFromTitle does not yield a company. */
  fallbackCompanyFromHost?: boolean;
};

function splitTitle(raw: string): { company: string; title: string } {
  const idx = raw.indexOf(":");
  if (idx === -1) return { company: "", title: raw.trim() };
  return {
    company: raw.slice(0, idx).trim(),
    title: raw.slice(idx + 1).trim() || raw.trim(),
  };
}

function hostFromUrl(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function rssFeed(opts: RssFeedOptions): Feed {
  const splitCompany = opts.splitCompanyFromTitle ?? true;
  const fallbackHost = opts.fallbackCompanyFromHost ?? false;
  return {
    key: opts.key,
    label: opts.label,
    fetch: async ({ maxJobs, searchUrl, signal }) => {
      const url = (searchUrl && searchUrl.trim()) || opts.defaultUrl;
      const res = await fetch(url, {
        headers: {
          // WordPress + Cloudflare-fronted feeds (Jobspresso, Authentic Jobs,
          // Remotees) frequently 403 a bare "Bot/1.0" UA. A standard browser
          // UA passes their default rule sets without triggering challenges.
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        },
        signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`${opts.label} responded ${res.status}`);
      const xml = await res.text();
      const items = parseRss(xml);

      const jobs: NormalizedJob[] = [];
      for (const it of items) {
        let title = it.title;
        let company = "";
        if (splitCompany) {
          const split = splitTitle(it.title);
          if (split.company) {
            company = split.company;
            title = split.title;
          }
        }
        if (!company && fallbackHost) {
          const host = hostFromUrl(it.link);
          if (host) company = host;
        }
        if (!company) company = "Unknown";

        jobs.push({
          platform: opts.key,
          title,
          company,
          url: it.link,
          location: "Remote",
          description: stripHtml(it.contentEncoded || it.description || "") || null,
          salary: null,
          postedAt: it.pubDate && Number.isFinite(Date.parse(it.pubDate)) ? new Date(Date.parse(it.pubDate)).toISOString() : null,
          workplace: "remote",
        });
        if (jobs.length >= maxJobs) break;
      }

      return { jobs };
    },
  };
}
