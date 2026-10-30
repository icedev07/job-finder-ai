import type { Feed, NormalizedJob } from "../types";
import { feedHttpGet, parseJsonOrWarn } from "../http";

// Sweden's public employment service (Arbetsförmedlingen) through JobTech's
// official JobSearch API: every job in Platsbanken, open data (CC0) with no
// key, the full text in the search results. Mostly in Swedish; about a
// quarter of the IT jobs are in English.

const SEARCH_URL = "https://jobsearch.api.jobtechdev.se/search";

// JobTech's workplace-model concept ids.
const WORKPLACE: Record<string, NormalizedJob["workplace"]> = {
  L4T8_Z9y_DkN: "remote",
  Vbpe_rGe_vCW: "hybrid",
  ZxwM_gtz_n61: "onsite",
};

type JobTechHit = {
  id?: string;
  headline?: string;
  publication_date?: string;
  webpage_url?: string;
  description?: { text?: string | null } | null;
  employer?: { name?: string | null } | null;
  workplace_address?: { municipality?: string | null; city?: string | null; region?: string | null } | null;
  workplace_model?: { concept_id?: string | null } | null;
  application_details?: { url?: string | null } | null;
  salary_description?: string | null;
};

type JobTechSearch = { total?: { value?: number }; hits?: JobTechHit[] };

export const jobtechFeed: Feed = {
  key: "jobtech",
  label: "Arbetsförmedlingen (Sweden)",
  countries: ["SE"],
  fetch: async () => ({ jobs: [], warning: "Arbetsförmedlingen searches the roles under Settings → What to look for (with Sweden chosen)" }),
  search: async (query, { maxJobs, signal }) => {
    const params = new URLSearchParams({ q: query.keywords, sort: "pubdate-desc", limit: String(Math.min(100, Math.max(1, maxJobs))) });
    // In minutes.
    if (query.maxAgeDays > 0) params.set("published-after", String(query.maxAgeDays * 24 * 60));
    // Every word of the role, not any of them.
    const r = await feedHttpGet("Arbetsförmedlingen", `${SEARCH_URL}?${params}`, {
      headers: { accept: "application/json", "x-feature-freetext-bool-method": "and" },
      signal,
    });
    if (!r.ok) return { jobs: [], warning: r.warning };
    const parsed = parseJsonOrWarn<JobTechSearch>("Arbetsförmedlingen", r.body);
    if (!parsed.ok) return { jobs: [], warning: parsed.warning };
    const jobs: NormalizedJob[] = [];
    for (const h of parsed.data.hits ?? []) {
      if (!h.id || !h.headline) continue;
      const a = h.workplace_address;
      const raw = a?.city || a?.municipality;
      // Some ads write the city in capitals ("GÖTEBORG").
      const place = raw && raw === raw.toUpperCase() ? raw.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase()) : raw;
      jobs.push({
        platform: "jobtech",
        title: h.headline.replace(/\s+/g, " ").trim(),
        company: h.employer?.name?.trim() || "Employer not named",
        url: h.webpage_url || `https://arbetsformedlingen.se/platsbanken/annonser/${h.id}`,
        applyUrl: h.application_details?.url || null,
        location: place ? `${place}, Sweden` : "Sweden",
        description: h.description?.text?.trim() || null,
        salary: h.salary_description?.trim() || null,
        postedAt: h.publication_date ? `${h.publication_date}${/Z|[+-]\d\d:?\d\d$/.test(h.publication_date) ? "" : "Z"}` : null,
        country: "SE",
        workplace: WORKPLACE[h.workplace_model?.concept_id ?? ""] ?? null,
      });
    }
    return { jobs };
  },
};
