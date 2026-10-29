import { prisma } from "./prisma";
import { generateForTask } from "./llmClient";
import { getProfile } from "./profile";
import { profileSummary } from "./profileModel";

// Drafting answers for application-form questions (the extension's autofill).
// A saved answer whose question is close enough is reused as-is; the rest go
// to the "Form answers" route in one call. The model may only use profile
// facts and saved answers — when it cannot answer truthfully it says so
// (needsUser) instead of guessing.

export type QuestionKind = "text" | "textarea" | "select" | "radio";

export type QuestionIn = {
  id: string;
  label: string;
  kind: QuestionKind;
  options?: string[];
  maxLength?: number | null;
  required?: boolean;
};

export type AnswerOut = { id: string; answer: string; source: "bank" | "ai"; needsUser: boolean };

export type JobContext = { title?: string; company?: string; url?: string; text?: string };

const STOP = new Set(["the", "and", "you", "your", "are", "for", "with", "this", "that", "our", "what", "have", "will", "can", "please", "any", "about", "why", "how", "does", "did", "would"]);

function words(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

// Jaccard overlap of the meaningful words of two questions.
export function questionSimilarity(a: string, b: string): number {
  const A = words(a);
  const B = words(b);
  if (A.size === 0 || B.size === 0) return 0;
  let both = 0;
  for (const w of A) if (B.has(w)) both++;
  return both / (A.size + B.size - both);
}

function fit(text: string, maxLength?: number | null): string {
  if (!maxLength || text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n"));
  return (end > maxLength * 0.6 ? cut.slice(0, end + 1) : cut).trim();
}

const ANSWER_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["answers"],
  properties: {
    answers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "answer", "needsUser"],
        properties: {
          id: { type: "string" },
          answer: { type: "string", description: "The answer text, or an option copied verbatim for choice questions; empty when it cannot be answered truthfully" },
          needsUser: { type: "boolean", description: "true when the candidate must answer this themselves" },
        },
      },
    },
  },
};

const RULES = `You draft answers to job-application form questions for the candidate described below, writing in the first person as the candidate.
Rules:
- Use ONLY facts from the candidate profile and the saved answers. Never invent employers, dates, degrees, numbers, skills or opinions the candidate has not stated.
- When a question cannot be answered truthfully from those facts, return an empty answer with needsUser = true.
- Choice questions (select / radio): answer with exactly one of the listed options, copied verbatim — or empty with needsUser = true when none fits.
- Respect maxLength (characters) when given. Short questions get a short answer (a phrase or one sentence). Open questions (motivation, cover letter, "tell us about…") get 80–180 words unless maxLength is smaller.
- Tailor motivation answers to the company and role in the job context, staying factual.
- Plain text only: no markdown, no placeholders like [Company].`;

