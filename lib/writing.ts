import { generateForTask } from "./llmClient";
import { DRAFT_KIND_INFO, interviewName, platformLabel, stageText, type DraftKind } from "./format";
import { prisma } from "./prisma";
import { getProfile } from "./profile";
import { isProfileEmpty, profileSummary } from "./profileModel";
import { bestResume } from "./resumes";
import { getUser } from "./users";

// Writing in a job's panel: the AI drafts what the candidate needs for one
// application — how their resume fits the job, a cover letter, a short intro to
// the recruiter, a follow-up e-mail that fits where the application stands, and
// prep for the next interview. Each job keeps one draft of each kind (Draft),
// rewritten by the AI or edited by hand. Drafts go through the "Writing" AI
// route and draw only on the job's user's own profile and resume and on the
// application itself (the job, its notes, interviews and history).

export type DraftRow = {
  id: number;
  jobId: number;
  userId: number;
  kind: string;
  text: string;
  instructions: string | null;
  resumeId: number | null;
  model: string | null;
  edited: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** A resume of the job's user; only one the AI has read (Profile & resumes) has text to write from. */
export type WritingResume = { id: number; name: string; readable: boolean };

type Scope = { userId?: number };

/** A request the AI can't answer as asked (HTTP 400), as opposed to a provider failing. */
export class WritingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WritingError";
  }
}

const DAY_MS = 24 * 60 * 60_000;
const MAX_TEXT = 20_000;
const MAX_INSTRUCTIONS = 1000;
const DESCRIPTION_CHARS = 8000;
const RESUME_CHARS = 12_000;
// Within the minute a request may take (vercel.json), with time to save.
const CALL_TIMEOUT_MS = 55_000;

/** Before /api/setup has added the Draft table there is nowhere to keep a draft: say so before paying for one. */
async function draftsReady(): Promise<void> {
  try {
    await prisma.draft.findFirst({ select: { id: true } });
  } catch {
    throw new WritingError("Open /api/setup once first: it adds the table drafts are kept in.");
  }
}

/** The job's drafts; none before /api/setup has added the table. */
export async function jobDrafts(jobId: number): Promise<DraftRow[]> {
  try {
    return await prisma.draft.findMany({ where: { jobId }, orderBy: { id: "asc" } });
  } catch (err) {
    console.error(`[writing] could not read job #${jobId}'s drafts: ${(err as Error)?.message || err}`);
    return [];
  }
}

type JobForResume = { userId: number; resumeId: number | null; title: string; description: string | null; techStack: string | null };

/**
 * The job's user's resumes, and the one a draft draws on unless another is chosen: the resume sent with the
 * application, else the best match for the job (lib/resumes.ts), among those the AI has read.
 */
export async function writingResumes(job: JobForResume): Promise<{ resumes: WritingResume[]; suggested: number | null }> {
  try {
    const [all, read] = await Promise.all([
      prisma.resume.findMany({
        where: { userId: job.userId },
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        select: { id: true, name: true, tags: true, isDefault: true },
      }),
      prisma.resume.findMany({ where: { userId: job.userId, textContent: { not: null } }, select: { id: true } }),
    ]);
    const readable = new Set(read.map((r) => r.id));
    const candidates = all.filter((r) => readable.has(r.id));
    const sent = job.resumeId != null && readable.has(job.resumeId) ? job.resumeId : null;
    const text = [job.title, job.techStack, job.description].filter(Boolean).join("\n");
    return {
      resumes: all.map((r) => ({ id: r.id, name: r.name, readable: readable.has(r.id) })),
      suggested: sent ?? bestResume(candidates, text)?.id ?? null,
    };
  } catch (err) {
    console.error(`[writing] could not read user #${job.userId}'s resumes: ${(err as Error)?.message || err}`);
    return { resumes: [], suggested: null };
  }
}

// ── Prompts ─────────────────────────────────────────────────────────────────

const RULES = `You help a job seeker with their job applications: you write what they send to companies and help them prepare. Their profile and resume follow. Each request brings one job, where its application stands, and the task.

Rules:
- Use only facts from the candidate profile, the resume and the application (its notes, interviews and history). Never invent employers, titles, dates, numbers, degrees, skills, achievements, people or quotes. When the candidate does not show a requirement, do not claim it.
- What the candidate sends is in the first person, in their voice: specific, plain and confident. No clichés ("I am writing to express my interest", "passionate", "fast-paced environment"), no flattery, no exclamation marks.
- Never leave placeholders such as [Company] or [Name]: when a detail is unknown, write around it.
- Plain text only, no markdown: no **bold**, no # headings, no tables. A section title is a line of its own; list items start with "- ".
- Write in English unless the extra instructions ask for another language.
- Follow the extra instructions when there are any, except one that asks you to invent facts.`;

