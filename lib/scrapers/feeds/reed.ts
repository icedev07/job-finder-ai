import type { Feed, NormalizedJob } from "../types";
import { feedHttpGet, parseJsonOrWarn } from "../http";
import { stripHtml } from "../rss";

// Reed.co.uk, the UK's largest job board, through its official Jobseeker API:
// a free key (reed.co.uk/developers), English postings, UK only. The search
// gives a short description; the details call, made only for jobs about to be
// judged, gives the full text and the employer's own application link.

const BASE = "https://www.reed.co.uk/api/1.0";

type ReedJob = {
  jobId?: number;
  jobTitle?: string;
  employerName?: string;
  locationName?: string;
  minimumSalary?: number | null;
  maximumSalary?: number | null;
  currency?: string | null;
  date?: string;
  jobDescription?: string;
  jobUrl?: string;
};

type ReedSearch = { results?: ReedJob[]; totalResults?: number };
type ReedDetails = { jobDescription?: string; externalUrl?: string | null; datePosted?: string };

/** "30/10/2026" → ISO. */
function ukDate(text: string | undefined): string | null {
  const m = text?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]))).toISOString() : null;
}

function salary(j: ReedJob): string | null {
  const cur = j.currency === "GBP" || !j.currency ? "£" : `${j.currency} `;
  const fmt = (n: number) => `${cur}${n.toLocaleString("en-GB")}`;
  if (j.minimumSalary && j.maximumSalary && j.minimumSalary !== j.maximumSalary) return `${fmt(j.minimumSalary)} – ${fmt(j.maximumSalary)}`;
  const one = j.minimumSalary || j.maximumSalary;
  return one ? fmt(one) : null;
}

const auth = (key: string) => `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
const keyOf = (config?: Record<string, string>) => (config?.reed_api_key ?? "").trim();

const described = new WeakSet<NormalizedJob>();

export const reedFeed: Feed = {
  key: "reed",
  label: "Reed (UK)",
  countries: ["GB"],
  fetch: async () => ({ jobs: [], warning: "Reed searches the roles under Settings → What to look for (with the United Kingdom chosen)" }),
  search: async (query, { maxJobs, signal, config }) => {
    const key = keyOf(config);
    if (!key) return { jobs: [], warning: "Reed needs its free API key (Sources → Reed)" };
    const params = new URLSearchParams({ keywords: query.keywords, resultsToTake: String(Math.min(100, Math.max(1, maxJobs))) });
    const r = await feedHttpGet("Reed", `${BASE}/search?${params}`, { headers: { authorization: auth(key), accept: "application/json" }, signal });
    if (!r.ok) return { jobs: [], warning: /401/.test(r.warning) ? "Reed refused the API key: check it (Sources → Reed)" : r.warning };
    const parsed = parseJsonOrWarn<ReedSearch>("Reed", r.body);
    if (!parsed.ok) return { jobs: [], warning: parsed.warning };
    const jobs: NormalizedJob[] = [];
    for (const j of parsed.data.results ?? []) {
      if (!j.jobId || !j.jobTitle) continue;
      jobs.push({
        platform: "reed",
        title: j.jobTitle.replace(/\s+/g, " ").trim(),
        company: j.employerName?.trim() || "Employer not named",
        url: j.jobUrl || `https://www.reed.co.uk/jobs/${j.jobId}`,
        location: j.locationName ? `${j.locationName}, United Kingdom` : "United Kingdom",
        // The search's short description; the full one comes with the details.
        description: j.jobDescription ? stripHtml(j.jobDescription) : null,
        salary: salary(j),
        postedAt: ukDate(j.date),
        country: "GB",
      });
    }
    return { jobs };
  },
  // The full description and the employer's own application link.
  describe: async (jobs, { signal, config }) => {
    const key = keyOf(config);
    if (!key) return;
    const todo = jobs.filter((j) => j.platform === "reed" && !described.has(j));
    await Promise.all(
      todo.map(async (job) => {
        described.add(job);
        const id = job.url.match(/\/(\d+)(?:[/?#]|$)/)?.[1];
        if (!id) return;
        const r = await feedHttpGet("Reed", `${BASE}/jobs/${id}`, { headers: { authorization: auth(key), accept: "application/json" }, signal });
        if (!r.ok) return;
        const parsed = parseJsonOrWarn<ReedDetails>("Reed", r.body);
        if (!parsed.ok) return;
        if (parsed.data.jobDescription) job.description = stripHtml(parsed.data.jobDescription);
        if (parsed.data.externalUrl) job.applyUrl = parsed.data.externalUrl;
      }),
    );
  },
};
