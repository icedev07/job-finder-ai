import type { Feed, NormalizedJob } from "../types";
import { feedHttpGet, parseJsonOrWarn } from "../http";

// NoFluffJobs is a Poland/CEE-leaning IT job board with a public, no-auth search
// API — a strong fit for the Armenia → Europe target. Salary is ALWAYS
// disclosed (the board mandates it), a reliable `fullyRemote` flag lets us keep
// only true work-from-anywhere roles, and the catalogue is heavy on
// .NET / Java / JS B2B contracts.
//
// Endpoint (verified live):
//   POST https://nofluffjobs.com/api/search/posting
//        ?pageTo=1&pageSize=N&withSalaryMatch=false
//        &salaryCurrency=PLN&salaryPeriod=month&region=<region>
//   body: {"rawSearch":"<keyword>"}   // "" = newest across every technology
//
// Behaviours that shaped this client:
// - An empty body ({}) 500s, so we ALWAYS send a `rawSearch` key (possibly "").
// - The pageTo/pageSize query params are NOT honoured — a single call returns
//   the full first slab (~80-190 postings), already newest-first. We sort
//   defensively by the freshest of posted/renewed and slice to maxJobs rather
//   than paginate (pagination would just re-return the same slab).
// - Under load the API answers HTTP 200 with the JSON STRING "Internal server
//   error"; any non-object / postings-less body is treated as a soft warning so
//   the scan degrades gracefully instead of throwing.
//
// The "search URL" field is an opt-in pre-filter that runs BEFORE the AI
// analysis, to keep the free-tier AI budget for genuinely plausible jobs:
//   - bare token(s)              -> rawSearch keyword (e.g. ".net", "c#", "java")
//   - remote=true                -> keep only fullyRemote postings
//   - days=14 / since=14         -> keep only postings (re)posted within N days
// Blank keeps every technology and lets the analyzer judge suitability.
//
// Region is NOT a user filter: the search endpoint serves the Poland/CEE
// catalogue and ignores a `region` query param (verified live — pl/de/bogus all
// return the same slab), so we fix it to `pl` rather than advertise a no-op.

const NFJ_SEARCH = "https://nofluffjobs.com/api/search/posting";

type NfjPlace = {
  country?: { code?: string; name?: string } | null;
  city?: string;
};

type NfjSalary = {
  from?: number;
  to?: number;
  type?: string; // "b2b" | "permanent" | …
  currency?: string;
  disclosedAt?: string;
};

type NfjPosting = {
  id?: string;
  url?: string;
  title?: string;
  name?: string; // company
  technology?: string;
  category?: string;
  seniority?: string[];
  regions?: string[];
  posted?: number;
  renewed?: number;
  location?: {
    places?: NfjPlace[];
    fullyRemote?: boolean;
  } | null;
  salary?: NfjSalary | null;
};

type NfjResponse = { postings?: NfjPosting[]; totalCount?: number };

type Filters = {
  keyword: string;
  remoteOnly: boolean;
  /** 0 = no freshness filter. */
  withinDays: number;
};