// Answers come from the user's own answer bank and profile.
export async function draftAnswers(
  userId: number,
  questions: QuestionIn[],
  job: JobContext,
  signal?: AbortSignal,
): Promise<AnswerOut[]> {
  const list = questions.slice(0, 40);
  const bank = await prisma.savedAnswer.findMany({ where: { userId }, orderBy: { uses: "desc" }, take: 300 }).catch(() => []);
  const results = new Map<string, AnswerOut>();
  const forAi: QuestionIn[] = [];
  const reused: number[] = [];

  for (const q of list) {
    const best = bank
      .map((b) => ({ b, s: questionSimilarity(q.label, b.question) }))
      .sort((x, y) => y.s - x.s)[0];
    if (best && best.s >= 0.6 && (q.kind === "text" || q.kind === "textarea")) {
      results.set(q.id, { id: q.id, answer: fit(best.b.answer, q.maxLength), source: "bank", needsUser: false });
      reused.push(best.b.id);
    } else {
      forAi.push(q);
    }
  }
  if (reused.length) {
    await prisma.savedAnswer
      .updateMany({ where: { userId, id: { in: reused } }, data: { uses: { increment: 1 } } })
      .catch(() => {});
  }

  if (forAi.length) {
    const profile = await getProfile(userId);
    const examples = bank
      .slice(0, 8)
      .map((b) => `Q: ${b.question}\nA: ${b.answer.slice(0, 600)}`)
      .join("\n\n");
    const system = `${RULES}

==================== CANDIDATE PROFILE ====================
${profileSummary(profile, { includeContact: true }) || "(empty profile)"}
${examples ? `\n==================== SAVED ANSWERS (the candidate's own words) ====================\n${examples}\n` : ""}`;
    const questionsJson = JSON.stringify(
      forAi.map((q) => ({
        id: q.id,
        question: q.label,
        type: q.kind,
        ...(q.options?.length ? { options: q.options.slice(0, 40) } : {}),
        ...(q.maxLength ? { maxLength: q.maxLength } : {}),
      })),
      null,
      1,
    );
    const user = `Job: ${job.title || "?"} at ${job.company || "?"}${job.url ? ` (${job.url})` : ""}
${job.text ? `Job description (excerpt):\n${job.text.slice(0, 5000)}\n` : ""}
Questions:
${questionsJson}

Return one answer per question id.`;
    const result = await generateForTask(
      "answers",
      {
        // Free providers get the same instructions as one prompt.
        prompt: `${system}\n\n${user}\n\nReturn ONLY a JSON object: {"answers":[{"id":string,"answer":string,"needsUser":boolean}]}`,
        claude: { system, user, jsonSchema: ANSWER_SCHEMA, maxTokens: 8000 },
      },
      signal,
      { callTimeoutMs: 50_000, userId },
    );
    const text = result.text;
    let parsed: { answers?: { id?: unknown; answer?: unknown; needsUser?: unknown }[] } = {};
    try {
      const start = text.indexOf("{");
      parsed = JSON.parse(start >= 0 ? text.slice(start, text.lastIndexOf("}") + 1) : text);
    } catch {
      parsed = {};
    }
    for (const a of parsed.answers ?? []) {
      const q = forAi.find((x) => x.id === String(a.id));
      if (!q) continue;
      let answer = typeof a.answer === "string" ? a.answer.trim() : "";
      // A choice answer must be one of the options, else the user picks.
      if ((q.kind === "select" || q.kind === "radio") && answer && q.options?.length) {
        const match = q.options.find((o) => o.trim().toLowerCase() === answer.toLowerCase());
        answer = match ?? "";
      }
      results.set(q.id, {
        id: q.id,
        answer: fit(answer, q.maxLength),
        source: "ai",
        needsUser: a.needsUser === true || !answer,
      });
    }
  }

  return list.map((q) => results.get(q.id) ?? { id: q.id, answer: "", source: "ai", needsUser: true });
}

// Keep the answers the user actually submitted: update a close match in the
// bank, else add a new entry.
export async function rememberAnswers(userId: number, pairs: { question: string; answer: string }[]): Promise<number> {
  const clean = pairs
    .map((p) => ({ question: p.question.trim().slice(0, 1000), answer: p.answer.trim().slice(0, 8000) }))
    .filter((p) => p.question && p.answer)
    .slice(0, 40);
  if (!clean.length) return 0;
  const bank = await prisma.savedAnswer.findMany({ where: { userId }, select: { id: true, question: true } });
  let saved = 0;
  for (const p of clean) {
    const best = bank.map((b) => ({ b, s: questionSimilarity(p.question, b.question) })).sort((x, y) => y.s - x.s)[0];
    if (best && best.s >= 0.8) {
      await prisma.savedAnswer.update({ where: { id: best.b.id }, data: { answer: p.answer, uses: { increment: 1 } } });
    } else {
      const created = await prisma.savedAnswer.create({ data: { userId, question: p.question, answer: p.answer, uses: 1 } });
      bank.push({ id: created.id, question: created.question });
    }
    saved++;
  }
  return saved;
}
