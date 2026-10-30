// Candidate profile: the facts autofill and AI answers draw on. Pure module
// (no server imports) so the admin UI shares the type and helpers.

export type ProfileSkill = { name: string; years: number | null };
export type ProfileLanguage = { name: string; level: string };
export type ProfileExperience = {
  company: string;
  title: string;
  start: string;
  end: string;
  location: string;
  summary: string;
};
export type ProfileEducation = { school: string; degree: string; field: string; start: string; end: string };

export type CandidateProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  timezone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  headline: string;
  summary: string;
  yearsExperience: number | null;
  /** e.g. "EU citizen. No US work permit — open to contractor (B2B) or EOR roles." */
  workAuthorization: string;
  needsSponsorship: boolean | null;
  contractorOk: boolean | null;
  willingToRelocate: boolean | null;
  /** e.g. "Remote only" */
  remotePreference: string;
  noticePeriod: string;
  availableFrom: string;
  /** e.g. "€4,500 / month gross, B2B" */
  salaryExpectation: string;
  skills: ProfileSkill[];
  languages: ProfileLanguage[];
  experience: ProfileExperience[];
  education: ProfileEducation[];
  /** Voluntary self-identification answers; default "Decline to self-identify". */
  eeo: { gender: string; ethnicity: string; veteran: string; disability: string };
  /** Anything else the AI may use when drafting answers (achievements, preferences…). */
  extraFacts: string;
};

export const DECLINE = "Decline to self-identify";

export const EMPTY_PROFILE: CandidateProfile = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  country: "",
  timezone: "",
  linkedin: "",
  github: "",
  portfolio: "",
  headline: "",
  summary: "",
  yearsExperience: null,
  workAuthorization: "",
  needsSponsorship: null,
  contractorOk: null,
  willingToRelocate: null,
  remotePreference: "",
  noticePeriod: "",
  availableFrom: "",
  salaryExpectation: "",
  skills: [],
  languages: [],
  experience: [],
  education: [],
  eeo: { gender: DECLINE, ethnicity: DECLINE, veteran: DECLINE, disability: DECLINE },
  extraFacts: "",
};

function str(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "";
}

function bool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "yes") return true;
  if (v === "false" || v === "no") return false;
  return null;
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 && n < 100 ? Math.round(n * 10) / 10 : null;
}

function arr<T>(v: unknown, map: (x: Record<string, unknown>) => T, keep: (t: T) => boolean, max = 60): T[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map(map)
    .filter(keep)
    .slice(0, max);
}

// Repair anything malformed field by field (stored JSON, AI output, form input).
export function normalizeProfile(raw: unknown): CandidateProfile {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const eeo = r.eeo && typeof r.eeo === "object" ? (r.eeo as Record<string, unknown>) : {};
  // Accept a single "fullName" (e.g. from a parser) when first/last are absent.
  let firstName = str(r.firstName, 100);
  let lastName = str(r.lastName, 100);
  if (!firstName && !lastName && typeof r.fullName === "string") {
    const parts = r.fullName.trim().split(/\s+/);
    firstName = parts.shift() || "";
    lastName = parts.join(" ");
  }
  return {
    firstName,
    lastName,
    email: str(r.email, 200),
    phone: str(r.phone, 60),
    city: str(r.city, 100),
    country: str(r.country, 100),
    timezone: str(r.timezone, 60),
    linkedin: str(r.linkedin, 300),
    github: str(r.github, 300),
    portfolio: str(r.portfolio, 300),
    headline: str(r.headline, 200),
    summary: str(r.summary, 3000),
    yearsExperience: num(r.yearsExperience),
    workAuthorization: str(r.workAuthorization, 500),
    needsSponsorship: bool(r.needsSponsorship),
    contractorOk: bool(r.contractorOk),
    willingToRelocate: bool(r.willingToRelocate),
    remotePreference: str(r.remotePreference, 200),
    noticePeriod: str(r.noticePeriod, 100),
    availableFrom: str(r.availableFrom, 100),
    salaryExpectation: str(r.salaryExpectation, 200),
    skills: arr(
      r.skills,
      (s) => ({ name: str(s.name, 60), years: num(s.years) }),
      (s) => !!s.name,
      80,
    ),
    languages: arr(
      r.languages,
      (l) => ({ name: str(l.name, 60), level: str(l.level, 60) }),
      (l) => !!l.name,
      20,
    ),
    experience: arr(
      r.experience,
      (e) => ({
        company: str(e.company, 120),
        title: str(e.title, 120),
        start: str(e.start, 30),
        end: str(e.end, 30),
        location: str(e.location, 120),
        summary: str(e.summary, 1500),
      }),
      (e) => !!(e.company || e.title),
      30,
    ),
    education: arr(
      r.education,
      (e) => ({
        school: str(e.school, 160),
        degree: str(e.degree, 120),
        field: str(e.field, 120),
        start: str(e.start, 30),
        end: str(e.end, 30),
      }),
      (e) => !!(e.school || e.degree),
      10,
    ),
    eeo: {
      gender: str(eeo.gender, 80) || DECLINE,
      ethnicity: str(eeo.ethnicity, 80) || DECLINE,
      veteran: str(eeo.veteran, 80) || DECLINE,
      disability: str(eeo.disability, 80) || DECLINE,
    },
    extraFacts: str(r.extraFacts, 4000),
  };
}

export function fullName(p: CandidateProfile): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

