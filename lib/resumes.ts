import { prisma } from "./prisma";
import { docxText } from "./docx";
import { generateForTask, type LLMRequest } from "./llmClient";
import { pdfText } from "./pdfText";
import { getProfile, saveProfile } from "./profile";
import { mergeResumeProfile, normalizeProfile, type CandidateProfile } from "./profileModel";
import { resumeFileProblem, resumeNameOf, resumeType, RESUME_TYPES } from "./resumeFiles";

export type ResumeListItem = {
  id: number;
  name: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  tags: string | null;
  isDefault: boolean;
  parsed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Each user has their own resume variants.
export async function listResumes(userId: number): Promise<ResumeListItem[]> {
  const rows = await prisma.resume.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      tags: true,
      isDefault: true,
      parsed: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return rows.map((r) => ({ ...r, parsed: !!r.parsed }));
}

// Exactly one default resume per user: setting one clears the user's others.
export async function setDefaultResume(userId: number, id: number): Promise<void> {
  await prisma.$transaction([
    prisma.resume.updateMany({ where: { userId, isDefault: true, NOT: { id } }, data: { isDefault: false } }),
    prisma.resume.updateMany({ where: { userId, id }, data: { isDefault: true } }),
  ]);
}

// Pick the resume variant for a job: the one whose tags overlap most with the
// job text, else the default, else the newest.
export async function pickResumeForJob(userId: number, jobText: string): Promise<ResumeListItem | null> {
  return bestResume(await listResumes(userId), jobText);
}

/** Records which resume was sent with the application (null: none recorded); false when the resume isn't the job's user's. */
export async function setSentResume(jobId: number, resumeId: number | null, scope: { userId?: number } = {}): Promise<boolean | null> {
  const job = await prisma.scrapedJob.findFirst({ where: { id: jobId, ...scope }, select: { userId: true } });
  if (!job) return null;
  if (resumeId != null && !(await prisma.resume.findFirst({ where: { id: resumeId, userId: job.userId }, select: { id: true } }))) return false;
  await prisma.scrapedJob.update({ where: { id: jobId }, data: { resumeId } });
  return true;
}

/** The same choice among these resumes (the default first, then the newest, as listResumes orders them). */
export function bestResume<R extends { tags: string | null; isDefault: boolean }>(list: R[], jobText: string): R | null {
  if (list.length === 0) return null;
  const text = jobText.toLowerCase();
  let best: { r: R; hits: number } | null = null;
  for (const r of list) {
    const tags = (r.tags || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const hits = tags.filter((t) => text.includes(t)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { r, hits };
  }
  return best?.r ?? list.find((r) => r.isDefault) ?? list[0];
}

const nullableNumber = { anyOf: [{ type: "number" }, { type: "null" }] };
const str = { type: "string" };

// What Claude extracts from a resume. Mirrors CandidateProfile (minus the
// facts a resume does not state, which the admin fills in by hand).
const PROFILE_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "firstName",
    "lastName",
    "email",
    "phone",
    "city",
    "country",
    "linkedin",
    "github",
    "portfolio",
    "headline",
    "summary",
    "yearsExperience",
    "skills",
    "languages",
    "experience",
    "education",
  ],
  properties: {
    firstName: str,
    lastName: str,
    email: str,
    phone: str,
    city: str,
    country: str,
    linkedin: str,
    github: str,
    portfolio: str,
    headline: { type: "string", description: "One line, e.g. 'Senior .NET backend engineer'" },
    summary: str,
    yearsExperience: { ...nullableNumber, description: "Total years of professional experience" },
    skills: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "years"],
        properties: { name: str, years: nullableNumber },
      },
    },
    languages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "level"],
        properties: { name: str, level: str },
      },
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["company", "title", "start", "end", "location", "summary"],
        properties: { company: str, title: str, start: str, end: str, location: str, summary: str },
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["school", "degree", "field", "start", "end"],
        properties: { school: str, degree: str, field: str, start: str, end: str },
      },
    },
  },
};

// A PDF without text (a scan): its facts and its text, which only Claude can read (Writing drafts from it).
const PDF_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["profile", "text"],
  properties: {
    text: { type: "string", description: "The resume as plain text, in reading order (no markup)." },
    profile: PROFILE_SCHEMA,
  },
};

// A resume with text: the app has its text already, so only the facts (half the output, so sooner).
const TEXT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["profile"],
  properties: { profile: PROFILE_SCHEMA },
};

