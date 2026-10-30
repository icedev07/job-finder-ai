// AI routing model shared by the server and the admin UI (no server-only
// imports here).
//
// Each task gets its own ordered provider chain: the first provider with a key
// that is not cooling down / over budget answers; on a rate limit or error the
// next one is tried. Claude also carries a model and an effort ("level") per
// task, so e.g. board scans can run on a cheap model while the LinkedIn
// extension uses a stronger one.

export const AI_TASKS = ["scan", "extension", "resume", "answers", "writing"] as const;
export type AiTask = (typeof AI_TASKS)[number];

export const AI_TASK_INFO: Record<AiTask, { label: string; description: string }> = {
  scan: {
    label: "Board scans",
    description: "Batched verdicts for jobs from the job boards (cron + Scrape all sources). Volume task — cost matters most.",
  },
  extension: {
    label: "LinkedIn extension",
    description: "One job at a time while you watch the scan. Speed and quality matter most.",
  },
  resume: {
    label: "Resume reading",
    description:
      "Reads an uploaded resume (PDF, Word or text) into the profile's facts. Personal data — Claude recommended; a scanned PDF needs Claude.",
  },
  answers: {
    label: "Form answers",
    description: "Drafts free-text answers for application forms from your profile facts. Personal data — Claude recommended.",
  },
  writing: {
    label: "Writing",
    description:
      "Resume match, cover letters, intro and follow-up messages and interview prep in a job's panel. Personal data — Claude recommended.",
  },
};

export const PROVIDER_IDS = ["claude", "gemini", "groq", "cerebras", "openrouter", "cloudflare"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];
export const FREE_PROVIDER_IDS = ["gemini", "groq", "cerebras", "openrouter", "cloudflare"] as const;

export const PROVIDER_INFO: Record<ProviderId, { label: string; note: string; paid: boolean }> = {
  claude: { label: "Claude", note: "your Anthropic key — paid, best quality, strict JSON", paid: true },
  gemini: { label: "Gemini", note: "free, no card", paid: false },
  groq: { label: "Groq", note: "free, no card", paid: false },
  cerebras: { label: "Cerebras", note: "free, no card", paid: false },
  openrouter: { label: "OpenRouter", note: "free, no card", paid: false },
  cloudflare: { label: "Cloudflare", note: "free, no card", paid: false },
};

export const CLAUDE_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type ClaudeEffort = (typeof CLAUDE_EFFORTS)[number];

export const CLAUDE_EFFORT_INFO: Record<ClaudeEffort, string> = {
  low: "Low — fastest and cheapest; usually enough for a yes/no job match",
  medium: "Medium — balanced",
  high: "High — more careful reasoning",
  xhigh: "Extra high — slow, for hard cases",
  max: "Max — slowest and most expensive",
};

// USD per million tokens, from https://platform.claude.com/docs/en/about-claude/pricing
// (checked 2026-10-29). cacheWrite = 5-minute cache write.
type Price = { input: number; output: number; cacheRead: number; cacheWrite: number };

export type ClaudeModelInfo = {
  id: string;
  label: string;
  price: Price;
  /** Haiku 5.5 bills prompts over 100K tokens at a higher rate. */
  longPrompt?: { overTokens: number; price: Price };
  /** Opt into Anthropic's server-side refusal fallback for this model. */
  serverFallback: boolean;
  note: string;
};

