import { prisma } from "./prisma";
import { generateForTask, LLMRateLimitedError, type LLMRequest } from "./llmClient";
import { getConfig } from "./config";
import { DEFAULT_ANALYSIS_PROMPT } from "./defaultPrompt";
import { profileForMatching } from "./profile";
import { profileSummary, type CandidateProfile } from "./profileModel";
import { getUserSettings, promptLocation, promptMarket } from "./userSettings";

export type AnalysisResult = {
  approved: boolean;
  score: number;
  reason: string;
  techStack: string[];
  /** Where the employer can hire (worldwide, europe, emea, americas, specific, unclear); null if not given. */
  eligibility?: string | null;
  /** When false, extension should not click "Not interested" (e.g. AI provider outage). */
  linkedInDismiss?: boolean;
};

// The default prompt lives in lib/defaultPrompt.ts (shared with the admin UI and /api/setup).

export const ELIGIBILITY_VALUES = ["worldwide", "europe", "emea", "americas", "specific", "unclear"] as const;

function coerceEligibility(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return (ELIGIBILITY_VALUES as readonly string[]).includes(s) ? s : null;
}

type PromptConfig = {
  targetMarket: string;
  currentLocation: string;
  jobAnalysisPrompt: string;
  /** The candidate profile, when "use my profile when judging jobs" is on. */
  profile?: CandidateProfile | null;
};

// What one user's jobs are judged against: their location, target market,
// prompt and (when turned on) profile.
export async function promptConfigFor(userId: number): Promise<PromptConfig> {
  const settings = await getUserSettings(userId);
  let profile: CandidateProfile | null = null;
  try {
    profile = await profileForMatching(userId);
  } catch {
    // profile unavailable — judge without it
  }
  return {
    targetMarket: promptMarket(settings),
    currentLocation: promptLocation(settings),
    jobAnalysisPrompt: settings.jobAnalysisPrompt,
    profile,
  };
}

// The profile only nudges the score; the hard reject rules always win.
function profileBlock(profile: CandidateProfile | null | undefined): string {
  if (!profile) return "";
  return `==================== CANDIDATE PROFILE ====================
${profileSummary(profile)}

Use the profile as SOFT signals only — never to override a hard reject rule:
S5. Strong overlap between the job's core stack / seniority and the candidate's skills and experience → positive.
S6. Role clearly far more senior than the candidate's experience, or a core required technology the candidate lacks → negative.

`;
}

// Insert the profile block into a single-job template: at {{CANDIDATE_PROFILE}}
// when the template has it, else just before the hard reject rules.
function withProfile(template: string, profile: CandidateProfile | null | undefined): string {
  const block = profileBlock(profile);
  if (template.includes("{{CANDIDATE_PROFILE}}")) return template.replace(/\{\{CANDIDATE_PROFILE\}\}/g, block);
  if (!block) return template;
  const at = template.search(/={3,}\s*HARD REJECT RULES/i);
  return at === -1 ? `${block}${template}` : `${template.slice(0, at)}${block}${template.slice(at)}`;
}

function buildPrompt(
  job: { title: string; company: string; location: string | null; description: string | null },
  config: PromptConfig,
): string {
  const template = withProfile(config.jobAnalysisPrompt || DEFAULT_ANALYSIS_PROMPT, config.profile);
  return template
    .replace(/\{\{JOB_TITLE\}\}/g, job.title)
    .replace(/\{\{COMPANY\}\}/g, job.company)
    .replace(/\{\{LOCATION\}\}/g, job.location || "Not specified")
    .replace(/\{\{DESCRIPTION\}\}/g, (job.description || "No description available").substring(0, 6000))
    .replace(/\{\{TARGET_MARKET\}\}/g, config.targetMarket)
    .replace(/\{\{CURRENT_LOCATION\}\}/g, config.currentLocation);
}

// Small models sometimes answer "approved":"false" (a string), which !!value
// reads as true. Only a real true / "true" / "yes" / 1 counts as approved.
function coerceApproved(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") return ["true", "yes", "1"].includes(v.trim().toLowerCase());
  return false;
}

function parseAIResponse(text: string): AnalysisResult {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      approved: coerceApproved(parsed.approved),
      score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
      reason: String(parsed.reason || ""),
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack.map(String) : [],
      eligibility: coerceEligibility(parsed.eligibility),
    };
  } catch {
    return { approved: false, score: 0, reason: "Failed to parse AI response", techStack: [] };
  }
}

// ----------------------------------------------------------------------------
// Batched analysis. On the OpenRouter free tier (~20 req/min, ~50 req/day) the
// bottleneck is the NUMBER of requests, not their latency — adding parallelism
// cannot beat 20 req/min. Packing 8–12 jobs into one prompt turns an 80-job
// backlog into ~10 calls instead of 80, which is what makes a full run both
// finish (under the daily cap) and finish fast.
// ----------------------------------------------------------------------------