const TASKS: Record<DraftKind, string> = {
  match: `Compare the candidate with this job, so they can decide how to apply and what to change in the resume. Write these sections in this order, under 450 words in all:
Fit
One line: strong, good, partial or weak fit, and the main reason.
Strengths
3 to 6 items, each a requirement of the job the candidate meets, with the evidence from the resume or profile.
Gaps
The requirements the candidate does not show, most important first, each with an honest way to handle it (related experience to point to, or what to say when asked). "None" when there are none.
Keywords to add
One comma-separated line of words from the job description that the candidate's experience supports but the resume does not use. "None" when there are none.
Resume edits
3 to 5 concrete edits: a line of the summary or a bullet rewritten for this job from true facts only, each as the new text in quotes.`,
  cover_letter: `Write a cover letter for this job, 180 to 280 words, ready to paste:
- Start with "Dear <their name>," when the application notes name the hiring manager or recruiter, else "Dear Hiring Manager,".
- Open with the role and one specific reason this company or role fits the candidate, taken from the job description.
- Then two or three of the candidate's achievements or experiences that answer the job's main requirements, concretely.
- Close with their availability or notice period when the profile gives it, and a request for a conversation.
- Sign with the candidate's full name.`,
  intro: `Write a short message from the candidate to the recruiter or hiring manager about this job, for LinkedIn or a short e-mail: 50 to 110 words, under 700 characters.
- Greet the person by first name when the application notes name them, else "Hi,".
- Say who the candidate is in one line, give the one or two strongest reasons they fit this role, and make one clear ask (a short call, or where to send the application).
- No subject line and no signature block: end with the candidate's first name.`,
  follow_up: `Write a follow-up e-mail about this application: a line "Subject: …", an empty line, then the body, 60 to 140 words, signed with the candidate's first name. Fit it to where the application stands, from its history and today's date:
- Applied, no answer yet: a polite check-in that restates interest with one strong reason they fit, and asks about the timeline.
- After an interview: thanks for the conversation (name the interview's kind, and a topic from the notes when they give one), renewed interest and a question about next steps.
- An interview coming up and none behind: a short note confirming the time and asking whether there is anything to prepare.
- An offer: thanks, and the timeline or the open questions in the notes.
- Rejected or closed: a gracious reply that thanks them and asks, briefly, for feedback and to be considered for future roles.
- Not applied yet: a short note asking whether the role is still open, with the strongest reason they fit.
Address the person named in the notes when there is one.`,
  interview_prep: `Prepare the candidate for their next interview for this job (the next one in the application's interviews; its kind tells what it will test). Write these sections in this order, under 700 words in all:
Focus
Two or three lines on what this interview will likely test, given its kind and the job.
Likely questions
8 to 10 questions it will probably ask: for a technical interview mostly the job's stack and problems; for HR / recruiter motivation, salary, notice period, work authorization and availability; for a final one impact, teamwork and judgement. Each as "- " and the question, then a line "  Answer: " on how the candidate can answer from their real experience.
Stories to tell
3 or 4 short stories from the resume (the situation, what the candidate did, the result) that match the job's main requirements.
Questions to ask
4 to 6 good questions about the role, the team and the company.
Have ready
The facts they may be asked for: salary expectation, notice period, availability, work authorization, location and time zone, each from the profile, or "not in the profile".`,
};

/** The candidate's time zone when the profile names a real one ("Asia/Yerevan"), else UTC. */
function timeZoneOf(tz: string): string {
  const name = tz.trim();
  if (!name) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: name });
    return name;
  } catch {
    return "UTC";
  }
}

function dateText(d: Date, tz: string, now: Date, withTime = false): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: tz,
  });
  const days = Math.round((d.getTime() - now.getTime()) / DAY_MS);
  const when = days === 0 ? "today" : days > 0 ? `in ${days} day${days === 1 ? "" : "s"}` : `${-days} day${days === -1 ? "" : "s"} ago`;
  return `${fmt.format(d)} (${when})`;
}

function sentAnswers(raw: string | null): string {
  if (!raw) return "";
  try {
    const answers = (JSON.parse(raw) as { answers?: { question?: unknown; answer?: unknown }[] }).answers ?? [];
    return answers
      .filter((a) => typeof a.question === "string" && typeof a.answer === "string" && a.answer.trim())
      .map((a) => `Q: ${String(a.question).slice(0, 300)}\nA: ${String(a.answer).slice(0, 800)}`)
      .join("\n")
      .slice(0, 3000);
  } catch {
    return "";
  }
}

