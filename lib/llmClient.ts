import { GoogleGenerativeAI } from "@google/generative-ai";
import { getConfig } from "./config";
import { LLMRateLimitedError } from "./llmErrors";
import { callClaude, ClaudeRefusalError, type ClaudeDocument } from "./claudeClient";
import { AI_TASK_INFO, parseAiRoutes, type AiRoute, type AiTask, type ProviderId } from "./aiRoutes";
import { claudeSpendThisMonth, recordAiUsage, startOfNextUtcMonth } from "./aiUsage";

export { LLMRateLimitedError };

export type LLMResult = {
  text: string;
  model: string;
  tokensUsed: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  /** USD; only Claude reports a cost (the free providers bill nothing). */
  costUsd?: number | null;
};

const GEMINI_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
];

// Pull a retry hint out of a Gemini quota error. The SDK surfaces the REST
// error body verbatim, which carries  "retryDelay":"34s"  on 429 responses.
function parseGeminiRetryMs(msg: string): number {
  const m = msg.match(/retryDelay["'\s:]+(\d+(?:\.\d+)?)s/i);
  return m ? Math.round(parseFloat(m[1]) * 1000) : 0;
}

export async function generateWithGemini(
  prompt: string,
  apiKey: string,
  model: string,
  signal?: AbortSignal,
): Promise<LLMResult> {
  const order = [model, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== model)];
  const attempts: string[] = [];
  let rateLimited = false;
  let retryMs = 0;
  let daily = false;

  for (const m of order) {
    if (signal?.aborted) throw new Error("LLM call aborted");
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const genModel = genAI.getGenerativeModel({ model: m });
      const result = await genModel.generateContent(prompt, signal ? { signal } : undefined);
      const response = result.response;
      const text = response.text();
      const usage = response.usageMetadata;
      const inputTokens = usage?.promptTokenCount || 0;
      const outputTokens = usage?.candidatesTokenCount || 0;
      return { text, model: m, tokensUsed: inputTokens + outputTokens, inputTokens, outputTokens };
    } catch (e: any) {
      const msg = String(e?.message || e);
      attempts.push(`${m}: ${msg}`);
      // 429 / RESOURCE_EXHAUSTED is a back-off signal, not a model fault: every
      // fallback model shares the same per-project quota, so stop here and
      // surface a rate-limit error instead of letting the caller mark the job
      // REJECTED.
      if (/\b429\b|RESOURCE_EXHAUSTED|too many requests|quota/i.test(msg)) {
        rateLimited = true;
        retryMs = Math.max(retryMs, parseGeminiRetryMs(msg));
        if (/per[- ]?day|daily|PerDay/i.test(msg)) daily = true;
        break;
      }
    }
  }

  if (rateLimited) {
    // A daily cap will not clear in seconds — park the provider for a good
    // while even if the error carried a short retry hint.
    throw new LLMRateLimitedError(
      daily
        ? "Gemini free daily quota reached — resets at midnight Pacific time"
        : `Gemini rate-limited (retry in ${Math.ceil((retryMs || 60_000) / 1000)}s)`,
      daily ? Math.max(retryMs, 60 * 60_000) : retryMs || 60_000,
      daily,
    );
  }
  throw new Error(`Gemini: all model attempts failed → ${attempts.join(" | ")}`);
}

// Special sentinel meaning "discover free models live from OpenRouter".
export const OPENROUTER_AUTO = "auto";

// Last-resort static list, only used if /models endpoint is unreachable.
const OPENROUTER_STATIC_FALLBACK = [
  "meta-llama/llama-3.2-3b-instruct:free",
  "google/gemma-2-9b-it:free",
  "mistralai/mistral-7b-instruct:free",
];

// Known-fast free models, tried in this order before any auto-discovered ones.
// Picked for low end-to-end latency on a short structured-output prompt: small
// parameter counts, mature instruct tunes, and providers that don't queue free
// traffic behind paid. Sorting auto-discovered free models by context window
// (the previous default) buried these behind 70B+ models that take 30–60s per
// call and trigger the analyzer's hard abort. Anything not in this list is
// appended after, still sorted by context window for the rare batched prompt
// that genuinely needs a huge window.
const OPENROUTER_FAST_FREE_PRIORITY = [
  "meta-llama/llama-3.2-3b-instruct:free",
  "google/gemma-2-9b-it:free",
  "mistralai/mistral-7b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",
];

let cachedFreeModels: { ids: string[]; ts: number } | null = null;
const MODELS_TTL_MS = 10 * 60 * 1000;

