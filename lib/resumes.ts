import { prisma } from "./prisma";
import { generateForTask } from "./llmClient";
import { normalizeProfile, type CandidateProfile } from "./profileModel";

export const MAX_RESUME_BYTES = 4 * 1024 * 1024; // Vercel's request body limit is 4.5 MB

export const RESUME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "text/plain": "txt",
  "text/markdown": "md",
};

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
  const list = await listResumes(userId);
  if (list.length === 0) return null;
  const text = jobText.toLowerCase();
  let best: { r: ResumeListItem; hits: number } | null = null;
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
const RESUME_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["profile", "text"],
  properties: {
    text: { type: "string", description: "The resume as plain text, in reading order (no markup)." },
    profile: {
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
    },
  },
};

const RESUME_SYSTEM = `You read a candidate's resume and return its facts as structured data.
- Copy facts exactly as the resume states them; never invent, embellish or guess. Use "" (or null for numbers) when the resume does not say.
- Dates as written (e.g. "2021-03" or "Mar 2021"); use "present" for a current role's end.
- skills: the concrete technologies and tools named, each with years only when the resume makes them clear.
- experience: newest first, with a one- or two-sentence summary of what the person did there.
- text: the whole resume as plain text in reading order.`;

export type ParsedResume = { profile: CandidateProfile; text: string; model: string; costUsd: number | null };

export async function parseResume(id: number, signal?: AbortSignal): Promise<ParsedResume> {
  const resume = await prisma.resume.findUnique({ where: { id } });
  if (!resume) throw new Error("Resume not found");
  const kind = RESUME_TYPES[resume.mimeType];
  const bytes = Buffer.from(resume.data);
  let request;
  if (kind === "pdf") {
    request = {
      prompt: "",
      claudeOnly: true,
      claude: {
        system: RESUME_SYSTEM,
        user: "Extract this resume.",
        documents: [{ mediaType: "application/pdf" as const, base64: bytes.toString("base64"), title: resume.fileName }],
        jsonSchema: RESUME_SCHEMA,
        maxTokens: 16000,
      },
    };
  } else if (kind === "txt" || kind === "md") {
    const text = bytes.toString("utf8").slice(0, 60_000);
    request = {
      prompt: "",
      claudeOnly: true,
      claude: { system: RESUME_SYSTEM, user: `Extract this resume:\n\n${text}`, jsonSchema: RESUME_SCHEMA, maxTokens: 16000 },
    };
  } else {
    throw new Error("Claude can read PDF or plain-text resumes. Upload a PDF version of this file to extract your profile from it.");
  }

  // Reading a document needs Claude (claudeOnly skips any free provider on the route).
  const result = await generateForTask("resume", request, signal, { callTimeoutMs: 55_000, userId: resume.userId });
  let parsed: { profile?: unknown; text?: unknown };
  try {
    parsed = JSON.parse(result.text);
  } catch {
    throw new Error("Claude returned an unreadable answer — try again.");
  }
  const profile = normalizeProfile(parsed.profile);
  const text = typeof parsed.text === "string" ? parsed.text.slice(0, 100_000) : "";
  await prisma.resume.update({ where: { id }, data: { parsed: JSON.stringify(profile), textContent: text || null } });
  return { profile, text, model: result.model, costUsd: result.costUsd ?? null };
}