type PendingJobRow = {
  id: number;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
};

// Per-job description budget inside a batched prompt. Tighter than the 6000
// used for single-job analysis so a 5-job batch lands at ~18k chars total —
// small enough for a free model to finish well inside the abort deadline, and
// large enough to keep the role / location / remote signals that drive almost
// every verdict (they cluster in the first 1500–2000 chars of a job posting).
const BATCH_DESCRIPTION_LIMIT = 3000;

// Pull the rules + rubric out of an analysis-prompt template so the batch
// prompt reuses the exact criteria the single-job path uses. Falls back to the
// default template if a customised prompt dropped the section markers.
function extractRulesCore(template: string): string {
  const slice = (t: string): string | null => {
    const start = t.search(/={3,}\s*HARD REJECT RULES/i);
    const end = t.search(/={3,}\s*OUTPUT CONTRACT/i);
    if (start !== -1 && end !== -1 && end > start) return t.slice(start, end).trim();
    return null;
  };
  return slice(template) ?? slice(DEFAULT_ANALYSIS_PROMPT) ?? DEFAULT_ANALYSIS_PROMPT;
}

function buildBatchPrompt(jobs: PendingJobRow[], config: PromptConfig): string {
  const rules = extractRulesCore(config.jobAnalysisPrompt || DEFAULT_ANALYSIS_PROMPT)
    .replace(/\{\{TARGET_MARKET\}\}/g, config.targetMarket)
    .replace(/\{\{CURRENT_LOCATION\}\}/g, config.currentLocation);

  const jobBlocks = jobs
    .map((j) => {
      const desc = (j.description || "No description available").substring(0, BATCH_DESCRIPTION_LIMIT);
      return `### JOB id=${j.id}\nJOB_TITLE: ${j.title}\nCOMPANY: ${j.company}\nLOCATION: ${j.location || "Not specified"}\nDESCRIPTION:\n${desc}`;
    })
    .join("\n\n");

  return `You are a strict job-suitability classifier for a software developer based in ${config.currentLocation} who is targeting ${config.targetMarket} positions.

You will be given ${jobs.length} job postings. Analyze EACH ONE INDEPENDENTLY against the rules below — a verdict on one job must never influence another.

${rules}

${profileBlock(config.profile)}==================== INPUT — ${jobs.length} JOBS ====================
${jobBlocks}
================================================

==================== OUTPUT CONTRACT ====================
Return ONE JSON array and NOTHING ELSE.
- No markdown, no code fences (no \`\`\`), no preamble, no commentary.
- The array MUST contain exactly ${jobs.length} objects — one per job above.
- Each object schema (every key required, exact types):
  {"id": integer, "approved": boolean, "score": integer, "reason": string, "techStack": string[], "eligibility": string}
- "id" MUST equal the id= value of the job it judges; never invent or omit an id.
- "eligibility" is where the employer can hire for the role: one of "worldwide", "europe", "emea", "americas", "specific" (named countries only) or "unclear".
- Use lowercase booleans (true / false).
- "reason" is ONE sentence under 240 characters citing the rule(s) that drove the decision.
- "techStack" is an array of bare technology names found in that job's description; empty array if none.
- approved=true ONLY when score >= 60.

Example for two jobs with ids 11 and 12:
[{"id":11,"approved":false,"score":18,"reason":"R1: Account Manager role, not a software position.","techStack":[],"eligibility":"unclear"},{"id":12,"approved":true,"score":82,"reason":"Remote worldwide backend role; European company; Go + Postgres stack.","techStack":["Go","Postgres"],"eligibility":"worldwide"}]

Now analyze all ${jobs.length} jobs and output ONLY the JSON array.`;
}

// ----------------------------------------------------------------------------
// Claude prompts. Claude gets the same rules, split so the stable part (role,
// rules, output guidance) is a cacheable system prompt and only the job(s) go
// in the user turn. Structured outputs enforce the verdict schema, so the
// response always parses.
// ----------------------------------------------------------------------------

const VERDICT_PROPERTIES = {
  approved: { type: "boolean", description: "true only when score is 60 or higher" },
  score: { type: "integer", description: "0-100 suitability score" },
  reason: { type: "string", description: "One sentence under 240 characters citing the rule(s) that drove the decision" },
  techStack: {
    type: "array",
    items: { type: "string" },
    description: "Bare technology names found in the description; empty if none",
  },
  eligibility: {
    type: "string",
    enum: ["worldwide", "europe", "emea", "americas", "specific", "unclear"],
    description: "Where the employer can hire for this role",
  },
};