const RESUME_RULES = `You read a candidate's resume and return its facts as structured data.
- Copy facts exactly as the resume states them; never invent, embellish or guess. Use "" (or null for numbers) when the resume does not say.
- Dates as written (e.g. "2021-03" or "Mar 2021"); use "present" for a current role's end.
- skills: the concrete technologies and tools named, each with years only when the resume makes them clear.
- experience: newest first, with a one- or two-sentence summary of what the person did there.
- linkedin, github, portfolio: the full addresses when the resume gives them (a "Links:" line lists where its links point).`;
const PDF_SYSTEM = `${RESUME_RULES}\n- text: the whole resume as plain text in reading order.`;
// The schema in words, for providers without structured output (the free ones).
const PROFILE_SHAPE =
  '{"profile":{"firstName":string,"lastName":string,"email":string,"phone":string,"city":string,"country":string,"linkedin":string,"github":string,"portfolio":string,"headline":string,"summary":string,"yearsExperience":number|null,"skills":[{"name":string,"years":number|null}],"languages":[{"name":string,"level":string}],"experience":[{"company":string,"title":string,"start":string,"end":string,"location":string,"summary":string}],"education":[{"school":string,"degree":string,"field":string,"start":string,"end":string}]}}';

const MAX_TEXT = 100_000;
// Less than this (letters, digits, signs) is no resume text: a scan, or an empty template.
const MIN_TEXT = 30;
const OLD_DOC = "The AI reads PDF, Word (.docx) or text resumes: save this .doc as a PDF or .docx and upload that.";

/**
 * The resume's text as the app reads it itself: a text file's, a Word file's (lib/docx.ts) or a PDF's (lib/pdfText.ts),
 * or "" and why not. A PDF with no text layer (a scan) has no problem: Claude reads it as a document.
 */
export async function resumeText(mimeType: string, bytes: Buffer): Promise<{ text: string; problem: string | null }> {
  const kind = RESUME_TYPES[mimeType];
  try {
    // trim() also drops a leading byte-order mark.
    if (kind === "txt" || kind === "md") return { text: bytes.toString("utf8").replace(/\r\n?/g, "\n").trim().slice(0, MAX_TEXT), problem: null };
    if (kind === "docx") return { text: docxText(bytes).slice(0, MAX_TEXT), problem: null };
    if (kind === "pdf") return { text: (await pdfText(bytes)).slice(0, MAX_TEXT), problem: null };
  } catch (e) {
    return { text: "", problem: (e as Error).message };
  }
  return { text: "", problem: OLD_DOC };
}

const hasText = (text: string) => text.replace(/\s+/g, "").length >= MIN_TEXT;

export type ResumeFile = { bytes: Buffer; mimeType: string; fileName: string };
export type ResumeReading = { profile: CandidateProfile; text: string; model: string | null; costUsd: number | null };

/**
 * The AI reads a resume's facts into a profile. A resume with text (PDF, Word or text) goes as its text, to any
 * provider on the Resume reading route, and only its facts come back; a PDF without text (a scan) goes to Claude as a
 * document, which gives its text back too. `stored` is a text read before (a scan's, from Claude).
 */
export async function readResume(file: ResumeFile, userId: number, signal?: AbortSignal, stored?: string | null): Promise<ResumeReading> {
  const own = await resumeText(file.mimeType, file.bytes);
  const text = hasText(own.text) ? own.text : (stored ?? "");
  let request: LLMRequest;
  if (hasText(text)) {
    const user = `Extract this resume:\n\n${text.slice(0, 60_000)}`;
    request = {
      // Free providers get the same instructions as one prompt.
      prompt: `${RESUME_RULES}\n\n${user}\n\nReturn ONLY a JSON object: ${PROFILE_SHAPE}`,
      claude: { system: RESUME_RULES, user, jsonSchema: TEXT_SCHEMA, maxTokens: 12000 },
    };
  } else if (RESUME_TYPES[file.mimeType] === "pdf") {
    request = {
      prompt: "",
      // Only Claude reads a PDF as a document.
      claudeOnly: true,
      claude: {
        system: PDF_SYSTEM,
        user: "Extract this resume.",
        documents: [{ mediaType: "application/pdf" as const, base64: file.bytes.toString("base64"), title: file.fileName }],
        jsonSchema: PDF_SCHEMA,
        maxTokens: 16000,
      },
    };
  } else {
    throw new Error(own.problem ?? "There is almost no text in this file (is it a scan?): upload the resume as a PDF.");
  }

  const result = await generateForTask("resume", request, signal, { callTimeoutMs: 55_000, userId });
  let parsed: { profile?: unknown; text?: unknown };
  try {
    // A free provider may wrap the JSON in prose or a code fence.
    const start = result.text.indexOf("{");
    parsed = JSON.parse(start >= 0 ? result.text.slice(start, result.text.lastIndexOf("}") + 1) : result.text);
  } catch {
    throw new Error("The AI returned an unreadable answer — try again.");
  }
  const readText = hasText(text) ? text : typeof parsed.text === "string" ? parsed.text.slice(0, MAX_TEXT) : "";
  return { profile: normalizeProfile(parsed.profile), text: readText, model: result.model, costUsd: result.costUsd ?? null };
}

