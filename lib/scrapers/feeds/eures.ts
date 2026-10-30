import type { Feed, NormalizedJob } from "../types";
import { feedHttpGet, parseJsonOrWarn } from "../http";
import { stripHtml } from "../rss";
import { EUROPE_COUNTRIES, countryName, searchWords } from "../../searchProfile";

// EURES, the EU's job mobility portal: the vacancies of every public employment
// service in the EU, the EEA and Switzerland (about 2 million in 31 countries;
// not the UK), with their full text, searched by the words of a title, a
// country and how recent. It is the portal's own search, not a published API,
// so a change there comes back as a warning. Re-use is allowed with the
// European Labour Authority credited as the source.
//
// The details call, made only for jobs about to be judged, adds the city, the
// salary and the employer's application link.

const SEARCH_URL = "https://europa.eu/eures/api/jv-searchengine/public/jv-search/search";
const detailUrl = (id: string) => `https://europa.eu/eures/api/jv-searchengine/public/jv/id/${encodeURIComponent(id)}?requestLang=en`;
const pageUrl = (id: string) => `https://europa.eu/eures/portal/jv-se/jv-details/${encodeURIComponent(id)}?lang=en`;

// EURES writes Greece as EL.
const EURES_CODE: Record<string, string> = { GR: "el" };

/** The countries EURES covers: every European one but the UK. */
export const EURES_COUNTRIES = EUROPE_COUNTRIES.map((c) => c.code).filter((c) => c !== "GB");

const HEADERS = { "content-type": "application/json", accept: "application/json" };

function period(days: number): string | null {
  if (days <= 0) return null;
  if (days <= 1) return "LAST_DAY";
  if (days <= 3) return "LAST_THREE_DAYS";
  if (days <= 7) return "LAST_WEEK";
  return "LAST_MONTH";
}

type EuresJv = {
  id?: string;
  title?: string;
  description?: string;
  creationDate?: number;
  employer?: { name?: string | null } | null;
};

type EuresSearch = { numberRecords?: number; jvs?: EuresJv[] };

type EuresDetail = {
  jvProfiles?: Record<
    string,
    {
      locations?: { cityName?: string | null; countryCode?: string | null }[];
      applicationInstructions?: string[];
      offeredRemunerationPackage?: {
        salaries?: { minimumSalary?: number | null; maximumSalary?: number | null; currencyCode?: string | null; payingIntervalCode?: string | null }[];
      } | null;
    }
  >;
};

const INTERVAL: Record<string, string> = { year: "a year", month: "a month", week: "a week", day: "a day", hour: "an hour" };

function salaryText(s: { minimumSalary?: number | null; maximumSalary?: number | null; currencyCode?: string | null; payingIntervalCode?: string | null } | undefined): string | null {
  if (!s || (!s.minimumSalary && !s.maximumSalary)) return null;
  const cur = s.currencyCode ?? "";
  const fmt = (n: number) => `${cur ? `${cur} ` : ""}${n.toLocaleString("en-US")}`;
  const range = s.minimumSalary && s.maximumSalary && s.minimumSalary !== s.maximumSalary
    ? `${fmt(s.minimumSalary)} – ${fmt(s.maximumSalary)}`
    : fmt((s.minimumSalary || s.maximumSalary)!);
  const per = s.payingIntervalCode ? INTERVAL[s.payingIntervalCode] : undefined;
  return per ? `${range} ${per}` : range;
}

// The employer's own application link in the application instructions, when there is one.
function applyLink(instructions: string[] | undefined): string | null {
  for (const text of instructions ?? []) {
    const m = text.replace(/&amp;/g, "&").match(/https?:\/\/[^\s"'<>]+/);
    if (m) return m[0].replace(/[.,;)]+$/, "");
  }
  return null;
}

// Jobs this server has already looked up (the same job can be judged for several users).
const described = new WeakSet<NormalizedJob>();

export const euresFeed: Feed = {
  key: "eures",
  label: "EURES (EU job mobility portal)",
  countries: EURES_COUNTRIES,
  // Without a search there is nothing to ask for: every job comes from a search.
  fetch: async () => ({ jobs: [], warning: "EURES searches the roles and countries under Settings → What to look for" }),
  search: async (query, { maxJobs, signal }) => {
    if (!query.country) return { jobs: [] };
    const country = query.country.toUpperCase();
    const body = {
      resultsPerPage: Math.min(50, Math.max(1, maxJobs)),
      page: 1,
      sortSearch: "MOST_RECENT",
      // Every word of the role in the title; any of the ways it is written.
      keywords: searchWords(query.keywords).map((alts) => ({ keyword: alts.join(" "), specificSearchCode: "TITLE" })),
      locationCodes: [(EURES_CODE[country] ?? country).toLowerCase()],
      publicationPeriod: period(query.maxAgeDays),
    };
    const r = await feedHttpGet("EURES", SEARCH_URL, { method: "POST", headers: HEADERS, body: JSON.stringify(body), signal });
    if (!r.ok) return { jobs: [], warning: r.warning };
    const parsed = parseJsonOrWarn<EuresSearch>("EURES", r.body);
    if (!parsed.ok) return { jobs: [], warning: parsed.warning };
    const jobs: NormalizedJob[] = [];
    for (const v of parsed.data.jvs ?? []) {
      if (!v.id || !v.title) continue;
      jobs.push({
        platform: "eures",
        title: v.title.replace(/\s+/g, " ").trim(),
        company: v.employer?.name?.trim() || "Employer not named",
        url: pageUrl(v.id),
        location: countryName(country),
        description: v.description ? stripHtml(v.description) : null,
        postedAt: typeof v.creationDate === "number" ? new Date(v.creationDate).toISOString() : null,
        country,
      });
    }
    return { jobs };
  },
  // The city, the salary and the employer's own application link.
  describe: async (jobs, { signal }) => {
    const todo = jobs.filter((j) => j.platform === "eures" && !described.has(j));
    await Promise.all(
      todo.map(async (job) => {
        described.add(job);
        const id = decodeURIComponent(job.url.match(/jv-details\/([^?]+)/)?.[1] ?? "");
        if (!id) return;
        const r = await feedHttpGet("EURES", detailUrl(id), { headers: { accept: "application/json" }, signal });
        if (!r.ok) return;
        const parsed = parseJsonOrWarn<EuresDetail>("EURES", r.body);
        if (!parsed.ok) return;
        const profile = Object.values(parsed.data.jvProfiles ?? {})[0];
        if (!profile) return;
        const city = profile.locations?.find((l) => l.cityName)?.cityName;
        if (city) job.location = `${city.replace(/\b\p{L}+/gu, (w) => (w === w.toUpperCase() ? w.charAt(0) + w.slice(1).toLowerCase() : w))}, ${countryName(job.country ?? "")}`;
        job.salary = salaryText(profile.offeredRemunerationPackage?.salaries?.[0]) ?? job.salary ?? null;
        job.applyUrl = applyLink(profile.applicationInstructions) ?? job.applyUrl ?? null;
      }),
    );
  },
};