export const SINGLE_VERDICT_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: VERDICT_PROPERTIES,
  required: ["approved", "score", "reason", "techStack", "eligibility"],
  additionalProperties: false,
};

export const BATCH_VERDICT_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    verdicts: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "integer", description: "The id= value of the job this verdict judges" }, ...VERDICT_PROPERTIES },
        required: ["id", "approved", "score", "reason", "techStack", "eligibility"],
        additionalProperties: false,
      },
    },
  },
  required: ["verdicts"],
  additionalProperties: false,
};

export function buildClaudeSystemPrompt(config: PromptConfig): string {
  const rules = extractRulesCore(config.jobAnalysisPrompt || DEFAULT_ANALYSIS_PROMPT)
    .replace(/\{\{TARGET_MARKET\}\}/g, config.targetMarket)
    .replace(/\{\{CURRENT_LOCATION\}\}/g, config.currentLocation);
  return `You are a strict job-suitability classifier for a software developer based in ${config.currentLocation} who is targeting ${config.targetMarket} positions.

You are given one or more job postings. Judge each one independently against the rules below — a verdict on one job must never influence another.

${rules}

${profileBlock(config.profile)}==================== OUTPUT ====================
- "approved" is true ONLY when "score" is 60 or higher.
- "eligibility" is where the employer can hire for the role: "worldwide", "europe", "emea", "americas", "specific" (named countries only) or "unclear".
- "reason" is ONE sentence under 240 characters citing the specific rule(s) that drove the decision.
- "techStack" lists the bare technology names found in the description; an empty array if none or not a software role.`;
}

function jobBlock(job: { title: string; company: string; location: string | null; description: string | null }, limit: number): string {
  const desc = (job.description || "No description available").substring(0, limit);
  return `JOB_TITLE: ${job.title}\nCOMPANY: ${job.company}\nLOCATION: ${job.location || "Not specified"}\nDESCRIPTION:\n${desc}`;
}

function buildSingleRequest(
  job: { title: string; company: string; location: string | null; description: string | null },
  config: PromptConfig,
): LLMRequest {
  return {
    prompt: buildPrompt(job, config),
    claude: {
      system: buildClaudeSystemPrompt(config),
      user: `Judge this job posting.\n\n${jobBlock(job, 6000)}`,
      jsonSchema: SINGLE_VERDICT_SCHEMA,
      maxTokens: 4000,
    },
  };
}

function buildBatchRequest(jobs: PendingJobRow[], config: PromptConfig): LLMRequest {
  const blocks = jobs.map((j) => `### JOB id=${j.id}\n${jobBlock(j, BATCH_DESCRIPTION_LIMIT)}`).join("\n\n");
  return {
    prompt: buildBatchPrompt(jobs, config),
    claude: {
      system: buildClaudeSystemPrompt(config),
      user: `Judge these ${jobs.length} job postings. Return exactly ${jobs.length} verdicts — one per job, each carrying the id= value of the job it judges.\n\n${blocks}`,
      jsonSchema: BATCH_VERDICT_SCHEMA,
      maxTokens: 8000,
    },
  };
}

// A single parsed verdict, preserving the model's own `id` when it supplied a
// usable one. `id` is null when the element had no integer id — the caller
// then falls back to positional matching.
type ParsedVerdict = { id: number | null; verdict: AnalysisResult };

// Pull the JSON array of verdicts out of a model response. Small instruct
// models are sloppy about the OUTPUT CONTRACT — they wrap the array in
// ```json fences, add a "Here are the results:" preamble, or nest it under a
// key like {"results":[...]}. Extracting the first balanced [...] (ignoring
// brackets inside strings) survives all of those, where a greedy
// /\[[\s\S]*\]/ would grab too much and fail to parse.
function extractJsonArray(text: string): string | null {
  // Drop code fences so a ```json … ``` wrapper doesn't confuse the scanner.
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("[");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  // No matching close bracket — the response was truncated mid-array. Salvage
  // what we can by closing it after the last complete object.
  const lastObjEnd = cleaned.lastIndexOf("}");
  if (lastObjEnd > start) return cleaned.slice(start, lastObjEnd + 1) + "]";
  return null;
}

function toVerdict(el: any): AnalysisResult {
  return {
    approved: coerceApproved(el?.approved),
    score: Math.min(100, Math.max(0, Number(el?.score) || 0)),
    reason: String(el?.reason || ""),
    techStack: Array.isArray(el?.techStack) ? el.techStack.map(String) : [],
    eligibility: coerceEligibility(el?.eligibility),
  };
}