// Fields autofill depends on most; drives the completeness meter.
const KEY_FIELDS: [keyof CandidateProfile, string][] = [
  ["firstName", "First name"],
  ["lastName", "Last name"],
  ["email", "E-mail"],
  ["phone", "Phone"],
  ["city", "City"],
  ["country", "Country"],
  ["linkedin", "LinkedIn URL"],
  ["headline", "Headline"],
  ["yearsExperience", "Years of experience"],
  ["workAuthorization", "Work authorization"],
  ["noticePeriod", "Notice period"],
  ["salaryExpectation", "Salary expectation"],
  ["skills", "Skills"],
  ["experience", "Experience"],
];

export function profileCompleteness(p: CandidateProfile): { filled: number; total: number; missing: string[] } {
  const missing: string[] = [];
  for (const [key, label] of KEY_FIELDS) {
    const v = p[key];
    const empty = v == null || v === "" || (Array.isArray(v) && v.length === 0);
    if (empty) missing.push(label);
  }
  return { filled: KEY_FIELDS.length - missing.length, total: KEY_FIELDS.length, missing };
}

export function isProfileEmpty(p: CandidateProfile): boolean {
  return profileCompleteness(p).filled === 0;
}

// The facts a resume states, in the order a summary of what was filled names them.
const RESUME_FACTS: [keyof CandidateProfile, string][] = [
  ["firstName", "first name"],
  ["lastName", "last name"],
  ["email", "e-mail"],
  ["phone", "phone"],
  ["city", "city"],
  ["country", "country"],
  ["linkedin", "LinkedIn"],
  ["github", "GitHub"],
  ["portfolio", "website"],
  ["headline", "headline"],
  ["summary", "summary"],
  ["yearsExperience", "years of experience"],
  ["skills", "skill"],
  ["languages", "language"],
  ["experience", "role"],
  ["education", "school"],
];

const isBlank = (v: unknown): boolean => v == null || v === "" || (Array.isArray(v) && v.length === 0);

/**
 * A resume's facts copied into a profile: only into its empty fields ("fill"), or over what is there ("replace").
 * Work terms, self-identification and other facts never come from a resume, so they are kept. `filled` names what
 * changed ("e-mail", "12 skills").
 */
export function mergeResumeProfile(
  current: CandidateProfile,
  extracted: CandidateProfile,
  mode: "fill" | "replace",
): { profile: CandidateProfile; filled: string[] } {
  const next: Record<string, unknown> = { ...current };
  const filled: string[] = [];
  for (const [key, label] of RESUME_FACTS) {
    const value = extracted[key];
    if (isBlank(value) || (mode === "fill" && !isBlank(current[key]))) continue;
    if (JSON.stringify(value) === JSON.stringify(current[key])) continue;
    next[key] = value;
    filled.push(Array.isArray(value) ? `${value.length} ${label}${value.length === 1 ? "" : "s"}` : label);
  }
  return { profile: normalizeProfile(next), filled };
}

// Compact text block for the AI: matching prompts and answer drafting.
export function profileSummary(p: CandidateProfile, opts: { includeContact?: boolean } = {}): string {
  const lines: string[] = [];
  const name = fullName(p);
  if (opts.includeContact && name) lines.push(`Name: ${name}`);
  if (opts.includeContact && p.email) lines.push(`E-mail: ${p.email}`);
  if (p.headline) lines.push(`Headline: ${p.headline}`);
  const loc = [p.city, p.country].filter(Boolean).join(", ");
  if (loc) lines.push(`Based in: ${loc}${p.timezone ? ` (${p.timezone})` : ""}`);
  if (p.yearsExperience != null) lines.push(`Years of experience: ${p.yearsExperience}`);
  if (p.skills.length) {
    lines.push(
      `Skills: ${p.skills.map((s) => (s.years != null ? `${s.name} (${s.years}y)` : s.name)).join(", ")}`,
    );
  }
  if (p.languages.length) lines.push(`Languages: ${p.languages.map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`).join(", ")}`);
  if (p.workAuthorization) lines.push(`Work authorization: ${p.workAuthorization}`);
  if (p.needsSponsorship != null) lines.push(`Needs visa sponsorship: ${p.needsSponsorship ? "yes" : "no"}`);
  if (p.contractorOk != null) lines.push(`Open to contractor / B2B: ${p.contractorOk ? "yes" : "no"}`);
  if (p.willingToRelocate != null) lines.push(`Willing to relocate: ${p.willingToRelocate ? "yes" : "no"}`);
  if (p.remotePreference) lines.push(`Work mode: ${p.remotePreference}`);
  if (p.noticePeriod) lines.push(`Notice period: ${p.noticePeriod}`);
  if (p.availableFrom) lines.push(`Available from: ${p.availableFrom}`);
  if (p.salaryExpectation) lines.push(`Salary expectation: ${p.salaryExpectation}`);
  if (p.experience.length) {
    lines.push("Experience:");
    for (const e of p.experience.slice(0, 8)) {
      lines.push(
        `- ${e.title || "Role"} at ${e.company || "?"} (${[e.start, e.end || "present"].filter(Boolean).join(" – ")})${
          e.summary ? `: ${e.summary.slice(0, 300)}` : ""
        }`,
      );
    }
  }
  if (p.education.length) {
    lines.push(
      `Education: ${p.education.map((e) => [e.degree, e.field, e.school].filter(Boolean).join(", ")).join("; ")}`,
    );
  }
  if (p.summary) lines.push(`Summary: ${p.summary.slice(0, 800)}`);
  if (p.extraFacts) lines.push(`Other facts: ${p.extraFacts.slice(0, 1200)}`);
  return lines.join("\n");
}