/** Markdown the model may still use, as the plain text the rules ask for. */
function plainText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .trim()
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/\n?```$/, "")
    .replace(/^#{1,6}[ \t]+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^([ \t]*)[*•][ \t]+/gm, "$1- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT);
}

// ── Writing ─────────────────────────────────────────────────────────────────

export type WriteInput = {
  /** What to do differently this time ("shorter", "in German"). */
  instructions: string | null;
  /** The resume to draw on: a resume's id, null for the profile only, undefined for the suggested one. */
  resumeId?: number | null;
};

/** A request's fields, or what is wrong with them. */
export function parseWriteInput(raw: unknown): WriteInput | string {
  if (raw == null) return { instructions: null };
  if (typeof raw !== "object" || Array.isArray(raw)) return "Expected an object";
  const r = raw as Record<string, unknown>;
  const out: WriteInput = { instructions: null };
  if (r.instructions != null) {
    if (typeof r.instructions !== "string") return "instructions must be text";
    out.instructions = r.instructions.trim().slice(0, MAX_INSTRUCTIONS) || null;
  }
  if ("resumeId" in r && r.resumeId !== undefined) {
    if (r.resumeId !== null && !(Number.isInteger(r.resumeId) && (r.resumeId as number) > 0)) return "resumeId must be a resume's id or null";
    out.resumeId = r.resumeId as number | null;
  }
  return out;
}

/** The AI writes (or rewrites) the job's draft of this kind; null when the job is not in scope. */
export async function writeDraft(
  jobId: number,
  kind: DraftKind,
  input: WriteInput,
  opts: { scope?: Scope; now?: Date; signal?: AbortSignal } = {},
): Promise<{ draft: DraftRow; costUsd: number | null } | null> {
  const { scope = {}, now = new Date() } = opts;
  const job = await prisma.scrapedJob.findFirst({
    where: { id: jobId, ...scope },
    select: {
      id: true,
      userId: true,
      platform: true,
      title: true,
      company: true,
      location: true,
      salary: true,
      techStack: true,
      description: true,
      aiScore: true,
      aiReason: true,
      stage: true,
      stageUpdatedAt: true,
      closeReason: true,
      appliedAt: true,
      notes: true,
      applicationData: true,
      resumeId: true,
    },
  });
  if (!job) return null;
  await draftsReady();

  const resumeId = input.resumeId === undefined ? (await writingResumes(job)).suggested : input.resumeId;
  const [profile, resume, interviews, followedUp, owner] = await Promise.all([
    getProfile(job.userId),
    resumeId == null
      ? Promise.resolve(null)
      : prisma.resume.findFirst({ where: { id: resumeId, userId: job.userId }, select: { name: true, textContent: true } }),
    prisma.interview.findMany({ where: { jobId }, orderBy: { at: "asc" } }),
    prisma.applicationEvent.findFirst({ where: { jobId, kind: "followed_up" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    getUser(job.userId),
  ]);
  if (resumeId != null && !resume?.textContent?.trim()) {
    throw new WritingError(
      resume ? `The AI has not read the resume "${resume.name}" yet: read it in Profile & resumes first.` : "resumeId is not one of this user's resumes",
    );
  }
  const resumeText = resume?.textContent?.trim() ?? "";
  if (isProfileEmpty(profile) && !resumeText) {
    throw new WritingError(
      `Fill in ${owner?.name || "the user"}'s profile or read a resume in Profile & resumes first: the AI writes only from their own facts.`,
    );
  }

  const tz = timeZoneOf(profile.timezone);
  const system = `${RULES}

==================== CANDIDATE PROFILE ====================
${profileSummary(profile, { includeContact: true }) || "(empty: work from the resume)"}

==================== ${resume ? `RESUME: ${resume.name}` : "RESUME"} ====================
${resumeText ? resumeText.slice(0, RESUME_CHARS) : "(none: work from the profile)"}`;

  const application: string[] = [];
  application.push(
    `Stage: ${stageText(job.stage, job.closeReason) || "not in the pipeline yet"}${
      job.stage && job.stageUpdatedAt ? ` (since ${dateText(job.stageUpdatedAt, tz, now)})` : ""
    }`,
  );
  application.push(`Applied: ${job.appliedAt ? dateText(job.appliedAt, tz, now) : "not yet"}`);
  if (followedUp) application.push(`Last followed up: ${dateText(followedUp.createdAt, tz, now)}`);
  if (interviews.length) {
    application.push("Interviews:");
    for (const i of interviews) {
      application.push(`- ${interviewName(i.kind)}: ${dateText(i.at, tz, now, true)}${i.notes ? `. Notes: ${i.notes.slice(0, 600)}` : ""}`);
    }
  } else {
    application.push("Interviews: none yet");
  }
  application.push(`Notes (the candidate's own): ${job.notes?.trim() ? job.notes.trim().slice(0, 3000) : "none"}`);
  const answers = sentAnswers(job.applicationData);
  if (answers) application.push(`Sent with the application:\n${answers}`);

  const facts = [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    job.location ? `Location: ${job.location}` : "",
    job.salary ? `Salary: ${job.salary}` : "",
    `Found on: ${platformLabel(job.platform)}`,
    job.techStack ? `Tech stack: ${job.techStack}` : "",
    job.aiScore != null ? `Matching verdict: ${job.aiScore}/100${job.aiReason ? `: ${job.aiReason}` : ""}` : "",
  ].filter(Boolean);
  const user = `Task: ${TASKS[kind]}

Today is ${dateText(now, tz, now).replace(" (today)", "")}. Times are in ${tz}.

==================== JOB ====================
${facts.join("\n")}
Description:
${job.description?.trim() ? job.description.trim().slice(0, DESCRIPTION_CHARS) : "(no description stored)"}

==================== APPLICATION ====================
${application.join("\n")}
${input.instructions ? `\n==================== EXTRA INSTRUCTIONS ====================\n${input.instructions}\n` : ""}
Write the ${DRAFT_KIND_INFO[kind].label.toLowerCase()} now.`;

  const result = await generateForTask(
    "writing",
    // Free providers get the same instructions as one prompt.
    { prompt: `${system}\n\n${user}`, claude: { system, user, maxTokens: 10_000 } },
    opts.signal,
    { callTimeoutMs: CALL_TIMEOUT_MS, userId: job.userId },
  );
  const text = plainText(result.text);
  if (!text) throw new Error("The AI answered with no text: try again.");
  const data = { text, instructions: input.instructions, resumeId: resume ? resumeId : null, model: result.model.slice(0, 160), edited: false };
  const draft = await prisma.draft.upsert({
    where: { jobId_kind: { jobId, kind } },
    create: { jobId, userId: job.userId, kind, ...data },
    update: data,
  });
  return { draft, costUsd: result.costUsd ?? null };
}