// Parse the model's JSON array into an ORDERED list of verdicts. Each carries
// the model's own id when it gave a valid integer, else null. Order is
// preserved so the caller can match by position when ids are unreliable.
function parseBatchVerdicts(text: string): ParsedVerdict[] {
  const slice = extractJsonArray(text);
  if (!slice) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(slice);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return (arr as any[]).map((el) => {
    const n = Number(el?.id);
    return { id: Number.isInteger(n) ? n : null, verdict: toVerdict(el) };
  });
}

// Map an ordered list of parsed verdicts onto `count` jobs that were sent in
// positional order with ids 1..count. Tries the model's ids first, then falls
// back to array position. This is the crux of the analyze fix: small models
// frequently RENUMBER the jobs (1..N) or drop the arbitrary database ids we
// put in the prompt, so matching purely on echoed ids returned zero verdicts
// and left every job PENDING ("AI returned no usable verdicts"). Sending small
// 1..N ids and accepting a positional fallback makes a verdict land regardless.
function matchVerdictsByPosition(
  parsed: ParsedVerdict[],
  count: number,
): Map<number, AnalysisResult> {
  const byPos = new Map<number, AnalysisResult>();
  const byId = new Map<number, AnalysisResult>();
  for (const p of parsed) {
    if (p.id != null && p.id >= 1 && p.id <= count && !byId.has(p.id)) {
      byId.set(p.id, p.verdict);
    }
  }
  const canFallBackByOrder = parsed.length === count;
  for (let pos = 0; pos < count; pos++) {
    const oneBased = pos + 1;
    let v = byId.get(oneBased);
    if (!v && canFallBackByOrder) v = parsed[pos].verdict;
    if (v) byPos.set(pos, v);
  }
  return byPos;
}

export type AnalyzeJobOptions = {
  /**
   * Approve only at or above this score. Used for LinkedIn Easy Apply jobs,
   * which get far more applicants, so a stricter bar can make sense.
   */
  minScore?: number;
  minScoreLabel?: string;
};

export async function analyzeJob(
  jobId: number,
  signal?: AbortSignal,
  options: AnalyzeJobOptions = {},
): Promise<AnalysisResult> {
  // atomic check: only analyze if still PENDING (prevents double-analysis race condition)
  const updated = await prisma.scrapedJob.updateMany({
    where: { id: jobId, status: "PENDING" },
    data: { status: "PENDING" },
  });
  if (updated.count === 0) {
    const existing = await prisma.scrapedJob.findUnique({ where: { id: jobId } });
    if (!existing) throw new Error(`Job ${jobId} not found`);
    return {
      approved: existing.status === "APPROVED",
      score: existing.aiScore || 0,
      reason: existing.aiReason || "Already analyzed",
      techStack: existing.techStack?.split(", ") || [],
    };
  }

  const job = await prisma.scrapedJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);

  // skip jobs with no useful description (waste of tokens)
  if (!job.description || job.description.trim().length < 50) {
    await prisma.scrapedJob.update({
      where: { id: jobId },
      data: { status: "REJECTED", aiScore: 0, aiReason: "No description available for analysis" },
    });
    await prisma.analysisLog.create({
      data: {
        scrapedJobId: jobId,
        model: "skipped",
        approved: false,
        score: 0,
        reason: "No description available for analysis",
        tokensUsed: 0,
        durationMs: 0,
      },
    });
    return { approved: false, score: 0, reason: "No description available for analysis", techStack: [] };
  }

  const config = await promptConfigFor(job.userId);
  const startTime = Date.now();

  let llmResult: { text: string; model: string; tokensUsed: number };
  try {
    // 25s per provider attempt leaves room for a second provider inside the
    // extension route's 60s function limit.
    llmResult = await generateForTask("extension", buildSingleRequest(job, config), signal, {
      callTimeoutMs: 25_000,
      userId: job.userId,
    });
  } catch (err: any) {
    // Rate-limit / quota errors are surfaced to the caller without marking the
    // job REJECTED — the row stays PENDING so the next batch can retry once
    // the provider window resets.
    // The caller's deadline (e.g. the extension route's 60s limit) is not a
    // verdict either — keep the job PENDING.
    if (err instanceof LLMRateLimitedError || err?.message === "LLM call aborted") {
      throw err;
    }
    const raw = err?.message ?? String(err);
    const logReason = raw.length > 4000 ? raw.slice(0, 4000) : raw;
    const reason =
      raw.length > 700 ? `[analysis failed] ${raw.slice(0, 700)}…` : `[analysis failed] ${raw}`;
    const durationMs = Date.now() - startTime;
    console.error(`[analyzeJob] LLM failed jobId=${jobId}: ${raw}`);
    const u = await prisma.scrapedJob.updateMany({
      where: { id: jobId },
      data: {
        status: "REJECTED",
        aiScore: 0,
        aiReason: reason,
        techStack: null,
      },
    });
    if (u.count > 0) {
      await prisma.analysisLog.create({
        data: {
          scrapedJobId: jobId,
          model: "error",
          approved: false,
          score: 0,
          reason: logReason,
          tokensUsed: 0,
          durationMs,
        },
      });
    }
    return {
      approved: false,
      score: 0,
      reason,
      techStack: [],
      linkedInDismiss: false,
    };
  }

  const result = parseAIResponse(llmResult.text);
  const minScore = options.minScore ?? 0;
  if (result.approved && minScore > 0 && result.score < minScore) {
    result.approved = false;
    result.reason = `${result.reason} [${options.minScoreLabel || "Minimum score"}: ${result.score} is below ${minScore}]`.trim();
  }
  const durationMs = Date.now() - startTime;

  await prisma.scrapedJob.update({
    where: { id: jobId },
    data: {
      status: result.approved ? "APPROVED" : "REJECTED",
      aiScore: result.score,
      aiReason: result.reason,
      techStack: result.techStack.length > 0 ? result.techStack.join(", ") : null,
      eligibility: result.eligibility ?? null,
    },
  });

  await prisma.analysisLog.create({
    data: {
      scrapedJobId: jobId,
      model: llmResult.model,
      approved: result.approved,
      score: result.score,
      reason: result.reason,
      tokensUsed: llmResult.tokensUsed,
      durationMs,
    },
  });

  return result;
}