/**
 * A stored resume read by the AI, keeping what it found on the resume. With `reuse`, an earlier reading comes back
 * at once, without an AI call (`reused`).
 */
export async function parseResume(
  id: number,
  signal?: AbortSignal,
  opts: { reuse?: boolean } = {},
): Promise<ResumeReading & { reused: boolean }> {
  const resume = await prisma.resume.findUnique({ where: { id } });
  if (!resume) throw new Error("Resume not found");
  if (opts.reuse && resume.parsed) {
    try {
      const profile = normalizeProfile(JSON.parse(resume.parsed));
      return { profile, text: resume.textContent ?? "", model: null, costUsd: null, reused: true };
    } catch {
      // Unreadable: read the file again.
    }
  }
  const file = { bytes: Buffer.from(resume.data), mimeType: resume.mimeType, fileName: resume.fileName };
  const reading = await readResume(file, resume.userId, signal, resume.textContent);
  await prisma.resume.update({ where: { id }, data: { parsed: JSON.stringify(reading.profile), textContent: reading.text || null } });
  return { ...reading, reused: false };
}

export class ResumeUploadError extends Error {}

// A reading sent back with an upload (Add user reads the file before the user exists).
function readingFrom(raw: unknown): { profile: CandidateProfile; text: string } | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const r = JSON.parse(raw) as { profile?: unknown; text?: unknown };
    if (!r?.profile || typeof r.profile !== "object") return null;
    return { profile: normalizeProfile(r.profile), text: typeof r.text === "string" ? r.text.slice(0, MAX_TEXT) : "" };
  } catch {
    return null;
  }
}

export type UploadedResume = {
  id: number;
  isDefault: boolean;
  /** Its text is stored: Writing drafts from it, and reading it sends the text. */
  readable: boolean;
  /** A reading came with it. */
  read: boolean;
  filled: string[];
  /** Why the AI cannot read it (a damaged or old Word file, no text); null when it can. */
  problem: string | null;
};

/**
 * Stores an uploaded resume for this user, whatever the app can read in it (autofill still attaches it). Their
 * first one is the default, and `makeDefault` ("true") makes a later one the default. Its text is read at once
 * (PDF, Word or text), so Writing drafts from it. A reading done before (`reading`, JSON) is stored with it, and
 * `fillProfile` ("replace") copies its facts into the user's profile.
 */
export async function addResume(
  userId: number,
  form: { file: File; name?: unknown; tags?: unknown; makeDefault?: unknown; reading?: unknown; fillProfile?: unknown },
): Promise<UploadedResume> {
  const { file } = form;
  const refused = resumeFileProblem(file);
  if (refused) throw new ResumeUploadError(refused);
  const mimeType = resumeType(file.type, file.name)!;
  const data = Buffer.from(await file.arrayBuffer());
  const own = await resumeText(mimeType, data);
  const reading = readingFrom(form.reading);
  const name = (typeof form.name === "string" && form.name.trim().slice(0, 120)) || resumeNameOf(file.name);
  const tags = (typeof form.tags === "string" && form.tags.trim().slice(0, 500)) || null;
  const textContent = (hasText(own.text) ? own.text : "") || reading?.text || null;

  const count = await prisma.resume.count({ where: { userId } });
  const created = await prisma.resume.create({
    data: {
      userId,
      name,
      fileName: file.name.slice(0, 255),
      mimeType,
      sizeBytes: file.size,
      data,
      tags,
      isDefault: count === 0,
      textContent,
      parsed: reading ? JSON.stringify(reading.profile) : null,
    },
    select: { id: true },
  });
  const makeDefault = count > 0 && form.makeDefault === "true";
  if (makeDefault) await setDefaultResume(userId, created.id);

  let filled: string[] = [];
  if (reading && form.fillProfile === "replace") {
    const merged = mergeResumeProfile(await getProfile(userId), reading.profile, "replace");
    if (merged.filled.length) await saveProfile(userId, merged.profile);
    filled = merged.filled;
  }
  // A scan has no problem (Claude reads it as a document); a Word or text file with no text does.
  const problem =
    textContent || mimeType === "application/pdf" ? null : (own.problem ?? "There is almost no text in this file (is it a scan?): upload the resume as a PDF.");
  return { id: created.id, isDefault: count === 0 || makeDefault, readable: !!textContent, read: !!reading, filled, problem };
}