// ── Saving by hand ──────────────────────────────────────────────────────────

/** A draft saved by hand (only the text), or put back as it was by Undo (every field). */
export type DraftInput = { text: string; instructions?: string | null; resumeId?: number | null; model?: string | null; edited?: boolean };

export function parseDraftInput(raw: unknown): DraftInput | string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "Expected an object";
  const r = raw as Record<string, unknown>;
  if (typeof r.text !== "string" || !r.text.trim()) return "text is required";
  const out: DraftInput = { text: r.text.replace(/\r\n/g, "\n").trim().slice(0, MAX_TEXT) };
  if ("instructions" in r) {
    if (r.instructions !== null && typeof r.instructions !== "string") return "instructions must be text";
    out.instructions = typeof r.instructions === "string" ? r.instructions.trim().slice(0, MAX_INSTRUCTIONS) || null : null;
  }
  if ("resumeId" in r) {
    if (r.resumeId !== null && !(Number.isInteger(r.resumeId) && (r.resumeId as number) > 0)) return "resumeId must be a resume's id or null";
    out.resumeId = r.resumeId as number | null;
  }
  if ("model" in r) {
    if (r.model !== null && typeof r.model !== "string") return "model must be text";
    out.model = typeof r.model === "string" ? r.model.slice(0, 160) || null : null;
  }
  if ("edited" in r) {
    if (typeof r.edited !== "boolean") return "edited must be true or false";
    out.edited = r.edited;
  }
  return out;
}

/** Saves the job's draft of this kind (made when there is none); null when the job is not in scope. */
export async function saveDraft(jobId: number, kind: DraftKind, input: DraftInput, scope: Scope = {}): Promise<DraftRow | null> {
  const job = await prisma.scrapedJob.findFirst({ where: { id: jobId, ...scope }, select: { userId: true } });
  if (!job) return null;
  await draftsReady();
  // Only one of the job's user's resumes.
  let resumeId = input.resumeId;
  if (resumeId != null && !(await prisma.resume.findFirst({ where: { id: resumeId, userId: job.userId }, select: { id: true } }))) {
    resumeId = null;
  }
  const data = {
    text: input.text,
    edited: input.edited ?? true,
    ...(input.instructions !== undefined ? { instructions: input.instructions } : {}),
    ...(resumeId !== undefined ? { resumeId } : {}),
    ...(input.model !== undefined ? { model: input.model } : {}),
  };
  return prisma.draft.upsert({
    where: { jobId_kind: { jobId, kind } },
    create: { jobId, userId: job.userId, kind, ...data },
    update: data,
  });
}

/** Whether the job had a draft of this kind to delete; null when the job is not in scope. */
export async function deleteDraft(jobId: number, kind: DraftKind, scope: Scope = {}): Promise<boolean | null> {
  if (!(await prisma.scrapedJob.findFirst({ where: { id: jobId, ...scope }, select: { id: true } }))) return null;
  await draftsReady();
  return (await prisma.draft.deleteMany({ where: { jobId, kind } })).count > 0;
}