export type AnalyzeBatchOptions = {
  /** Hard cap on jobs fetched in this invocation. */
  limit?: number;
  /** Bail out once we're this close to the function deadline (ms). */
  timeBudgetMs?: number;
  /** Override the configured inter-request delay (ms). 0 disables pacing. */
  requestDelayMs?: number;
  /** Override how many jobs are packed into one LLM call. */
  batchSize?: number;
  /** Only analyze these job ids (still only while they are PENDING). */
  onlyIds?: number[];
  /** Only this user's jobs; all users when omitted. */
  userId?: number;
};

// Leave at least this much wall-clock for the response + post-batch sheets
// sync. Without this floor a slow LLM call can push the function past Vercel's
// 60s cap and the user sees a generic FUNCTION_INVOCATION_TIMEOUT instead of a
// graceful "batch partial, click again" message. 6s comfortably covers the
// Prisma updateMany + sheets append on a typical 5-job batch; the previous 12s
// was overcautious and stole that much LLM time from every run.
const HEADROOM_MS = 6_000;
// Refuse to start a new batched LLM call without at least this much working
// time before the kill-timer. A 5-job batch (≤18k-char prompt, JSON array out)
// typically lands in 5–12s on a fast-priority free model; this floor stops us
// from starting one we cannot finish before the abort fires.
const MIN_BATCH_BUDGET_MS = 14_000;

async function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return;
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(t);
          resolve();
        },
        { once: true },
      );
    }
  });
}

/**
 * Analyze one chunk of jobs with a SINGLE LLM call. Jobs with no usable
 * description are rejected locally (no tokens spent). Jobs the model omits
 * from its response are left PENDING and picked up on a later pass. A
 * LLMRateLimitedError is allowed to propagate so the caller can stop cleanly.
 */