function parseFilters(searchUrl: string | undefined): Filters {
  const f: Filters = { keyword: "", remoteOnly: false, withinDays: 0 };
  const words: string[] = [];
  for (const tok of (searchUrl ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const eq = tok.indexOf("=");
    if (eq === -1) {
      words.push(tok);
      continue;
    }
    const k = tok.slice(0, eq).trim().toLowerCase();
    const v = tok.slice(eq + 1).trim();
    if (k === "remote" || k === "fullyremote") f.remoteOnly = /^(true|1|yes|only)$/i.test(v);
    else if (k === "days" || k === "since" || k === "posted-within-days")
      f.withinDays = Math.max(0, Number(v) || 0);
    else if (k === "keyword" || k === "q" || k === "search" || k === "rawsearch") {
      if (v) words.push(v);
    }
    // An unrecognised `key=value` token is most likely a keyword that just
    // happens to contain "=" (e.g. "node.js=4"): keep the whole token as a
    // search word rather than silently dropping it.
    else words.push(tok);
  }
  f.keyword = words.join(" ").trim();
  return f;
}

/** Freshest of the posted / renewed timestamps (ms), 0 when neither parses. */
function postedAt(p: NfjPosting): number {
  return Math.max(Number(p.posted) || 0, Number(p.renewed) || 0);
}

function locationOf(p: NfjPosting): string {
  if (p.location?.fullyRemote) return "Remote";
  const cities = Array.from(
    new Set((p.location?.places ?? []).map((pl) => (pl.city || "").trim()).filter(Boolean)),
  );
  if (cities.length) return cities.slice(0, 4).join(", ");
  return p.location?.places?.[0]?.country?.name || "Poland";
}

function formatSalary(s: NfjSalary | null | undefined): string | null {
  if (!s) return null;
  const from = Number(s.from) || 0;
  const to = Number(s.to) || 0;
  if (!from && !to) return null;
  const cur = (s.currency || "").trim();
  const kind =
    s.type === "b2b" ? "B2B" : s.type === "permanent" ? "Permanent" : (s.type || "").trim();
  const fmt = (n: number) => n.toLocaleString("en-US");
  const range = from && to && from !== to ? `${fmt(from)} – ${fmt(to)}` : fmt(from || to);
  const head = `${cur ? cur + " " : ""}${range} /month`;
  return kind ? `${head} · ${kind}` : head;
}

function buildDescription(p: NfjPosting): string | null {
  const lines: string[] = [];
  const headBits = [
    (p.seniority ?? []).filter(Boolean).join(" / "),
    (p.technology || "").trim(),
    (p.category || "").trim(),
  ].filter(Boolean);
  if (headBits.length) lines.push(headBits.join(" · "));
  lines.push(`Location: ${locationOf(p)}`);
  const sal = formatSalary(p.salary);
  if (sal) lines.push(`Salary: ${sal}`);
  const regions = (p.regions ?? []).filter(Boolean);
  if (regions.length) lines.push(`Regions: ${regions.join(", ")}`);
  const text = lines.join("\n").trim();
  return text || null;
}

export const noFluffJobsFeed: Feed = {
  key: "nofluffjobs",
  label: "NoFluffJobs (PL/CEE)",
  fetch: async ({ maxJobs, searchUrl, signal }) => {
    const f = parseFilters(searchUrl);
    const cap = Math.min(200, Math.max(1, maxJobs));
    const qs = new URLSearchParams({
      pageTo: "1",
      pageSize: String(cap),
      withSalaryMatch: "false",
      salaryCurrency: "PLN",
      salaryPeriod: "month",
      region: "pl",
    });

    const r = await feedHttpGet("NoFluffJobs", `${NFJ_SEARCH}?${qs.toString()}`, {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rawSearch: f.keyword }),
      signal,
      cache: "no-store",
    });
    if (!r.ok) return { jobs: [], warning: r.warning };

    const parsed = parseJsonOrWarn<unknown>("NoFluffJobs", r.body);
    if (!parsed.ok) return { jobs: [], warning: parsed.warning };
    // Under load the API answers 200 with the bare string "Internal server
    // error" (valid JSON, but not our object) — treat anything without a
    // postings array as a soft, non-fatal warning.
    const data = parsed.data;
    if (!data || typeof data !== "object" || !Array.isArray((data as NfjResponse).postings)) {
      return {
        jobs: [],
        warning: "NoFluffJobs returned a non-standard response (likely overloaded — try again shortly)",
      };
    }
    const postings = (data as NfjResponse).postings ?? [];

    const cutoff = f.withinDays > 0 ? Date.now() - f.withinDays * 86_400_000 : 0;
    const sorted = [...postings].sort((a, b) => postedAt(b) - postedAt(a));

    const jobs: NormalizedJob[] = [];
    for (const p of sorted) {
      const title = (p.title || "").trim();
      const company = (p.name || "").trim();
      const slug = (p.url || p.id || "").trim();
      if (!title || !company || !slug) continue;
      if (f.remoteOnly && !p.location?.fullyRemote) continue;
      if (cutoff && postedAt(p) < cutoff) continue;

      jobs.push({
        platform: "nofluffjobs",
        title,
        company,
        url: `https://nofluffjobs.com/job/${slug}`,
        location: locationOf(p),
        description: buildDescription(p),
        salary: formatSalary(p.salary),
        postedAt: postedAt(p) ? new Date(postedAt(p)).toISOString() : null,
        workplace: p.location?.fullyRemote ? "remote" : null,
        country: p.location?.fullyRemote ? null : p.location?.places?.find((pl) => pl.country?.code)?.country?.code?.toUpperCase() ?? null,
      });
      if (jobs.length >= maxJobs) break;
    }

    return { jobs };
  },
};
