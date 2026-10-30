// What a user looks for (Settings → What to look for): the roles to search,
// where, how fresh, and what to leave out. Sources that can search take it as
// their query (lib/scrapers), and every posting from every source then goes
// through filterJob, free, before the AI sees it: a posting for another role,
// in another country, too old, not in English when that is asked, or remote
// but closed to Europe never costs an AI call.
//
// Pure (no server imports): the admin UI uses it too.

export type Workplace = "remote" | "hybrid" | "onsite";
export const WORKPLACES: Workplace[] = ["remote", "hybrid", "onsite"];

/** How close a posting must be to one of the roles. */
export type TitleMatch = "strict" | "loose" | "off";

export type SearchProfile = {
  /** Job titles or keywords to search for, e.g. "Backend Developer". */
  roles: string[];
  /** Words that rule a posting out when its title has one, e.g. "Sales", "Intern". */
  exclude: string[];
  /** Countries for on-site and hybrid jobs (ISO 3166 codes, e.g. "DE"); empty = any. */
  countries: string[];
  /** The workplaces they take. */
  workplaces: Workplace[];
  /** Remote jobs must be open to Europe (not limited to the US or another region). */
  remoteEurope: boolean;
  /** Only postings from the last N days; 0 = any age. */
  maxAgeDays: number;
  /** Only postings written in English. */
  englishOnly: boolean;
  /**
   * strict: the title has every word of a role (developer = engineer, back-end = backend, …);
   * loose: the title has one of a role's words and the posting has all of them;
   * off: no check.
   */
  titleMatch: TitleMatch;
};

export const DEFAULT_SEARCH_PROFILE: SearchProfile = {
  roles: [],
  exclude: [],
  countries: [],
  workplaces: ["remote", "hybrid", "onsite"],
  remoteEurope: true,
  maxAgeDays: 30,
  englishOnly: false,
  titleMatch: "loose",
};

export const AGE_CHOICES = [1, 3, 7, 14, 30, 0] as const;

/** Every country in the EU, plus the UK, Switzerland, Norway and Iceland. */
export const EUROPE_COUNTRIES: { code: string; name: string }[] = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "NO", name: "Norway" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "GB", name: "United Kingdom" },
];

const COUNTRY_CODES = new Set(EUROPE_COUNTRIES.map((c) => c.code));

export function countryName(code: string): string {
  return EUROPE_COUNTRIES.find((c) => c.code === code.toUpperCase())?.name ?? code.toUpperCase();
}

function cleanList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string") continue;
    const s = v.replace(/\s+/g, " ").trim().slice(0, 80);
    if (s && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

export const MAX_ROLES = 8;
export const MAX_COUNTRIES = 12;

/** A saved profile (JSON), with anything missing or wrong replaced by the defaults. */
export function parseSearchProfile(raw: string | undefined | null): SearchProfile {
  let v: Record<string, unknown> = {};
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) v = parsed;
  } catch {
    // unreadable: the defaults
  }
  const workplaces = cleanList(v.workplaces, 3).filter((w): w is Workplace => (WORKPLACES as string[]).includes(w));
  const age = Number(v.maxAgeDays);
  return {
    roles: cleanList(v.roles, MAX_ROLES),
    exclude: cleanList(v.exclude, 40),
    countries: cleanList(v.countries, MAX_COUNTRIES)
      .map((c) => c.toUpperCase())
      .filter((c) => COUNTRY_CODES.has(c)),
    workplaces: workplaces.length ? workplaces : DEFAULT_SEARCH_PROFILE.workplaces,
    remoteEurope: v.remoteEurope !== false,
    maxAgeDays: Number.isInteger(age) && age >= 0 && age <= 365 ? age : DEFAULT_SEARCH_PROFILE.maxAgeDays,
    englishOnly: v.englishOnly === true,
    titleMatch: v.titleMatch === "strict" || v.titleMatch === "off" ? v.titleMatch : "loose",
  };
}

// ── Matching words ─────────────────────────────────────────────────────────