async function analyzeBatch(
  jobs: PendingJobRow[],
  config: PromptConfig,
  userId: number,
  signal?: AbortSignal,
): Promise<{ approved: number; rejected: number; resolved: number; unresolved: number }> {
  let approved = 0;
  let rejected = 0;
  let resolved = 0;

  // No-description jobs never reach the LLM — same rule as the single-job path.
  const needsLlm: PendingJobRow[] = [];
  for (const job of jobs) {
    if (!job.description || job.description.trim().length < 50) {
      const u = await prisma.scrapedJob.updateMany({
        where: { id: job.id, status: "PENDING" },
        data: { status: "REJECTED", aiScore: 0, aiReason: "No description available for analysis" },
      });
      if (u.count > 0) {
        await prisma.analysisLog.create({
          data: {
            scrapedJobId: job.id,
            model: "skipped",
            approved: false,
            score: 0,
            reason: "No description available for analysis",
            tokensUsed: 0,
            durationMs: 0,
          },
        });
        rejected++;
        resolved++;
      }
    } else {
      needsLlm.push(job);
    }
  }

  if (needsLlm.length === 0) {
    return { approved, rejected, resolved, unresolved: 0 };
  }

  // Send the model small positional ids (1..N) rather than the real database
  // ids. The model only has to echo 1..N, and even if it renumbers or drops
  // them we recover the verdict by array position — see matchVerdictsByPosition.
  const promptRows: PendingJobRow[] = needsLlm.map((job, i) => ({
    id: i + 1,
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
  }));
  const startTime = Date.now();
  const llmResult = await generateForTask("scan", buildBatchRequest(promptRows, config), signal, { userId });
  const durationMs = Date.now() - startTime;
  const verdicts = matchVerdictsByPosition(
    parseBatchVerdicts(llmResult.text),
    needsLlm.length,
  );

  // One call covers the whole chunk — split its cost across the per-job logs.
  const perJobDuration = Math.round(durationMs / needsLlm.length);
  const perJobTokens = Math.round((llmResult.tokensUsed || 0) / needsLlm.length);

  let unresolved = 0;
  for (let pos = 0; pos < needsLlm.length; pos++) {
    const job = needsLlm[pos];
    const v = verdicts.get(pos);
    if (!v) {
      unresolved++; // model dropped this job — leave PENDING for the next pass
      continue;
    }
    const u = await prisma.scrapedJob.updateMany({
      where: { id: job.id, status: "PENDING" },
      data: {
        status: v.approved ? "APPROVED" : "REJECTED",
        aiScore: v.score,
        aiReason: v.reason,
        techStack: v.techStack.length > 0 ? v.techStack.join(", ") : null,
        eligibility: v.eligibility ?? null,
      },
    });
    if (u.count === 0) continue; // already analyzed by a concurrent run
    await prisma.analysisLog.create({
      data: {
        scrapedJobId: job.id,
        model: llmResult.model,
        approved: v.approved,
        score: v.score,
        reason: v.reason,
        tokensUsed: perJobTokens,
        durationMs: perJobDuration,
      },
    });
    if (v.approved) approved++;
    else rejected++;
    resolved++;
  }

  return { approved, rejected, resolved, unresolved };
}

export async function analyzeAllPending(options: AnalyzeBatchOptions = {}): Promise<{
  analyzed: number;
  approved: number;
  rejected: number;
  skipped: number;
  remaining: number;
  timedOut: boolean;
  rateLimited?: boolean;
  rateLimitReason?: string;
  retryAfterMs?: number;
  batchError?: string;
}> {
  const config = await getConfig();
  const batchSize = Math.min(12, Math.max(1, options.batchSize ?? config.analyzerBatchSize));
  // Vercel caps this route at 60s. Keep 48s of working budget so there is
  // always headroom to return a response and run the post-batch sheets sync.
  const budgetMs = Math.max(5_000, options.timeBudgetMs ?? 48_000);
  // Fetch enough rows for several chunks; the wall-clock budget is the real
  // stop. The admin UI loops the route until remaining = 0.
  const fetchLimit = Math.min(60, Math.max(batchSize, options.limit ?? batchSize * 4));
  const requestDelayMs = Math.max(0, options.requestDelayMs ?? config.analyzerRequestDelayMs);
  const startedAt = Date.now();
  // Latest moment we may still be running an LLM call. Used both for the hard
  // abort timer and the per-chunk go/no-go check so the two never disagree.
  const deadline = budgetMs - HEADROOM_MS;

  const batchController = new AbortController();
  // Hard kill the in-flight LLM call once we're inside the headroom window.
  const killTimer = setTimeout(() => batchController.abort(), Math.max(1_000, deadline));

  const scope = options.userId != null ? { userId: options.userId } : {};
  const pending = await prisma.scrapedJob.findMany({
    where: { status: "PENDING", ...scope, ...(options.onlyIds ? { id: { in: options.onlyIds } } : {}) },
    orderBy: { createdAt: "asc" },
    take: fetchLimit,
  });

  // A batch is judged against one user's search options, so chunk each user's
  // jobs separately (oldest first within each user).
  const chunks: { userId: number; jobs: typeof pending }[] = [];
  const byUser = new Map<number, typeof pending>();
  for (const job of pending) {
    const list = byUser.get(job.userId) ?? [];
    list.push(job);
    byUser.set(job.userId, list);
  }
  for (const [userId, list] of byUser) {
    for (let i = 0; i < list.length; i += batchSize) chunks.push({ userId, jobs: list.slice(i, i + batchSize) });
  }
  const promptConfigs = new Map<number, PromptConfig>();

  let approved = 0;
  let rejected = 0;
  let analyzed = 0;
  let timedOut = false;
  let rateLimited = false;
  let rateLimitReason: string | undefined;
  let retryAfterMs: number | undefined;
  let batchError: string | undefined;

  try {
    for (let c = 0; c < chunks.length; c++) {
      // Only start a chunk if it has a full working window before the abort.
      if (deadline - (Date.now() - startedAt) < MIN_BATCH_BUDGET_MS) {
        timedOut = true;
        break;
      }
      const { userId, jobs: chunk } = chunks[c];
      let promptConfig = promptConfigs.get(userId);
      if (!promptConfig) {
        promptConfig = await promptConfigFor(userId);
        promptConfigs.set(userId, promptConfig);
      }
      try {
        const r = await analyzeBatch(chunk, promptConfig, userId, batchController.signal);
        approved += r.approved;
        rejected += r.rejected;
        analyzed += r.resolved;
        // A chunk that resolves nothing means the model failed outright
        // (garbage output, or aborted mid-flight). Retrying identical content
        // would just fail again — stop cleanly and leave the rows PENDING.
        if (r.resolved === 0) {
          batchError = "AI returned no usable verdicts for this batch";
          break;
        }
      } catch (err: any) {
        if (err instanceof LLMRateLimitedError) {
          rateLimited = true;
          rateLimitReason = err.message;
          retryAfterMs = err.retryAfterMs;
          break;
        }
        // Generic LLM / network failure: leave the whole chunk PENDING (never
        // mass-reject a batch over one transient outage) and stop.
        console.error(`analyzeBatch failed: ${err?.message || err}`);
        batchError = String(err?.message || err).slice(0, 300);
        break;
      }

      // Small courtesy pause between batched calls. With ~5 jobs per call this
      // is far under the free-tier 20 req/min ceiling.
      if (c + 1 < chunks.length && requestDelayMs > 0) {
        const left = deadline - (Date.now() - startedAt);
        if (left < MIN_BATCH_BUDGET_MS) {
          timedOut = true;
          break;
        }
        await delay(Math.min(requestDelayMs, left - MIN_BATCH_BUDGET_MS), batchController.signal);
      }
    }
  } finally {
    clearTimeout(killTimer);
  }

  const remaining = await prisma.scrapedJob.count({ where: { status: "PENDING", ...scope } });

  return {
    analyzed,
    approved,
    rejected,
    skipped: 0,
    remaining,
    timedOut,
    ...(rateLimited ? { rateLimited: true, rateLimitReason, retryAfterMs } : {}),
    ...(batchError ? { batchError } : {}),
  };
}

