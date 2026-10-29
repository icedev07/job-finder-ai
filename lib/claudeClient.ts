import Anthropic from "@anthropic-ai/sdk";
import { claudeCostUsd, claudeModelInfo, type ClaudeEffort, type TokenUsage } from "./aiRoutes";
import { LLMRateLimitedError } from "./llmErrors";

// Claude via the official Anthropic SDK (API version 2026-10-21).
//
// - Effort ("level") is sent as output_config.effort; thinking is left at the
//   model default (adaptive), which every current model accepts.
// - Structured outputs (output_config.format) guarantee the verdict JSON
//   parses, so a model can no longer answer "approved":"false" as a string.
// - The stable system prompt carries a cache breakpoint: repeat calls bill it
//   at the cache-read rate (~1/10 of input).
// - Opus / Sonnet / Fable requests opt into Anthropic's server-side refusal
//   fallback ("default"), so a policy decline is retried on Anthropic's
//   recommended substitute model inside the same call.
// - No temperature/top_p: the 2026-10-21 API rejects sampling parameters.

export type ClaudeDocument = { mediaType: "application/pdf"; base64: string; title?: string };

export type ClaudeRequest = {
  apiKey: string;
  model: string;
  effort: ClaudeEffort;
  /** Stable instructions — cached between calls. */
  system?: string;
  /** Per-call content (the job, the question…). */
  user: string;
  documents?: ClaudeDocument[];
  jsonSchema?: Record<string, unknown>;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type ClaudeResponse = {
  text: string;
  /** The model that actually answered (differs only after a server fallback). */
  model: string;
  stopReason: string | null;
  usage: TokenUsage;
  costUsd: number | null;
};

export class ClaudeRefusalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaudeRefusalError";
  }
}

const SERVER_FALLBACK_BETA = "server-side-fallback-2026-07-01";
const CONFIG_ERROR_COOLDOWN_MS = 10 * 60_000;

function retryAfterMs(headers: Headers | undefined): number {
  const raw = headers?.get("retry-after");
  const secs = raw ? Number(raw) : NaN;
  return Number.isFinite(secs) && secs > 0 ? Math.round(secs * 1000) : 60_000;
}

// Map SDK errors onto the rotation's vocabulary. Anything that will fail the
// same way on the next call (bad key, bad model id, unsupported parameter, no
// credit) parks Claude via LLMRateLimitedError so the route falls back to the
// next provider instead of hammering the API.
function mapClaudeError(e: unknown): Error {
  if (e instanceof Anthropic.APIUserAbortError) return new Error("LLM call aborted");
  if (e instanceof Anthropic.RateLimitError) {
    const ms = retryAfterMs(e.headers);
    return new LLMRateLimitedError(`Claude rate-limited (retry in ${Math.ceil(ms / 1000)}s)`, ms);
  }
  if (e instanceof Anthropic.AuthenticationError) {
    return new LLMRateLimitedError("Claude API key is invalid — replace it in Admin → AI.", 60 * 60_000, true);
  }
  if (e instanceof Anthropic.PermissionDeniedError) {
    return new LLMRateLimitedError(`Claude key not allowed to use this model: ${e.message}`, 60 * 60_000, true);
  }
  if (e instanceof Anthropic.NotFoundError || e instanceof Anthropic.BadRequestError) {
    return new LLMRateLimitedError(`Claude rejected the request (${e.status}): ${e.message}`, CONFIG_ERROR_COOLDOWN_MS);
  }
  if (e instanceof Anthropic.APIConnectionTimeoutError) return new Error("Claude request timed out");
  if (e instanceof Anthropic.APIError) return new Error(`Claude API error ${e.status ?? ""}: ${e.message}`.trim());
  return e instanceof Error ? e : new Error(String(e));
}

function makeClient(apiKey: string, timeoutMs: number): Anthropic {
  // One SDK retry for transient 5xx/529; rate limits fail over to the next
  // provider in the route instead of waiting.
  return new Anthropic({ apiKey, maxRetries: 1, timeout: timeoutMs });
}