/** Lower case, no accents, separators as spaces: "Back-End Entwickler (m/w/d)" → "back end entwickler m w d". */
export function normalizeText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\bc\s?#/g, " csharp ")
    .replace(/\.net\b/g, " dotnet ")
    .replace(/\bnode\.js\b/g, " nodejs ")
    .replace(/\b(react|vue|next|nest|express)\.js\b/g, " $1 ")
    .replace(/[^\p{L}\p{N}+]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Phrases written in several ways, each read as one word.
const PHRASES: [RegExp, string][] = [
  [/\bback end\b/g, "backend"],
  [/\bfront end\b/g, "frontend"],
  [/\bfull stack\b/g, "fullstack"],
  [/\bsite reliability\b/g, "sre"],
  [/\bmachine learning\b/g, "ml"],
  [/\bquality assurance\b/g, "qa"],
  [/\bdata scien(ce|tist)\b/g, "datascience"],
  [/\bproduct owner\b/g, "productowner"],
  [/\bproduct manager\b/g, "productmanager"],
  [/\bproject manager\b/g, "projectmanager"],
  [/\bscrum master\b/g, "scrummaster"],
  [/\bux ui\b|\bui ux\b/g, "uxui"],
];

// Words that mean the same in a title, in the languages of European postings.
const SAME: Record<string, string> = {};
function same(canonical: string, ...words: string[]) {
  for (const w of [canonical, ...words]) SAME[w] = canonical;
}
same("developer", "developers", "engineer", "engineers", "programmer", "programmers", "dev", "devs", "entwickler", "entwicklerin", "softwareentwickler", "softwareentwicklerin", "ingenieur", "ingenieurin", "developpeur", "developpeuse", "ingenieure", "desarrollador", "desarrolladora", "programador", "programadora", "ingeniero", "ingeniera", "sviluppatore", "sviluppatrice", "programmatore", "programista", "programistka", "inzynier", "ontwikkelaar", "utvecklare", "udvikler", "utvikler", "kehittaja", "vyvojar", "programator", "fejleszto", "dezvoltator");
same("backend", "serverside");
same("frontend", "clientside");
same("dotnet", "csharp", "aspnet");
same("javascript", "js", "ecmascript");
same("typescript", "ts");
same("nodejs", "node");
same("golang", "go");
same("react", "reactjs");
same("vue", "vuejs");
same("angular", "angularjs");
same("kubernetes", "k8s");
same("qa", "tester", "testing", "sdet", "testautomation");
same("ml", "ai", "llm", "llms", "genai");
same("android");
same("ios", "swift");
same("devops", "sre");
same("data", "daten", "donnees", "datos", "dati", "dane");
same("software", "sw");
same("web", "webentwicklung");
same("mobile", "mobil");
same("security", "sicherheit", "cybersecurity", "infosec");
same("analyst", "analytiker", "analyste", "analista");
same("designer", "design");
same("manager", "management", "leiter", "leiterin", "responsable", "gerente", "kierownik");
same("architect", "architekt", "architecte", "arquitecto", "architetto");
same("administrator", "admin", "sysadmin", "systemadministrator");
same("consultant", "berater", "beraterin", "consultor", "consulente", "konsultant");
same("support", "helpdesk", "servicedesk");

// Words that say nothing about the role.
const FILLER = new Set([
  "a", "an", "the", "and", "or", "of", "in", "for", "with", "to", "at", "on", "as",
  "m", "w", "d", "f", "x", "h", "mwd", "mfd", "fmd", "mfx", "all", "genders", "gn",
  "und", "oder", "fur", "mit", "im", "der", "die", "das", "de", "la", "le", "les", "des", "et", "y", "e", "il", "en", "el", "i", "z", "na", "w",
  "remote", "hybrid", "onsite", "fulltime", "full", "time", "part", "parttime", "vollzeit", "teilzeit",
  "senior", "junior", "mid", "medior", "regular", "lead", "principal", "staff", "head", "chief", "expert", "experienced",
]);

// Words a posting's text uses for anything ("ready to go", "AI-powered"):
// they count in a title, not in the text.
const COMMON_IN_TEXT = new Set(["go", "ai"]);

/** A text's words, as roles are compared: phrases joined, words that mean the same made one. */
export function roleWords(text: string, inText = false): string[] {
  let t = normalizeText(text);
  for (const [re, word] of PHRASES) t = t.replace(re, word);
  return t
    .split(" ")
    .filter((w) => w && !(inText && COMMON_IN_TEXT.has(w)))
    .map((w) => SAME[w] ?? w);
}

/** The words of a role that must be found: "Senior Backend Developer (m/w/d)" → backend, developer. */
export function roleKey(role: string): string[] {
  return [...new Set(roleWords(role).filter((w) => !FILLER.has(w)))];
}

// What a search engine is asked for, for a word of a role: the word as postings
// in European languages write it (one-word forms only: engines split phrases).
const SEARCH_WORDS: Record<string, string[]> = {
  developer: ["developer", "engineer", "entwickler", "développeur", "desarrollador", "sviluppatore", "programista", "ontwikkelaar", "utvecklare", "programmer"],
  backend: ["backend", "back-end"],
  frontend: ["frontend", "front-end"],
  fullstack: ["fullstack", "full-stack"],
  dotnet: [".net", "dotnet", "c#"],
  devops: ["devops", "sre"],
  qa: ["qa", "tester", "test"],
  ml: ["ml", "ai"],
  data: ["data", "daten", "données", "datos"],
  manager: ["manager", "leiter"],
  architect: ["architect", "architekt", "architecte"],
  administrator: ["administrator", "admin"],
  consultant: ["consultant", "berater"],
  analyst: ["analyst", "analytiker", "analyste", "analista"],
};

/** The search words for each word of a role: every group must match, any word of a group does. */
export function searchWords(role: string): string[][] {
  return roleKey(role).map((w) => SEARCH_WORDS[w] ?? [w]);
}

/** Whether a title (and description) fits one of the roles. */
export function matchesRoles(title: string, description: string, roles: string[], mode: TitleMatch): boolean {
  if (mode === "off" || roles.length === 0) return true;
  const inTitle = new Set(roleWords(title));
  const text = description.trim();
  const inPosting = mode === "loose" ? new Set([...inTitle, ...roleWords(text.slice(0, 3000), true)]) : inTitle;
  return roles.some((role) => {
    const key = roleKey(role);
    if (key.length === 0) return false;
    if (mode === "strict") return key.every((w) => inTitle.has(w));
    // Without the text (a source that gives it in a details call, or never), a word in the title is enough.
    return key.some((w) => inTitle.has(w)) && (!text || key.every((w) => inPosting.has(w)));
  });
}

/** The excluded word a title has, if any (whole words: "Intern" does not exclude "International"). */
export function excludedWord(title: string, exclude: string[]): string | null {
  const t = ` ${normalizeText(title)} `;
  for (const word of exclude) {
    const w = normalizeText(word);
    if (w && t.includes(` ${w} `)) return word;
  }
  return null;
}

// ── Language ───────────────────────────────────────────────────────────────

// Short, frequent words of each language: enough to tell a posting's language.
const STOPWORDS: Record<string, string[]> = {
  en: ["the", "and", "you", "with", "our", "for", "are", "will", "your", "we", "of", "to", "in", "is", "experience", "team", "work"],
  de: ["und", "der", "die", "das", "mit", "fur", "wir", "sie", "ihre", "eine", "einen", "auf", "bei", "zu", "ist", "unser", "unsere", "erfahrung", "kenntnisse"],
  fr: ["et", "les", "des", "une", "vous", "nous", "pour", "avec", "dans", "est", "sur", "votre", "notre", "experience", "equipe"],
  es: ["y", "los", "las", "una", "para", "con", "del", "por", "que", "nuestro", "nuestra", "experiencia", "equipo", "como"],
  it: ["e", "il", "di", "una", "per", "con", "che", "della", "delle", "nostro", "nostra", "esperienza", "lavoro", "sono"],
  nl: ["en", "het", "een", "van", "voor", "met", "wij", "jij", "je", "onze", "ervaring", "bent", "zijn"],
  pl: ["i", "w", "na", "z", "do", "oraz", "dla", "jest", "sie", "nasz", "nasze", "doswiadczenie", "pracy", "zespol"],
  pt: ["e", "os", "as", "uma", "para", "com", "que", "nosso", "nossa", "experiencia", "equipa", "equipe", "voce"],
  sv: ["och", "att", "det", "som", "en", "for", "med", "vi", "du", "har", "pa", "erfarenhet", "vara"],
};

/** The language a posting is written in (by its frequent words), or null when there is too little text to tell. */
export function guessLanguage(text: string): string | null {
  const words = normalizeText(text).split(" ").slice(0, 400);
  if (words.length < 25) return null;
  let best: string | null = null;
  let bestScore = 0;
  let english = 0;
  for (const [lang, list] of Object.entries(STOPWORDS)) {
    const set = new Set(list);
    const score = words.filter((w) => set.has(w)).length;
    if (lang === "en") english = score;
    if (score > bestScore) {
      best = lang;
      bestScore = score;
    }
  }
  // English postings with a few local words stay English.
  if (best !== "en" && english >= bestScore * 0.7) return "en";
  return bestScore >= 4 ? best : null;
}

// ── Where a remote job is open ─────────────────────────────────────────────

// "US only" as written, in capitals: "contact us only by e-mail" is not about where.
const US_ONLY = /\bU\.?S\.?(?:A\.?)?(?:\s*-\s*|\s+)(?:only|Only|ONLY)\b/;

// Patterns on the normalized text (lower case, no punctuation).
const CLOSED_TO_EUROPE = [
  /\b(usa|united states|america|canada|latam|latin america|north america|apac|asia|india|australia)\s+only\b/,
  /\bonly\s+(open|available|hiring|accepting candidates)\s+(to|in|from)\s+(the\s+)?(us|usa|united states|canada|north america|latam|latin america|americas|apac|asia|india|australia)\b/,
  /\bmust\s+(be\s+)?(based|located|residing|reside|live|living)\s+in\s+(the\s+)?(us|usa|united states|canada|north america|latam|latin america|americas|apac|asia|india|australia)\b/,
  /\b(us|usa|u s|united states)\s+(citizens?|residents?)\s+only\b/,
  /\b(remote|anywhere)\s+in\s+(the\s+)?(us|usa|united states|canada|north america|latam|latin america|americas)\b/,
  /\bauthori[sz]ed\s+to\s+work\s+in\s+the\s+(us|usa|united states)\b/,
];

// Who may apply, as remote boards write it ("USA", "Americas", "Europe, UK").
const OUTSIDE_EUROPE = /\b(us|usa|u s|united states|america|americas|north america|south america|latam|latin america|canada|mexico|brazil|argentina|colombia|apac|asia|india|australia|new zealand|japan|singapore|philippines|china|africa|south africa|nigeria|israel)\b/;
const OPEN_TO_EUROPE = /\b(europe|european|eu|eea|emea|cet|cest|worldwide|anywhere|global|international|uk|united kingdom|england|ireland|germany|france|spain|portugal|netherlands|belgium|luxembourg|poland|italy|sweden|norway|denmark|finland|iceland|austria|switzerland|czechia|czech republic|slovakia|hungary|romania|bulgaria|greece|croatia|slovenia|serbia|ukraine|estonia|latvia|lithuania|malta|cyprus)\b/;

// A region a title gives a remote job: "Engineer (Remote - US)", "US Remote".
const TITLE_REGION = /\b(remote\s+(us|usa|united states|canada|latam|americas|north america)|(us|usa|canada|latam|americas)\s+remote)\b/;

// What follows "remote in the US" that opens it to Europe too: "… and Europe", "… or the UK".
const ALSO_EUROPE = /^\s*(and|or|plus|as well as)?\s*(the\s+)?(europe|eu|eea|emea|uk|united kingdom)\b/;

/** The first match of a pattern in a normalized text that Europe does not follow. */
function closedMatch(text: string, re: RegExp): string | null {
  for (const m of text.matchAll(new RegExp(re.source, "g"))) {
    const end = (m.index ?? 0) + m[0].length;
    if (!ALSO_EUROPE.test(text.slice(end, end + 40))) return m[0];
  }
  return null;
}

/** The words of a remote posting that close it to Europe ("US only", or a region like "Americas" alone), if any. */
export function closedToEurope(title: string, location: string, description: string): string | null {
  const raw = `${title} ${location} ${description.slice(0, 4000)}`;
  const us = raw.match(US_ONLY);
  if (us) return normalizeText(us[0]);
  const text = normalizeText(raw);
  for (const re of CLOSED_TO_EUROPE) {
    const closed = closedMatch(text, re);
    if (closed) return closed;
  }
  const inTitle = closedMatch(normalizeText(title), TITLE_REGION);
  if (inTitle) return inTitle;
  const where = normalizeText(location);
  if (where && OUTSIDE_EUROPE.test(where) && !OPEN_TO_EUROPE.test(where)) return location.trim();
  return null;
}

// ── The filter ─────────────────────────────────────────────────────────────

/** What a source says about a posting (as much as it knows). */
export type FilterJob = {
  title: string;
  description?: string | null;
  location?: string | null;
  /** ISO 3166 code, when the source says. */
  country?: string | null;
  /** remote / hybrid / onsite, when the source says. */
  workplace?: Workplace | null;
  /** When it was posted (ISO), when the source says. */
  postedAt?: string | null;
};

export type FilterReason = "role" | "excluded" | "age" | "language" | "country" | "workplace" | "closed";

export type FilterResult = { keep: true } | { keep: false; reason: FilterReason; detail: string };

export const FILTER_REASON_LABEL: Record<FilterReason, string> = {
  role: "another role",
  excluded: "an excluded word",
  age: "too old",
  language: "not in English",
  country: "another country",
  workplace: "another workplace",
  closed: "remote but not open to Europe",
};

/** Whether a posting is worth an AI call for this user. What the source does not say never rules a posting out. */
export function filterJob(job: FilterJob, profile: SearchProfile, now: Date = new Date()): FilterResult {
  const description = job.description ?? "";
  const word = excludedWord(job.title, profile.exclude);
  if (word) return { keep: false, reason: "excluded", detail: word };
  if (!matchesRoles(job.title, description, profile.roles, profile.titleMatch)) {
    return { keep: false, reason: "role", detail: job.title };
  }
  if (profile.maxAgeDays > 0 && job.postedAt) {
    const posted = new Date(job.postedAt).getTime();
    if (Number.isFinite(posted) && now.getTime() - posted > profile.maxAgeDays * 86_400_000) {
      return { keep: false, reason: "age", detail: job.postedAt.slice(0, 10) };
    }
  }
  if (job.workplace && !profile.workplaces.includes(job.workplace)) {
    return { keep: false, reason: "workplace", detail: job.workplace };
  }
  const remote = job.workplace === "remote";
  if (!remote && job.country && profile.countries.length && !profile.countries.includes(job.country.toUpperCase())) {
    return { keep: false, reason: "country", detail: job.country.toUpperCase() };
  }
  if (remote && profile.remoteEurope) {
    const closed = closedToEurope(job.title, job.location ?? "", description);
    if (closed) return { keep: false, reason: "closed", detail: closed };
  }
  if (profile.englishOnly) {
    const lang = guessLanguage(`${job.title} ${description}`);
    if (lang && lang !== "en") return { keep: false, reason: "language", detail: lang };
  }
  return { keep: true };
}

/** "34 filtered out for free: 20 another role, 8 too old, …" for a scan's log. */
export function filterSummary(counts: Partial<Record<FilterReason, number>>): string | null {
  const parts = (Object.entries(counts) as [FilterReason, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([reason, n]) => `${n} ${FILTER_REASON_LABEL[reason]}`);
  if (!parts.length) return null;
  const total = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);
  return `${total} filtered out for free (${parts.join(", ")})`;
}

// ── Suggestions from the profile ───────────────────────────────────────────

/** Roles to start with, from the profile's headline and latest job titles. */
export function suggestRoles(profile: { headline?: string; experience?: { title?: string }[] }): string[] {
  const out: string[] = [];
  const add = (raw: string | undefined) => {
    const s = (raw ?? "")
      .replace(/\(.*?\)/g, " ")
      .replace(/\s+[|·–—-]\s+.*$/, "")
      .replace(/\b(senior|junior|lead|principal|staff|sr|jr)\b\.?/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (s && s.length <= 60 && roleKey(s).length && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
  };
  add(profile.headline);
  for (const e of profile.experience ?? []) add(e.title);
  return out.slice(0, 4);
}