// ----------------------------------------------------------------------------
// Inline analysis for feed scans. Feed scanners call this on the jobs they
// just scraped, BEFORE anything is written to the database, so only checked
// (APPROVED / REJECTED) jobs are ever stored — never a raw PENDING list. Jobs
// the model could not classify in this run (rate limit, time budget spent, a
// dropped id) are simply absent from the returned map; the scanner does not
// store them and they are re-fetched on the next scan.
// ----------------------------------------------------------------------------

export type ScrapedJobInput = {
  title: string;
  company: string;
  location: string | null;
  description: string | null;
};

export type InlineVerdict = AnalysisResult & {
  model: string;
  tokensUsed: number;
  durationMs: number;
};

export type AnalyzeScrapedResult = {
  /** Verdicts keyed by the index of the job in the input array. */
  verdicts: Map<number, InlineVerdict>;
  rateLimited: boolean;
  timedOut: boolean;
  error?: string;
};

export async function analyzeScrapedJobs(
  jobs: ScrapedJobInput[],
  options: {
    /** Whose search options the jobs are judged against. */
    userId: number;
    batchSize?: number;
    timeBudgetMs?: number;
    requestDelayMs?: number;
    signal?: AbortSignal;
  },
): Promise<AnalyzeScrapedResult> {
  const verdicts = new Map<number, InlineVerdict>();
  if (jobs.length === 0) return { verdicts, rateLimited: false, timedOut: false };

  const config = await getConfig();
  const promptConfig = await promptConfigFor(options.userId);
  const batchSize = Math.min(12, Math.max(1, options.batchSize ?? config.analyzerBatchSize));
  const requestDelayMs = Math.max(0, options.requestDelayMs ?? config.analyzerRequestDelayMs);
  const budgetMs = options.timeBudgetMs;
  const signal = options.signal;
  const startedAt = Date.now();

  // No-description jobs never reach the LLM — rejected locally, the same rule
  // the single-job and DB-batched paths use.
  const needsLlm: { index: number; row: PendingJobRow }[] = [];
  jobs.forEach((job, index) => {
    if (!job.description || job.description.trim().length < 50) {
      verdicts.set(index, {
        approved: false,
        score: 0,
        reason: "No description available for analysis",
        techStack: [],
        model: "skipped",
        tokensUsed: 0,
        durationMs: 0,
      });
    } else {
      needsLlm.push({
        index,
        row: {
          id: index,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
        },
      });
    }
  });

  let rateLimited = false;
  let timedOut = false;
  let error: string | undefined;

  for (let i = 0; i < needsLlm.length; i += batchSize) {
    if (signal?.aborted) {
      timedOut = true;
      break;
    }
    if (budgetMs != null && budgetMs - (Date.now() - startedAt) < MIN_BATCH_BUDGET_MS) {
      timedOut = true;
      break;
    }

    const chunk = needsLlm.slice(i, i + batchSize);
    // Positional ids 1..chunkLen, mapped back to the caller's original job
    // index after matching — same robustness as the DB-batched path.
    const request = buildBatchRequest(
      chunk.map((c, j) => ({ ...c.row, id: j + 1 })),
      promptConfig,
    );
    const t0 = Date.now();
    let llmResult: { text: string; model: string; tokensUsed: number };
    try {
      llmResult = await generateForTask("scan", request, signal, { userId: options.userId });
    } catch (err: any) {
      if (err instanceof LLMRateLimitedError) {
        rateLimited = true;
        break;
      }
      error = String(err?.message || err).slice(0, 300);
      break;
    }

    const durationMs = Date.now() - t0;
    const matched = matchVerdictsByPosition(
      parseBatchVerdicts(llmResult.text),
      chunk.length,
    );
    const perJobDuration = Math.round(durationMs / chunk.length);
    const perJobTokens = Math.round((llmResult.tokensUsed || 0) / chunk.length);

    let resolved = 0;
    chunk.forEach((c, pos) => {
      const v = matched.get(pos);
      if (!v) return; // model dropped this job — left unstored for the next scan
      verdicts.set(c.index, {
        ...v,
        model: llmResult.model,
        tokensUsed: perJobTokens,
        durationMs: perJobDuration,
      });
      resolved++;
    });
    // A chunk that resolved nothing means the model failed outright — retrying
    // identical content would just fail again.
    if (resolved === 0) {
      error = "AI returned no usable verdicts for this batch";
      break;
    }

    if (i + batchSize < needsLlm.length && requestDelayMs > 0) {
      if (budgetMs != null && budgetMs - (Date.now() - startedAt) < MIN_BATCH_BUDGET_MS) {
        timedOut = true;
        break;
      }
      await delay(requestDelayMs, signal);
    }
  }

  return { verdicts, rateLimited, timedOut, error };
}

