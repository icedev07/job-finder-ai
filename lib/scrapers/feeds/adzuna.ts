import type { Feed, NormalizedJob } from "../types";
import { feedHttpGet, parseJsonOrWarn } from "../http";
import { stripHtml } from "../rss";
import { countryName } from "../../searchProfile";

// Adzuna's official search API: job boards and employers' sites in ten
// European countries (the UK, Germany, France, the Netherlands, Belgium,
// Austria, Switzerland, Italy, Spain and Poland), searched by every word of a
// role, a country and how recent. It needs a free key (developer.adzuna.com);
// its terms allow it for personal job search, a business needs a licence, and
// listings credit Adzuna. The description is a snippet of about 500
// characters, so the AI judges from less text than on other boards.

const COUNTRIES = ["GB", "DE", "FR", "NL", "BE", "AT", "CH", "IT", "ES", "PL"] as const;

type AdzunaJob = {
  id?: string;
  title?: string;
  description?: string;
  created?: string;
  redirect_url?: string;
  location?: { display_name?: string } | null;
  company?: { display_name?: string } | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_is_predicted?: string | number | null;
};

type AdzunaSearch = { count?: number; results?: AdzunaJob[] };

function salary(j: AdzunaJob, country: string): string | null {
  // Adzuna's own estimates are left out: only salaries the posting states.
  if (String(j.salary_is_predicted) === "1" || (!j.salary_min && !j.salary_max)) return null;
  const cur = country === "GB" ? "£" : country === "CH" ? "CHF " : country === "PL" ? "PLN " : "€";
  const fmt = (n: number) => `${cur}${Math.round(n).toLocaleString("en-US")}`;
  if (j.salary_min && j.salary_max && j.salary_min !== j.salary_max) return `${fmt(j.salary_min)} – ${fmt(j.salary_max)}`;
  return fmt((j.salary_min || j.salary_max)!);
}

export const adzunaFeed: Feed = {
  key: "adzuna",
  label: "Adzuna",
  countries: COUNTRIES,
  fetch: async () => ({ jobs: [], warning: "Adzuna searches the roles and countries under Settings → What to look for" }),
  search: async (query, { maxJobs, signal, config }) => {
    const appId = (config?.adzuna_app_id ?? "").trim();
    const appKey = (config?.adzuna_app_key ?? "").trim();
    if (!appId || !appKey) return { jobs: [], warning: "Adzuna needs its free app ID and key (Sources → Adzuna)" };
    if (!query.country) return { jobs: [] };
    const country = query.country.toUpperCase();
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      what_and: query.keywords,
      sort_by: "date",
      results_per_page: String(Math.min(50, Math.max(1, maxJobs))),
      "content-type": "application/json",
    });
    if (query.maxAgeDays > 0) params.set("max_days_old", String(query.maxAgeDays));
    const url = `https://api.adzuna.com/v1/api/jobs/${country.toLowerCase()}/search/1?${params}`;
    const r = await feedHttpGet("Adzuna", url, { headers: { accept: "application/json" }, signal });
    if (!r.ok) {
      return { jobs: [], warning: /\b(400|401|403)\b/.test(r.warning) ? "Adzuna refused the app ID or key: check them (Sources → Adzuna)" : r.warning };
    }
    const parsed = parseJsonOrWarn<AdzunaSearch>("Adzuna", r.body);
    if (!parsed.ok) return { jobs: [], warning: parsed.warning };
    const jobs: NormalizedJob[] = [];
    for (const j of parsed.data.results ?? []) {
      if (!j.id || !j.title || !j.redirect_url) continue;
      jobs.push({
        platform: "adzuna",
        title: stripHtml(j.title).replace(/\s+/g, " ").trim(),
        company: j.company?.display_name?.trim() || "Employer not named",
        // Adzuna's terms: link through its own address.
        url: j.redirect_url,
        location: j.location?.display_name ? `${j.location.display_name}, ${countryName(country)}` : countryName(country),
        description: j.description ? stripHtml(j.description) : null,
        salary: salary(j, country),
        postedAt: j.created ?? null,
        country,
      });
    }
    return { jobs };
  },
};