async function fetchOpenRouterFreeModels(
  apiKey: string,
  signal?: AbortSignal,
): Promise<string[]> {
  if (cachedFreeModels && Date.now() - cachedFreeModels.ts < MODELS_TTL_MS) {
    return cachedFreeModels.ids;
  }

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    // A hung model lookup must not eat the whole serverless budget. Honour the
    // caller's deadline when given one, otherwise fall back to a self-timeout.
    signal: signal ?? AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`OpenRouter /models HTTP ${res.status}: ${await res.text().then((s) => s.slice(0, 200))}`);
  }
  const data = await res.json();
  const list: any[] = Array.isArray(data?.data) ? data.data : [];

  const free: { id: string; ctx: number }[] = [];
  for (const m of list) {
    const id = String(m?.id || "");
    if (!id) continue;
    // OpenRouter's genuinely-free chat variants all carry the ":free" suffix.
    // Filtering on $0 prompt/completion pricing alone also lets through
    // preview / cloaked models — e.g. google/lyria-* (audio generation, billed
    // via other pricing fields) and openrouter/owl-alpha (gated by a data-
    // policy guardrail). Those 402/404 on every call and just burn the per-day
    // free request budget, so require the explicit free marker.
    if (!id.endsWith(":free")) continue;
    const pricing = m?.pricing || {};
    const hasPaidField = ["prompt", "completion", "request", "image"].some(
      (k) => Number(pricing[k] ?? 0) > 0,
    );
    if (hasPaidField) continue;
    // Must emit text to return a chat completion — skip image/audio models.
    const outputs = m?.architecture?.output_modalities;
    if (Array.isArray(outputs) && outputs.length > 0 && !outputs.includes("text")) {
      continue;
    }
    free.push({ id, ctx: Number(m?.context_length || 0) });
  }

  // Fast-known models first (in their hand-curated order), then everything
  // else sorted by context window. Latency dominates on a 60s function budget,
  // and our batched prompt is already trimmed to fit comfortably in any modern
  // free model, so context size is a tiebreaker, not the primary key.
  const liveIds = new Set(free.map((m) => m.id));
  const fastFirst = OPENROUTER_FAST_FREE_PRIORITY.filter((id) => liveIds.has(id));
  const rest = free
    .filter((m) => !OPENROUTER_FAST_FREE_PRIORITY.includes(m.id))
    .sort((a, b) => b.ctx - a.ctx)
    .map((m) => m.id);
  const ids = [...fastFirst, ...rest];

  cachedFreeModels = { ids, ts: Date.now() };
  return ids;
}

// `provider` lets the caller force a routing strategy via OpenRouter's
// provider-selection API (https://openrouter.ai/docs/guides/routing/provider-selection).
// We pass { sort: "throughput" } for the "nitro" tier to get the fastest
// upstream host for the chosen model — exactly what the :nitro suffix
// shortcut does, just expressed explicitly so it appears in our request log.
type OpenRouterProviderRouting = {
  sort?: "throughput" | "price" | "latency";
  allow_fallbacks?: boolean;
  order?: string[];
};

async function callOpenRouter(
  apiKey: string,
  model: string,
  prompt: string,
  signal?: AbortSignal,
  provider?: OpenRouterProviderRouting,
) {
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    // Cap the completion so a batched verdict array can't be left open by a
    // provider's tiny default output limit — a truncated JSON array fails to
    // parse and yields zero verdicts. ~12 jobs of {id,approved,score,reason,
    // techStack} land well under 2000 tokens.
    max_tokens: 2000,
  };
  if (provider && Object.keys(provider).length > 0) {
    body.provider = provider;
  }
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://job-automation-ten.vercel.app",
      "X-Title": "Job Finder",
    },
    body: JSON.stringify(body),
    signal,
  });
  return res;
}

// Free-tier safety: cap how many models we try per single LLM call. A genuine
// account-wide 429/402 stops the loop immediately, so this cap only governs how
// many per-model failures (retired-model 404, upstream-busy 402/429) we walk
// past before giving up. Five is a balance: enough to step over a couple of
// momentarily-full free models, few enough to stay well inside the function
// budget.
const OPENROUTER_MAX_MODEL_ATTEMPTS = 5;
// Hard cap on how long we'll wait inside a single LLM call before giving up
// and surfacing a rate-limit error to the caller. 1.5s keeps us moving — a
// 4s sleep on a busy model usually only finds the same model still busy, so
// hopping to the next free model (or, eventually, the paid fallback) returns
// a verdict sooner on average.
const OPENROUTER_MAX_WAIT_MS = 1_500;

function parseRetryAfterMs(res: Response, body: string): number {
  const retryAfter = res.headers.get("retry-after");
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (!Number.isNaN(secs) && secs > 0) return Math.round(secs * 1000);
    const asDate = Date.parse(retryAfter);
    if (!Number.isNaN(asDate)) return Math.max(0, asDate - Date.now());
  }
  const reset = res.headers.get("x-ratelimit-reset");
  if (reset) {
    const ts = Number(reset);
    if (!Number.isNaN(ts) && ts > 0) {
      // OpenRouter uses unix milliseconds.
      const delta = ts > 10 ** 12 ? ts - Date.now() : ts * 1000 - Date.now();
      if (delta > 0) return Math.min(delta, 60_000);
    }
  }
  // Body sometimes carries the hint when headers are missing.
  const m = body.match(/retry[_ -]?after[^0-9]{0,8}(\d{1,5})/i);
  if (m) return Number(m[1]) * 1000;
  return 0;
}