export const CLAUDE_MODELS: ClaudeModelInfo[] = [
  {
    id: "claude-opus-5-5",
    label: "Claude Opus 5.5",
    price: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
    serverFallback: true,
    note: "Anthropic's default model — strongest reasoning of the everyday models",
  },
  {
    id: "claude-sonnet-5-5",
    label: "Claude Sonnet 5.5",
    price: { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
    serverFallback: true,
    note: "Balanced quality and price",
  },
  {
    id: "claude-haiku-5-5",
    label: "Claude Haiku 5.5",
    price: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
    longPrompt: { overTokens: 100_000, price: { input: 0.5, output: 2.5, cacheRead: 0.05, cacheWrite: 0.625 } },
    serverFallback: false,
    note: "Fast and very cheap — built for high-volume classification",
  },
  {
    id: "claude-fable-5-1",
    label: "Claude Fable 5.1",
    price: { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
    serverFallback: true,
    note: "Most capable and most expensive — rarely worth it for job matching",
  },
];

export const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5";

export function claudeModelInfo(id: string): ClaudeModelInfo | undefined {
  return CLAUDE_MODELS.find((m) => m.id === id);
}

/** "Claude Haiku 5.5", "Cerebras (llama-3.3-70b)": who answered, from a route's "provider:model". */
export function modelLabel(model: string): string {
  const [provider, ...rest] = model.split(":");
  const id = rest.join(":");
  if (provider === "claude") return claudeModelInfo(id)?.label ?? id;
  const label = (PROVIDER_INFO as Record<string, { label: string }>)[provider]?.label ?? provider;
  return id ? `${label} (${id})` : label;
}

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

// Cost of one call in USD. Unknown model → null (shown as "price unknown").
export function claudeCostUsd(modelId: string, u: TokenUsage): number | null {
  const info = claudeModelInfo(modelId);
  if (!info) return null;
  const promptTokens = u.inputTokens + u.cacheReadTokens + u.cacheWriteTokens;
  const price = info.longPrompt && promptTokens > info.longPrompt.overTokens ? info.longPrompt.price : info.price;
  return (
    (u.inputTokens * price.input +
      u.outputTokens * price.output +
      u.cacheReadTokens * price.cacheRead +
      u.cacheWriteTokens * price.cacheWrite) /
    1_000_000
  );
}

export type AiRoute = {
  /** Ordered provider chain — tried first to last with failover. */
  providers: ProviderId[];
  /** Claude model used when "claude" is in the chain. */
  claudeModel: string;
  claudeEffort: ClaudeEffort;
};

export type AiRoutes = Record<AiTask, AiRoute>;

// The order the analyzer used before routes existed: scanner batches preferred
// big-context providers, the extension preferred fast high-volume ones.
const LEGACY_ORDER: Record<"scan" | "extension", ProviderId[]> = {
  scan: ["gemini", "openrouter", "cerebras", "groq", "cloudflare"],
  extension: ["cerebras", "groq", "cloudflare", "gemini", "openrouter"],
};

const DEFAULT_EFFORT: Record<AiTask, ClaudeEffort> = {
  scan: "low",
  extension: "low",
  // A reading, like a draft, has to be ready within the minute a request may take.
  resume: "low",
  answers: "medium",
  writing: "low",
};

// Routes used until the admin saves their own: the scan/extension chains are
// exactly the legacy rotation over the ticked free providers, so upgrading
// changes nothing until Claude is added to a route.
export function defaultAiRoutes(legacySelected: string[]): AiRoutes {
  const pick = (task: "scan" | "extension") => LEGACY_ORDER[task].filter((p) => legacySelected.includes(p));
  return {
    scan: { providers: pick("scan"), claudeModel: DEFAULT_CLAUDE_MODEL, claudeEffort: DEFAULT_EFFORT.scan },
    extension: {
      providers: pick("extension"),
      claudeModel: DEFAULT_CLAUDE_MODEL,
      claudeEffort: DEFAULT_EFFORT.extension,
    },
    resume: { providers: ["claude"], claudeModel: DEFAULT_CLAUDE_MODEL, claudeEffort: DEFAULT_EFFORT.resume },
    answers: { providers: ["claude"], claudeModel: DEFAULT_CLAUDE_MODEL, claudeEffort: DEFAULT_EFFORT.answers },
    writing: { providers: ["claude"], claudeModel: DEFAULT_CLAUDE_MODEL, claudeEffort: DEFAULT_EFFORT.writing },
  };
}

function isProviderId(v: unknown): v is ProviderId {
  return typeof v === "string" && (PROVIDER_IDS as readonly string[]).includes(v);
}

function isEffort(v: unknown): v is ClaudeEffort {
  return typeof v === "string" && (CLAUDE_EFFORTS as readonly string[]).includes(v);
}

// Parse the stored ai_routes JSON, repairing anything malformed field by field
// so one bad value can never take every route down.
export function parseAiRoutes(raw: string | undefined | null, legacySelected: string[]): AiRoutes {
  const defaults = defaultAiRoutes(legacySelected);
  if (!raw || !raw.trim()) return defaults;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaults;
  }
  if (!parsed || typeof parsed !== "object") return defaults;
  const out = { ...defaults };
  for (const task of AI_TASKS) {
    const r = (parsed as Record<string, unknown>)[task];
    if (!r || typeof r !== "object") continue;
    const route = r as Record<string, unknown>;
    const providers = Array.isArray(route.providers)
      ? route.providers.filter(isProviderId).filter((p, i, a) => a.indexOf(p) === i)
      : defaults[task].providers;
    out[task] = {
      providers,
      claudeModel:
        typeof route.claudeModel === "string" && route.claudeModel.trim()
          ? route.claudeModel.trim()
          : defaults[task].claudeModel,
      claudeEffort: isEffort(route.claudeEffort) ? route.claudeEffort : defaults[task].claudeEffort,
    };
  }
  return out;
}
