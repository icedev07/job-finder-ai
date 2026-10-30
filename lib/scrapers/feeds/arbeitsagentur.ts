import type { Feed, NormalizedJob } from "../types";
import { feedHttpGet, parseJsonOrWarn } from "../http";

// Germany's Federal Employment Agency (Bundesagentur für Arbeit): the job
// search behind arbeitsagentur.de/jobsuche, Germany's largest job database
// (about 800,000 jobs, mostly in German). It is the site's own backend, with
// the site's public client key, not a published API: its paths have changed
// before, so a failure comes back as a warning. The search gives the title,
// place, dates, home office and salary; the description comes from a details
// call, made only for jobs about to be judged.

const BASE = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service";
const HEADERS = { "X-API-Key": "jobboerse-jobsuche", accept: "application/json" };
const jobPage = (ref: string) => `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(ref)}`;

type BaJob = {
  referenznummer?: string;
  stellenangebotsTitel?: string;
  titel?: string;
  firma?: string;
  stellenlokationen?: { adresse?: { ort?: string; region?: string; land?: string } }[];
  datumErsteVeroeffentlichung?: string;
  veroeffentlichungszeitraum?: { von?: string };
  homeofficemoeglich?: boolean;
  homeofficetyp?: string;
  homeofficeprozent?: number;
  externeURL?: string;
  verguetungsangabe?: string;
  gehaltsspanneVon?: number;
  gehaltsspanneBis?: number;
  festgehalt?: number;
};

type BaSearch = { maxErgebnisse?: number; ergebnisliste?: BaJob[] };
type BaDetails = { stellenangebotsBeschreibung?: string };

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());

function where(job: BaJob): string {
  const a = job.stellenlokationen?.find((l) => l.adresse?.ort)?.adresse;
  if (!a?.ort) return "Germany";
  return [a.ort, a.region && a.region !== "UEBERREGIONAL" ? titleCase(a.region.replace(/_/g, " ")) : null, "Germany"].filter(Boolean).join(", ");
}

// 100 % home office is remote; any other home office is hybrid; none is on-site.
function workplace(job: BaJob): NormalizedJob["workplace"] {
  if (job.homeofficemoeglich === false) return "onsite";
  if (job.homeofficemoeglich !== true) return null;
  return job.homeofficetyp === "ANGABE_IN_PROZENT" && job.homeofficeprozent === 100 ? "remote" : "hybrid";
}

function salary(job: BaJob): string | null {
  const per = job.verguetungsangabe === "JAHRESGEHALT" ? " a year" : job.verguetungsangabe === "STUNDENLOHN" ? " an hour" : "";
  const fmt = (n: number) => `€${n.toLocaleString("en-US")}`;
  if (job.gehaltsspanneVon && job.gehaltsspanneBis) return `${fmt(job.gehaltsspanneVon)} – ${fmt(job.gehaltsspanneBis)}${per}`;
  if (job.festgehalt) return `${fmt(job.festgehalt)}${per}`;
  return null;
}

const described = new WeakSet<NormalizedJob>();

export const arbeitsagenturFeed: Feed = {
  key: "arbeitsagentur",
  label: "Bundesagentur für Arbeit (Germany)",
  countries: ["DE"],
  fetch: async () => ({ jobs: [], warning: "The Bundesagentur searches the roles under Settings → What to look for (with Germany chosen)" }),
  search: async (query, { maxJobs, signal }) => {
    const params = new URLSearchParams({
      was: query.keywords,
      wo: "Deutschland",
      angebotsart: "1",
      sort: "veroeffdatum",
      page: "1",
      size: String(Math.min(100, Math.max(1, maxJobs))),
      facetten: "false",
    });
    if (query.maxAgeDays > 0) params.set("veroeffentlichtseit", String(Math.min(100, query.maxAgeDays)));
    const r = await feedHttpGet("Bundesagentur", `${BASE}/pc/v6/jobs?${params}`, { headers: HEADERS, signal });
    if (!r.ok) return { jobs: [], warning: r.warning };
    const parsed = parseJsonOrWarn<BaSearch>("Bundesagentur", r.body);
    if (!parsed.ok) return { jobs: [], warning: parsed.warning };
    const jobs: NormalizedJob[] = [];
    for (const j of parsed.data.ergebnisliste ?? []) {
      const ref = j.referenznummer;
      const title = (j.stellenangebotsTitel ?? j.titel ?? "").replace(/\s+/g, " ").trim();
      if (!ref || !title) continue;
      jobs.push({
        platform: "arbeitsagentur",
        title,
        company: j.firma?.trim() || "Employer not named",
        url: jobPage(ref),
        applyUrl: j.externeURL || null,
        location: where(j),
        postedAt: j.datumErsteVeroeffentlichung ?? j.veroeffentlichungszeitraum?.von ?? null,
        country: "DE",
        workplace: workplace(j),
        salary: salary(j),
      });
    }
    return { jobs };
  },
  // The description, from the details call.
  describe: async (jobs, { signal }) => {
    const todo = jobs.filter((j) => j.platform === "arbeitsagentur" && !described.has(j) && !j.description);
    await Promise.all(
      todo.map(async (job) => {
        described.add(job);
        const ref = decodeURIComponent(job.url.split("/jobdetail/")[1] ?? "");
        if (!ref) return;
        const r = await feedHttpGet("Bundesagentur", `${BASE}/pc/v4/jobdetails/${Buffer.from(ref).toString("base64")}`, { headers: HEADERS, signal });
        if (!r.ok) return;
        const parsed = parseJsonOrWarn<BaDetails>("Bundesagentur", r.body);
        if (parsed.ok && parsed.data.stellenangebotsBeschreibung) job.description = parsed.data.stellenangebotsBeschreibung.trim();
      }),
    );
  },
};