// ----------------------------------------------------------------------------
// Playground: judge a job with a given route WITHOUT touching the database
// (only the AI call itself is logged to AiUsage, as task "playground").
// ----------------------------------------------------------------------------

export type PlaygroundJob = {
  title: string;
  company: string;
  location: string | null;
  description: string | null;
};

export type PlaygroundResult = {
  verdict: AnalysisResult;
  raw: string;
  provider: string;
  model: string;
  tokensUsed: number;
  costUsd: number | null;
  durationMs: number;
};

export async function analyzeJobPreview(
  job: PlaygroundJob,
  options: {
    /** Whose search options to judge against. */
    userId: number;
    route?: import("./aiRoutes").AiRoute;
    task?: "scan" | "extension";
    signal?: AbortSignal;
  },
): Promise<PlaygroundResult> {
  const config = await promptConfigFor(options.userId);
  const startedAt = Date.now();
  const result = await generateForTask(options.task ?? "extension", buildSingleRequest(job, config), options.signal, {
    routeOverride: options.route,
    usageTask: "playground",
    callTimeoutMs: 30_000,
    userId: options.userId,
  });
  return {
    verdict: parseAIResponse(result.text),
    raw: result.text,
    provider: result.provider,
    model: result.model,
    tokensUsed: result.tokensUsed,
    costUsd: result.costUsd ?? null,
    durationMs: Date.now() - startedAt,
  };
}

// Re-judge specific jobs (Jobs table / detail panel): reset them to PENDING and
// run the batched board-scan route over exactly those rows. Rows the AI could
// not reach in this run stay PENDING for the next analyze pass or cron.
export async function reanalyzeJobs(ids: number[], options: { timeBudgetMs?: number; userId?: number } = {}) {
  const unique = Array.from(new Set(ids.filter((n) => Number.isInteger(n) && n > 0))).slice(0, 60);
  if (unique.length === 0) {
    return { analyzed: 0, approved: 0, rejected: 0, skipped: 0, remaining: 0, timedOut: false };
  }
  const scope = options.userId != null ? { userId: options.userId } : {};
  await prisma.scrapedJob.updateMany({
    where: { id: { in: unique }, ...scope },
    data: { status: "PENDING", aiScore: null, aiReason: null, techStack: null, eligibility: null, sheetSynced: false },
  });
  return analyzeAllPending({
    onlyIds: unique,
    limit: unique.length,
    timeBudgetMs: options.timeBudgetMs,
    userId: options.userId,
  });
}