// OpenRouter relays a downstream model host's own error verbatim, wrapping it
// as {"error":{"message":"Provider returned error","metadata":{"raw":...}}}.
// Such an error — whatever its HTTP status — is that ONE :free model's upstream
// host talking, never a statement about the user's OpenRouter account. Other
// models still work, so the caller must move on to the next model rather than
// parking the whole provider.
//
// This generalises the 402 distinction. OpenRouter answers HTTP 402/429 in two
// very different situations, and treating them the same is what makes a
// fully-funded account look "out of credits":
//
//   1. Account-level failure — the OpenRouter balance cannot cover the request,
//      or the account's :free daily allowance is spent. OpenRouter raises this
//      itself; the body carries its own wording ("requires more credits",
//      "negative balance", "free-models-per-day"). Account-wide.
//
//   2. Provider passthrough — one specific model's upstream host hit *its own*
//      quota / rate limit, relayed verbatim inside the wrapper above. The inner
//      error is the provider's, NOT a statement about the user's account. Other
//      models still work, so this is just a per-model failure to skip past.
//
// isOpenRouterUpstreamRelayError detects case 2.
export function isOpenRouterUpstreamRelayError(body: string): boolean {
  return /provider returned error/i.test(body) || /"metadata"\s*:/.test(body);
}

export function isOpenRouterAccountCredit402(body: string): boolean {
  // A relayed downstream error is never about the OpenRouter account balance.
  if (isOpenRouterUpstreamRelayError(body)) return false;
  // OpenRouter's own account-credit wording.
  return /requires more credits|can only afford|negative balance|insufficient credits|add (more )?credits|payment required/i.test(
    body,
  );
}

// Cheap, reliable paid models, tried ONLY as a last resort — when every :free
// model is upstream-busy or the account's :free daily allowance is spent. Both
// are confirmed working and cost ~$0.0002 per 8-job analyzer batch, so a $10
// OpenRouter balance covers tens of thousands of batches. Free models are
// always exhausted first; these run only when free has nothing left to give.
const OPENROUTER_PAID_FALLBACK_MODELS = [
  "meta-llama/llama-3.1-8b-instruct", // $0.02 / $0.05 per 1M tokens
  "mistralai/mistral-nemo", //          $0.02 / $0.03 per 1M tokens
];

// What the free-model stage concluded. Only "exhausted" warrants paying for a
// fallback model; the other terminal outcomes mean a paid model cannot help.
type FreeStageOutcome =
  | { kind: "ok"; result: LLMResult }
  // OpenRouter balance genuinely cannot cover a request — a paid model fails
  // the same way, so do not fall through to the paid stage.
  | { kind: "account-credit"; message: string }
  // OpenRouter's own per-key throttle — it limits paid calls on this key too,
  // so the paid stage cannot help either.
  | { kind: "throttled"; message: string; retryAfterMs: number }
  // Every free model attempted was busy, or the :free daily cap is spent. Paid
  // models have separate, far higher limits, so the paid stage is worth a try.
  | { kind: "exhausted"; attempts: string[] };