export async function callClaude(req: ClaudeRequest): Promise<ClaudeResponse> {
  const client = makeClient(req.apiKey, req.timeoutMs ?? 45_000);
  const info = claudeModelInfo(req.model);
  const maxTokens = req.maxTokens ?? 4000;

  const system = req.system
    ? [{ type: "text" as const, text: req.system, cache_control: { type: "ephemeral" as const } }]
    : undefined;
  const content = req.documents?.length
    ? [
        ...req.documents.map((d) => ({
          type: "document" as const,
          source: { type: "base64" as const, media_type: d.mediaType, data: d.base64 },
          ...(d.title ? { title: d.title } : {}),
        })),
        { type: "text" as const, text: req.user },
      ]
    : req.user;
  const outputConfig = {
    effort: req.effort,
    ...(req.jsonSchema ? { format: { type: "json_schema" as const, schema: req.jsonSchema } } : {}),
  };

  let text = "";
  let model = req.model;
  let stopReason: string | null = null;
  let refusalCategory: string | null = null;
  let usage: TokenUsage;
  try {
    if (info?.serverFallback) {
      const msg = await client.beta.messages.create(
        {
          model: req.model,
          max_tokens: maxTokens,
          ...(system ? { system } : {}),
          messages: [{ role: "user", content }],
          output_config: outputConfig,
          betas: [SERVER_FALLBACK_BETA],
          fallbacks: "default",
        },
        { signal: req.signal },
      );
      for (const block of msg.content) if (block.type === "text") text += block.text;
      model = msg.model || req.model;
      stopReason = msg.stop_reason ?? null;
      refusalCategory = msg.stop_details?.category ?? null;
      usage = {
        inputTokens: msg.usage.input_tokens,
        outputTokens: msg.usage.output_tokens,
        cacheReadTokens: msg.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: msg.usage.cache_creation_input_tokens ?? 0,
      };
    } else {
      const msg = await client.messages.create(
        {
          model: req.model,
          max_tokens: maxTokens,
          ...(system ? { system } : {}),
          messages: [{ role: "user", content }],
          output_config: outputConfig,
        },
        { signal: req.signal },
      );
      for (const block of msg.content) if (block.type === "text") text += block.text;
      model = msg.model || req.model;
      stopReason = msg.stop_reason ?? null;
      refusalCategory = msg.stop_details?.category ?? null;
      usage = {
        inputTokens: msg.usage.input_tokens,
        outputTokens: msg.usage.output_tokens,
        cacheReadTokens: msg.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: msg.usage.cache_creation_input_tokens ?? 0,
      };
    }
  } catch (e) {
    throw mapClaudeError(e);
  }

  const costUsd = claudeCostUsd(model, usage) ?? claudeCostUsd(req.model, usage);
  if (stopReason === "refusal") {
    const err = new ClaudeRefusalError(`Claude declined this request${refusalCategory ? ` (${refusalCategory})` : ""}.`);
    Object.assign(err, { usage, costUsd, model });
    throw err;
  }
  if (stopReason === "max_tokens" && req.jsonSchema) {
    const err = new Error(
      `Claude ran out of output tokens (${maxTokens}) before finishing the JSON — lower the effort level for this task.`,
    );
    Object.assign(err, { usage, costUsd, model });
    throw err;
  }
  return { text, model, stopReason, usage, costUsd };
}

export type ClaudeModelListing = { id: string; displayName: string };

// Live model list for the admin's key — doubles as a key check.
export async function listClaudeModels(apiKey: string): Promise<ClaudeModelListing[]> {
  const client = makeClient(apiKey, 15_000);
  const out: ClaudeModelListing[] = [];
  try {
    for await (const m of client.models.list()) {
      out.push({ id: m.id, displayName: m.display_name });
      if (out.length >= 100) break;
    }
  } catch (e) {
    throw mapClaudeError(e);
  }
  return out;
}