// Stage 1 — walk the :free models. Never throws a rate-limit error; it reports
// its conclusion as data so the caller can decide whether the paid stage is
// worth attempting.
async function tryOpenRouterFreeModels(
  prompt: string,
  apiKey: string,
  model: string,
  signal?: AbortSignal,
): Promise<FreeStageOutcome> {
  const useAuto = !model || model === OPENROUTER_AUTO;
  let order: string[];

  if (useAuto) {
    try {
      order = await fetchOpenRouterFreeModels(apiKey, signal);
      if (order.length === 0) order = OPENROUTER_STATIC_FALLBACK;
    } catch {
      order = OPENROUTER_STATIC_FALLBACK;
    }
  } else {
    let dynamic: string[] = [];
    let listLive = false;
    try {
      dynamic = await fetchOpenRouterFreeModels(apiKey, signal);
      listLive = true;
    } catch {
      dynamic = OPENROUTER_STATIC_FALLBACK;
    }
    // A configured model that no longer appears in the live free-model list
    // has been retired — OpenRouter answers it with a 404 "no endpoints
    // found". Trying it first just burns one of the OPENROUTER_MAX_MODEL_
    // ATTEMPTS tries on a guaranteed failure, so drop it and let live
    // discovery drive instead. (If the list lookup failed we cannot tell, so
    // keep the configured model.)
    const configuredIsLive = !listLive || dynamic.includes(model);
    order = configuredIsLive
      ? [model, ...dynamic.filter((m) => m !== model)]
      : [...dynamic];
  }

  // Trim to the small attempt cap so a single LLM call cannot eat the 60s
  // function budget by walking the entire free-model list.
  order = order.slice(0, OPENROUTER_MAX_MODEL_ATTEMPTS);

  const attempts: string[] = [];

  for (const m of order) {
    if (signal?.aborted) throw new Error("LLM call aborted");
    try {
      const res = await callOpenRouter(apiKey, m, prompt, signal);

      if (res.status === 429) {
        const body = await res.text();
        // A 429 relayed from one :free model's upstream host ("Provider
        // returned error" / "temporarily rate-limited upstream") means that
        // single model is momentarily full — NOT an OpenRouter free-models-
        // per-day cap. Skip to the next free model.
        if (isOpenRouterUpstreamRelayError(body)) {
          attempts.push(`${m}: HTTP 429 (model upstream busy) ${body.slice(0, 120)}`);
          continue;
        }
        const waitMs = parseRetryAfterMs(res, body);
        const daily = /per[- ]?day|daily|free-models-per-day|free_models_per_day/i.test(body);
        if (daily) {
          // The account's :free daily allowance is spent. Paid models bill
          // against a separate, far higher limit — hand off to the paid stage.
          attempts.push(`${m}: HTTP 429 free-models-per-day cap reached`);
          return { kind: "exhausted", attempts };
        }
        if (waitMs === 0 || waitMs > OPENROUTER_MAX_WAIT_MS) {
          // OpenRouter's own per-key throttle — it caps paid calls on this key
          // too, so a paid fallback would just hit the same wall.
          return {
            kind: "throttled",
            message: `OpenRouter rate-limited (retry in ${Math.ceil((waitMs || 60_000) / 1000)}s)`,
            retryAfterMs: waitMs || 60_000,
          };
        }
        // Short wait — sleep then retry the SAME model (don't move on, since
        // every free model shares the same budget anyway).
        await new Promise((r) => setTimeout(r, waitMs));
        const retryRes = await callOpenRouter(apiKey, m, prompt, signal);
        if (retryRes.status === 429) {
          const retryBody = await retryRes.text();
          const retryWait = parseRetryAfterMs(retryRes, retryBody) || 60_000;
          return {
            kind: "throttled",
            message: `OpenRouter still rate-limited after backoff (retry in ${Math.ceil(retryWait / 1000)}s)`,
            retryAfterMs: retryWait,
          };
        }
        if (!retryRes.ok) {
          attempts.push(`${m}: HTTP ${retryRes.status} after retry`);
          continue;
        }
        const data = await retryRes.json();
        const text = data?.choices?.[0]?.message?.content || "";
        if (!text) {
          attempts.push(`${m}: empty after retry`);
          continue;
        }
        const tokensUsed = (data?.usage?.prompt_tokens || 0) + (data?.usage?.completion_tokens || 0);
        return { kind: "ok", result: { text, model: m, tokensUsed } };
      }

      if (res.status === 402) {
        const body = await res.text();
        if (isOpenRouterAccountCredit402(body)) {
          // Genuine account-credit failure — every model, free or paid, fails
          // the same way until the user tops up.
          return {
            kind: "account-credit",
            message: `OpenRouter rejected: insufficient account credits (${body.slice(0, 160)})`,
          };
        }
        // 402 relayed from this one :free model's upstream host — that model
        // is out of capacity, but the account and other models are fine.
        attempts.push(`${m}: HTTP 402 (model provider out of capacity) ${body.slice(0, 120)}`);
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        attempts.push(`${m}: HTTP ${res.status} ${body.slice(0, 200)}`);
        continue;
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";
      if (!text) {
        attempts.push(`${m}: empty response (${JSON.stringify(data).slice(0, 200)})`);
        continue;
      }
      const tokensUsed = (data?.usage?.prompt_tokens || 0) + (data?.usage?.completion_tokens || 0);
      return { kind: "ok", result: { text, model: m, tokensUsed } };
    } catch (e: any) {
      attempts.push(`${m}: ${String(e?.message || e)}`);
    }
  }

  return { kind: "exhausted", attempts };
}

// Walk a list of paid models, returning the first that answers. Returns null
// when every model failed for a recoverable reason (so the caller can raise
// one combined error); throws on a genuine account-credit failure since the
// next model would fail the same way. The optional `provider` parameter forces
// a routing strategy (e.g. { sort: "throughput" } for the nitro tier).
async function tryOpenRouterPaidModels(
  prompt: string,
  apiKey: string,
  models: string[],
  attempts: string[],
  signal?: AbortSignal,
  provider?: OpenRouterProviderRouting,
): Promise<LLMResult | null> {
  // Tag the logged model so AnalysisLog distinguishes a throughput-routed
  // call from a default-routed one without us having to crack the request log.
  const tag = provider?.sort === "throughput" ? "paid+nitro" : "paid";
  for (const m of models) {
    if (signal?.aborted) throw new Error("LLM call aborted");
    try {
      const res = await callOpenRouter(apiKey, m, prompt, signal, provider);

      if (res.status === 402) {
        const body = await res.text();
        if (isOpenRouterAccountCredit402(body)) {
          // Out of money — the next paid model fails identically, so stop.
          throw new LLMRateLimitedError(
            `OpenRouter rejected: insufficient account credits (${body.slice(0, 160)})`,
            24 * 60 * 60_000,
            true,
          );
        }
        attempts.push(`${m} (${tag}): HTTP 402 ${body.slice(0, 120)}`);
        continue;
      }
      if (!res.ok) {
        const body = await res.text();
        attempts.push(`${m} (${tag}): HTTP ${res.status} ${body.slice(0, 160)}`);
        continue;
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";
      if (!text) {
        attempts.push(`${m} (${tag}): empty response`);
        continue;
      }
      const tokensUsed = (data?.usage?.prompt_tokens || 0) + (data?.usage?.completion_tokens || 0);
      // Suffix the model id so the analyzer log shows the routing strategy.
      const loggedModel = provider?.sort === "throughput" ? `${m}:nitro` : m;
      return { text, model: loggedModel, tokensUsed };
    } catch (e: any) {
      if (e instanceof LLMRateLimitedError) throw e;
      attempts.push(`${m} (${tag}): ${String(e?.message || e)}`);
    }
  }
  return null;
}

export type OpenRouterTier = "free" | "nitro" | "auto";

export type OpenRouterCallOptions = {
  tier: OpenRouterTier;
  // Paid model id used when tier is "nitro" (or in the "auto" tier's paid
  // fallback when set; defaults to the OPENROUTER_PAID_FALLBACK_MODELS list).
  paidModel?: string;
};

// Tier-aware entry point.
//   "free"  → only :free models, no paid fallback (rate-limit error on
//             exhaustion so the analyzer leaves rows PENDING).
//   "nitro" → skip free entirely; call the configured paid model with
//             provider.sort="throughput" (equivalent to the :nitro suffix
//             shortcut) for the fastest upstream host. Costs money but
//             returns in 2–5s where free can take 30–60s.
//   "auto"  → original behavior: :free first, paid fallback on exhaustion.
export async function generateWithOpenRouter(
  prompt: string,
  apiKey: string,
  model: string,
  signal?: AbortSignal,
  options: OpenRouterCallOptions = { tier: "auto" },
): Promise<LLMResult> {
  if (options.tier === "nitro") {
    const paidModels = options.paidModel
      ? [options.paidModel, ...OPENROUTER_PAID_FALLBACK_MODELS.filter((m) => m !== options.paidModel)]
      : OPENROUTER_PAID_FALLBACK_MODELS;
    const attempts: string[] = [];
    const paid = await tryOpenRouterPaidModels(
      prompt,
      apiKey,
      paidModels,
      attempts,
      signal,
      { sort: "throughput" },
    );
    if (paid) return paid;
    throw new Error(
      `OpenRouter (nitro): every paid model failed → ${attempts.join(" | ")}`,
    );
  }

  const free = await tryOpenRouterFreeModels(prompt, apiKey, model, signal);
  if (free.kind === "ok") return free.result;
  if (free.kind === "account-credit") {
    // Account out of money — a paid model fails the same way. Park the provider.
    throw new LLMRateLimitedError(free.message, 24 * 60 * 60_000, true);
  }
  if (free.kind === "throttled") {
    // Per-key throttle caps paid calls too — back off rather than pay to retry.
    throw new LLMRateLimitedError(free.message, free.retryAfterMs, false);
  }

  if (options.tier === "free") {
    // Free-only mode: do NOT pay. Surface a rate-limit error so the analyzer
    // pauses cleanly and leaves the rows PENDING for the next pass.
    throw new LLMRateLimitedError(
      `OpenRouter free models exhausted (no paid fallback in 'free' tier) — ${free.attempts.slice(-3).join(" | ")}`,
      60 * 60_000,
      true,
    );
  }

  // tier === "auto" — free.kind === "exhausted" — fall through to paid.
  const attempts = [...free.attempts];
  const paidModels = options.paidModel
    ? [options.paidModel, ...OPENROUTER_PAID_FALLBACK_MODELS.filter((m) => m !== options.paidModel)]
    : OPENROUTER_PAID_FALLBACK_MODELS;
  const paid = await tryOpenRouterPaidModels(prompt, apiKey, paidModels, attempts, signal);
  if (paid) return paid;

  throw new Error(
    `OpenRouter: every free model and paid fallback failed → ${attempts.join(" | ")}`,
  );
}

export { fetchOpenRouterFreeModels, callOpenRouter };

// ============================================================================
// Generic OpenAI-compatible providers — Groq & Cerebras
// ----------------------------------------------------------------------------
// Both expose the exact OpenAI POST /chat/completions contract, so one client
// serves both; only the base URL and model list differ. Each takes an ordered
// model list so a renamed or retired model id self-heals to the next candidate
// instead of breaking the provider outright.
// ============================================================================

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const CEREBRAS_BASE_URL = "https://api.cerebras.ai/v1";

const GROQ_FALLBACK_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-20b",
];
const CEREBRAS_FALLBACK_MODELS = ["llama-3.3-70b", "llama3.1-8b", "gpt-oss-120b"];

// Put the configured model first, then the fallbacks (de-duplicated).
function buildModelOrder(preferred: string, fallback: string[]): string[] {
  const p = (preferred || "").trim();
  if (!p) return [...fallback];
  return [p, ...fallback.filter((m) => m !== p)];
}

async function generateWithOpenAICompatible(
  providerLabel: string,
  baseUrl: string,
  apiKey: string,
  models: string[],
  prompt: string,
  signal?: AbortSignal,
): Promise<LLMResult> {
  const attempts: string[] = [];

  for (const m of models) {
    if (signal?.aborted) throw new Error("LLM call aborted");
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          // Generous ceiling for the JSON verdict(s); the model stops earlier.
          // Kept modest so prompt + output stay inside small free-tier windows
          // (Cerebras' free tier caps context at ~8K tokens).
          max_tokens: 1500,
        }),
        signal,
      });
    } catch (e: any) {
      attempts.push(`${m}: ${String(e?.message || e)}`);
      continue;
    }

    // 429 → provider-wide throttle. Groq/Cerebras free tiers rate-limit at the
    // organisation level, so switching model cannot help — surface a rate-limit
    // error so the caller (or the rotation pool) backs off cleanly.
    if (res.status === 429) {
      const body = await res.text();
      const waitMs = parseRetryAfterMs(res, body) || 60_000;
      const daily =
        /per[- ]?day|requests per day|tokens per day|\bRPD\b|\bTPD\b|daily/i.test(body);
      throw new LLMRateLimitedError(
        daily
          ? `${providerLabel} free daily quota reached`
          : `${providerLabel} rate-limited (retry in ${Math.ceil(waitMs / 1000)}s)`,
        // A daily cap will not clear in seconds — keep the provider parked.
        daily ? Math.max(waitMs, 60 * 60_000) : waitMs,
        daily,
      );
    }

    // 402 → no credits / credit limit exceeded. Account-wide and permanent
    // until the user acts, so stop walking models and park the provider.
    if (res.status === 402) {
      const body = await res.text();
      throw new LLMRateLimitedError(
        `${providerLabel} rejected: out of credits — ${body.slice(0, 160)}`,
        24 * 60 * 60_000,
        true,
      );
    }

    if (!res.ok) {
      // A bad/retired model id (400/404) just falls through to the next one.
      const body = await res.text();
      attempts.push(`${m}: HTTP ${res.status} ${body.slice(0, 200)}`);
      continue;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    if (!text) {
      attempts.push(`${m}: empty response`);
      continue;
    }
    const inputTokens = data?.usage?.prompt_tokens || 0;
    const outputTokens = data?.usage?.completion_tokens || 0;
    return { text, model: m, tokensUsed: inputTokens + outputTokens, inputTokens, outputTokens };
  }

  throw new Error(
    `${providerLabel}: all ${models.length} model attempts failed → ${attempts.join(" | ")}`,
  );
}

export async function generateWithGroq(
  prompt: string,
  apiKey: string,
  model: string,
  signal?: AbortSignal,
): Promise<LLMResult> {
  return generateWithOpenAICompatible(
    "Groq",
    GROQ_BASE_URL,
    apiKey,
    buildModelOrder(model, GROQ_FALLBACK_MODELS),
    prompt,
    signal,
  );
}

export async function generateWithCerebras(
  prompt: string,
  apiKey: string,
  model: string,
  signal?: AbortSignal,
): Promise<LLMResult> {
  return generateWithOpenAICompatible(
    "Cerebras",
    CEREBRAS_BASE_URL,
    apiKey,
    buildModelOrder(model, CEREBRAS_FALLBACK_MODELS),
    prompt,
    signal,
  );
}

// ============================================================================
// Cloudflare Workers AI — OpenAI-compatible, 10k free Neurons/day
// ----------------------------------------------------------------------------
// The account id is part of the request URL, so a working Cloudflare provider
// needs both the account id and an API token.
// ============================================================================

const CLOUDFLARE_FALLBACK_MODELS = [
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/openai/gpt-oss-120b",
];

export async function generateWithCloudflare(
  prompt: string,
  accountId: string,
  apiKey: string,
  model: string,
  signal?: AbortSignal,
): Promise<LLMResult> {
  const id = (accountId || "").trim();
  if (!id) {
    throw new Error("Cloudflare account id is not set — add it in /admin/ai (Providers & keys).");
  }
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${id}/ai/v1`;
  return generateWithOpenAICompatible(
    "Cloudflare",
    baseUrl,
    apiKey,
    buildModelOrder(model, CLOUDFLARE_FALLBACK_MODELS),
    prompt,
    signal,
  );
}

// ============================================================================
// Per-task routes
// ----------------------------------------------------------------------------
// Every task (board scans, the LinkedIn extension, resume reading, form
// answers) has its own ordered provider chain — see lib/aiRoutes.ts. The first
// provider with a key that is not cooling down answers; on a rate limit or an
// error it is parked and the next provider is tried. Cooldowns live in module
// memory: on Vercel that survives for the life of a warm function, exactly the
// span of one scan run. Every attempt is written to AiUsage (tokens, cost,
// latency, error) for the usage page, the Claude budget cap and health stats.
// ============================================================================

export type LLMRequest = {
  /** Full prompt for providers without a system/user split (the free ones). */
  prompt: string;
  /** Only Claude can serve this request (e.g. it carries a PDF). */
  claudeOnly?: boolean;
  /** Claude shape: cacheable system prompt + per-call content + strict JSON schema. */
  claude?: {
    system: string;
    user: string;
    jsonSchema?: Record<string, unknown>;
    maxTokens?: number;
    documents?: ClaudeDocument[];
  };
};

export type TaskResult = LLMResult & { provider: ProviderId };

type RotationConfig = Awaited<ReturnType<typeof getConfig>>;

type RotationProvider = {
  id: ProviderId;
  label: string;
  // Rough upper bound (chars) on a prompt this provider's free-tier context
  // can hold. A batched prompt that exceeds it is routed to a bigger-context
  // provider instead of being sent on a guaranteed failure.
  maxPromptChars: number;
  keyOf: (c: RotationConfig) => string;
  /** Model id recorded for a failed attempt (a success reports the real one). */
  modelOf: (c: RotationConfig, route: AiRoute) => string;
  run: (
    req: LLMRequest,
    c: RotationConfig,
    route: AiRoute,
    signal: AbortSignal,
    timeoutMs: number,
  ) => Promise<LLMResult>;
};

const ROTATION_PROVIDERS: Record<ProviderId, RotationProvider> = {
  claude: {
    id: "claude",
    label: "Claude",
    maxPromptChars: 2_000_000,
    keyOf: (c) => c.anthropicApiKey,
    modelOf: (_c, route) => route.claudeModel,
    run: async (req, c, route, signal, timeoutMs) => {
      const r = await callClaude({
        apiKey: c.anthropicApiKey,
        model: route.claudeModel,
        effort: route.claudeEffort,
        system: req.claude?.system,
        user: req.claude?.user ?? req.prompt,
        jsonSchema: req.claude?.jsonSchema,
        documents: req.claude?.documents,
        maxTokens: req.claude?.maxTokens,
        timeoutMs,
        signal,
      });
      const u = r.usage;
      return {
        text: r.text,
        model: r.model,
        tokensUsed: u.inputTokens + u.outputTokens + u.cacheReadTokens + u.cacheWriteTokens,
        ...u,
        costUsd: r.costUsd,
      };
    },
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    maxPromptChars: 900_000,
    keyOf: (c) => c.geminiApiKey,
    modelOf: (c) => c.geminiModel || "gemini-2.5-flash",
    run: (req, c, _route, signal) =>
      generateWithGemini(req.prompt, c.geminiApiKey, c.geminiModel || "gemini-2.5-flash", signal),
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    maxPromptChars: 200_000,
    keyOf: (c) => c.openrouterApiKey,
    modelOf: (c) => c.openrouterModel || OPENROUTER_AUTO,
    run: (req, c, _route, signal) =>
      generateWithOpenRouter(req.prompt, c.openrouterApiKey, c.openrouterModel || OPENROUTER_AUTO, signal, {
        tier: c.openrouterTier,
        paidModel: c.openrouterPaidModel,
      }),
  },
  cerebras: {
    id: "cerebras",
    label: "Cerebras",
    maxPromptChars: 16_000,
    keyOf: (c) => c.cerebrasApiKey,
    modelOf: (c) => c.cerebrasModel,
    run: (req, c, _route, signal) => generateWithCerebras(req.prompt, c.cerebrasApiKey, c.cerebrasModel, signal),
  },
  groq: {
    id: "groq",
    label: "Groq",
    maxPromptChars: 14_000,
    keyOf: (c) => c.groqApiKey,
    modelOf: (c) => c.groqModel,
    run: (req, c, _route, signal) => generateWithGroq(req.prompt, c.groqApiKey, c.groqModel, signal),
  },
  cloudflare: {
    id: "cloudflare",
    label: "Cloudflare",
    // Conservative — the default 8B model has a small context window.
    maxPromptChars: 12_000,
    // Cloudflare needs both the account id (in the URL) and a token; treat the
    // provider as unconfigured unless both are present.
    keyOf: (c) => (c.cloudflareAccountId.trim() && c.cloudflareApiKey.trim() ? c.cloudflareApiKey : ""),
    modelOf: (c) => c.cloudflareModel || "@cf/meta/llama-3.1-8b-instruct",
    run: (req, c, _route, signal) =>
      generateWithCloudflare(
        req.prompt,
        c.cloudflareAccountId,
        c.cloudflareApiKey,
        c.cloudflareModel || "@cf/meta/llama-3.1-8b-instruct",
        signal,
      ),
  },
};

// A transient (non-rate-limit) failure parks the provider briefly so the next
// call in the same run reaches a healthy provider first.
const TRANSIENT_COOLDOWN_MS = 45_000;
// Upper bound on one provider attempt, so a hung provider cannot eat the whole
// serverless budget before the next provider in the route gets a turn.
const DEFAULT_CALL_TIMEOUT_MS = 40_000;

const providerCooldownUntil = new Map<ProviderId, { until: number; reason: string }>();

function cooldownRemaining(id: ProviderId): { ms: number; reason: string } | null {
  const entry = providerCooldownUntil.get(id);
  if (!entry) return null;
  const ms = entry.until - Date.now();
  return ms > 0 ? { ms, reason: entry.reason } : null;
}

function attemptSignal(parent: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return parent ? AbortSignal.any([parent, timeout]) : timeout;
}

export function resolveRoute(config: RotationConfig, task: AiTask): AiRoute {
  return parseAiRoutes(config.aiRoutesRaw, config.aiProviders)[task];
}

export type GenerateOptions = {
  /** Max time for one provider attempt (default 40s). */
  callTimeoutMs?: number;
  /** Use this route instead of the saved one (the Playground). */
  routeOverride?: AiRoute;
  /** Task name written to AiUsage (default: the task) — e.g. "playground". */
  usageTask?: string;
};

// Run a request through the task's provider chain.
export async function generateForTask(
  task: AiTask,
  request: LLMRequest,
  signal?: AbortSignal,
  options: GenerateOptions = {},
): Promise<TaskResult> {
  const config = await getConfig();
  const route = options.routeOverride ?? resolveRoute(config, task);
  const label = AI_TASK_INFO[task].label;
  const usageTask = options.usageTask || task;
  const chain = route.providers.map((id) => ROTATION_PROVIDERS[id]);

  if (chain.length === 0) {
    throw new Error(`No AI provider is set for "${label}". Add one in Admin → AI → Routes.`);
  }
  const withKey = chain.filter((p) => p.keyOf(config).trim().length > 0);
  if (withKey.length === 0) {
    throw new Error(
      `No API key is set for the provider(s) on the "${label}" route: ${chain
        .map((p) => p.label)
        .join(", ")}. Add a key in Admin → AI.`,
    );
  }
  if (request.claudeOnly && !withKey.some((p) => p.id === "claude")) {
    throw new Error(`This needs Claude: add Claude (with a key) to the "${label}" route in Admin → AI → Routes.`);
  }
  // Drop providers whose free-tier context cannot hold this prompt.
  const pool = withKey.filter(
    (p) => (!request.claudeOnly || p.id === "claude") && request.prompt.length <= p.maxPromptChars,
  );
  if (pool.length === 0) {
    throw new Error(
      `Prompt is ${request.prompt.length} chars — larger than any provider on the "${label}" route can accept. Lower the analyzer batch size in /admin/sources.`,
    );
  }

  const attempts: string[] = [];
  let soonestRetryMs = Infinity;

  for (const p of pool) {
    const cd = cooldownRemaining(p.id);
    if (cd) {
      soonestRetryMs = Math.min(soonestRetryMs, cd.ms);
      attempts.push(`${p.label}: cooling down ${Math.ceil(cd.ms / 1000)}s (${cd.reason})`);
      continue;
    }
    if (p.id === "claude" && config.claudeMonthlyBudgetUsd > 0) {
      const spent = await claudeSpendThisMonth();
      if (spent >= config.claudeMonthlyBudgetUsd) {
        soonestRetryMs = Math.min(soonestRetryMs, startOfNextUtcMonth().getTime() - Date.now());
        attempts.push(
          `Claude: monthly budget reached ($${spent.toFixed(2)} of $${config.claudeMonthlyBudgetUsd.toFixed(2)})`,
        );
        continue;
      }
    }
    if (signal?.aborted) throw new Error("LLM call aborted");

    const timeoutMs = options.callTimeoutMs ?? DEFAULT_CALL_TIMEOUT_MS;
    const startedAt = Date.now();
    try {
      const result = await p.run(request, config, route, attemptSignal(signal, timeoutMs), timeoutMs);
      await recordAiUsage({
        task: usageTask,
        provider: p.id,
        model: result.model,
        ok: true,
        inputTokens: result.inputTokens ?? result.tokensUsed,
        outputTokens: result.outputTokens,
        cacheReadTokens: result.cacheReadTokens,
        cacheWriteTokens: result.cacheWriteTokens,
        costUsd: result.costUsd,
        durationMs: Date.now() - startedAt,
      });
      // Tag the model with its provider so AnalysisLog shows the route path.
      return { ...result, model: `${p.id}:${result.model}`, provider: p.id };
    } catch (e: any) {
      // The caller's own deadline — stop the whole chain.
      if (signal?.aborted) throw new Error("LLM call aborted");
      const message = String(e?.message || e);
      // A Claude refusal / truncated answer was still billed — record its cost.
      await recordAiUsage({
        task: usageTask,
        provider: p.id,
        model: e?.model || p.modelOf(config, route),
        ok: false,
        ...(e?.usage ?? {}),
        costUsd: e?.costUsd,
        durationMs: Date.now() - startedAt,
        error: message,
      });
      // A refusal is about this one prompt, not the provider — don't park it.
      const cooldown =
        e instanceof LLMRateLimitedError ? e.retryAfterMs : e instanceof ClaudeRefusalError ? 0 : TRANSIENT_COOLDOWN_MS;
      if (cooldown > 0) providerCooldownUntil.set(p.id, { until: Date.now() + cooldown, reason: message.slice(0, 120) });
      soonestRetryMs = Math.min(soonestRetryMs, cooldown || TRANSIENT_COOLDOWN_MS);
      attempts.push(`${p.label}: ${message}`);
      console.warn(`[route:${task}] ${p.label} unavailable (cooling ${Math.ceil(cooldown / 1000)}s): ${message}`);
    }
  }

  // Every provider on the route is unavailable. Surface a rate-limit error so
  // the analyzer pauses cleanly and leaves the rows PENDING for a later pass,
  // rather than a plain error that would mass-reject the batch.
  throw new LLMRateLimitedError(
    `All providers on the "${label}" route are unavailable → ${attempts.join(" | ")}`,
    Number.isFinite(soonestRetryMs) ? soonestRetryMs : 60_000,
    false,
  );
}

export type LLMPurpose = "single" | "batch";

// Backward-compatible entry point: "single" = the extension route, "batch" =
// the board-scan route.
export async function generateText(
  prompt: string,
  signal?: AbortSignal,
  purpose: LLMPurpose = "single",
): Promise<LLMResult> {
  return generateForTask(purpose === "batch" ? "scan" : "extension", { prompt }, signal);
}
