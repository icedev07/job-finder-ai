import { prisma } from "./prisma";

export const CONFIG_KEYS = {
  // Legacy single-provider key — still read for backward-compatible migration
  // into AI_PROVIDERS, no longer written by the settings page.
  AI_PROVIDER: "ai_provider",
  // JSON array of provider ids the analyzer rotates across.
  AI_PROVIDERS: "ai_providers",
  GEMINI_API_KEY: "gemini_api_key",
  GEMINI_MODEL: "gemini_model",
  OPENROUTER_API_KEY: "openrouter_api_key",
  OPENROUTER_MODEL: "openrouter_model",
  // Routing tier: "free" (only :free models, no paid fallback), "nitro" (paid
  // models routed via provider.sort=throughput for fastest response), or
  // "auto" (the original behavior — try :free first, fall back to a cheap
  // paid model on exhaustion).
  OPENROUTER_TIER: "openrouter_tier",
  // Model id used when tier="nitro". Sent with provider.sort="throughput" so
  // OpenRouter picks the fastest upstream host (equivalent to the :nitro
  // suffix shortcut). Default is a cheap, fast 8B instruct model.
  OPENROUTER_PAID_MODEL: "openrouter_paid_model",
  GROQ_API_KEY: "groq_api_key",
  GROQ_MODEL: "groq_model",
  CEREBRAS_API_KEY: "cerebras_api_key",
  CEREBRAS_MODEL: "cerebras_model",
  CLOUDFLARE_ACCOUNT_ID: "cloudflare_account_id",
  CLOUDFLARE_API_KEY: "cloudflare_api_key",
  CLOUDFLARE_MODEL: "cloudflare_model",
  GOOGLE_SHEETS_CREDENTIALS: "google_sheets_credentials",
  GOOGLE_SHEET_ID: "google_sheet_id",
  ADMIN_PASSWORD: "admin_password",
  TARGET_MARKET: "target_market",
  CURRENT_LOCATION: "current_location",
  JOB_ANALYSIS_PROMPT: "job_analysis_prompt",
  SHEET_COLUMNS: "sheet_columns",
  LINKEDIN_SHEET_TAB: "linkedin_sheet_tab",
  EXTENSION_API_KEY: "extension_api_key",
  ANALYZER_REQUEST_DELAY_MS: "analyzer_request_delay_ms",
  ANALYZER_BATCH_SIZE: "analyzer_batch_size",
  // Claude (Anthropic) — the user's own paid key.
  ANTHROPIC_API_KEY: "anthropic_api_key",
  // JSON: per-task provider chain + Claude model/effort (see lib/aiRoutes.ts).
  AI_ROUTES: "ai_routes",
  // Monthly Claude spend cap in USD. Once reached, Claude is skipped and the
  // routes fall back to the free providers until the next month. 0 = no cap.
  CLAUDE_MONTHLY_BUDGET_USD: "claude_monthly_budget_usd",
  // JSON CandidateProfile (lib/profileModel.ts) — written by /api/admin/profile.
  CANDIDATE_PROFILE: "candidate_profile",
  // "false" keeps the profile out of the job-matching prompts.
  PROFILE_IN_MATCHING: "profile_in_matching",
  // Score band whose verdicts land in the Review queue (inclusive).
  REVIEW_BAND_MIN: "review_band_min",
  REVIEW_BAND_MAX: "review_band_max",
  // Days after "Applied" before a follow-up is due.
  FOLLOWUP_DAYS: "followup_days",
} as const;

// Settings that are write-only from the admin UI: the API returns only whether
// they are set plus a short hint, never the value itself.
export const SECRET_CONFIG_KEYS = [
  CONFIG_KEYS.GEMINI_API_KEY,
  CONFIG_KEYS.OPENROUTER_API_KEY,
  CONFIG_KEYS.GROQ_API_KEY,
  CONFIG_KEYS.CEREBRAS_API_KEY,
  CONFIG_KEYS.CLOUDFLARE_API_KEY,
  CONFIG_KEYS.ANTHROPIC_API_KEY,
  CONFIG_KEYS.GOOGLE_SHEETS_CREDENTIALS,
  CONFIG_KEYS.EXTENSION_API_KEY,
] as const;

export type SecretConfigKey = (typeof SECRET_CONFIG_KEYS)[number];

export function isSecretConfigKey(key: string): key is SecretConfigKey {
  return (SECRET_CONFIG_KEYS as readonly string[]).includes(key);
}

// A short, non-reversible description of a stored secret for the UI: the
// service-account e-mail for the Sheets JSON, otherwise the last 4 characters.
export function secretHint(key: string, value: string): string {
  const v = (value || "").trim();
  if (!v) return "";
  if (key === CONFIG_KEYS.GOOGLE_SHEETS_CREDENTIALS) {
    try {
      const email = JSON.parse(v)?.client_email;
      if (typeof email === "string" && email) return email;
    } catch {
      // not JSON — fall through
    }
    return "saved (not valid JSON)";
  }
  return v.length <= 8 ? "saved" : `…${v.slice(-4)}`;
}

export async function getConfigValue(key: string): Promise<string | null> {
  const row = await prisma.appConfig.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  invalidateConfigCache();
}

// Supabase free tier limits us to 15 sessions on the connection pool. A single
// analyze batch otherwise calls getAllConfig() ~3 times per job (analyzer +
// LLM client + sheets sync), so 8 jobs × 3 = 24 findMany() calls easily blows
// the pool and produces "FATAL: max clients reached in session mode".
// A short module-level cache collapses every batch down to a single DB read.
let cachedConfig: { value: Record<string, string>; expiresAt: number } | null = null;
let inflightConfig: Promise<Record<string, string>> | null = null;
const CONFIG_TTL_MS = 10_000;

export function invalidateConfigCache(): void {
  cachedConfig = null;
  inflightConfig = null;
}

export async function getAllConfig(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedConfig && cachedConfig.expiresAt > now) {
    return cachedConfig.value;
  }
  // If a concurrent call is already loading, ride along on it instead of
  // opening a second session.
  if (inflightConfig) return inflightConfig;

  inflightConfig = (async () => {
    try {
      const rows = await prisma.appConfig.findMany();
      const config: Record<string, string> = {};
      for (const row of rows) config[row.key] = row.value;
      cachedConfig = { value: config, expiresAt: Date.now() + CONFIG_TTL_MS };
      return config;
    } finally {
      inflightConfig = null;
    }
  })();
  return inflightConfig;
}

// Every provider id the analyzer knows how to call. All are 100% free with no
// credit card. Used both to validate the stored AI_PROVIDERS list and to
// migrate the legacy single-value AI_PROVIDER.
export const KNOWN_AI_PROVIDERS = [
  "gemini",
  "groq",
  "cerebras",
  "openrouter",
  "cloudflare",
] as const;

// Resolve the ordered provider list. Once AI_PROVIDERS has been written it is
// authoritative — even an empty list is honoured (the user unticked everything,
// which surfaces a clear error rather than silently analyzing). Only when the
// key was never written (a deployment from before multi-select) does it migrate
// the legacy AI_PROVIDER: "rotation" → the four free providers, any single
// value → just that one, nothing set → Gemini.
function resolveAiProviders(rawList: string | undefined, legacy: string | undefined): string[] {
  if (rawList) {
    try {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (p): p is string =>
            typeof p === "string" && (KNOWN_AI_PROVIDERS as readonly string[]).includes(p),
        );
      }
    } catch {
      // unparseable — fall through to legacy migration
    }
  }
  if (legacy === "rotation") return ["gemini", "groq", "cerebras", "openrouter"];
  if (legacy && (KNOWN_AI_PROVIDERS as readonly string[]).includes(legacy)) return [legacy];
  return ["gemini"];
}

export type OpenrouterTier = "free" | "nitro" | "auto";
const OPENROUTER_TIERS: readonly OpenrouterTier[] = ["free", "nitro", "auto"];

function resolveOpenrouterTier(raw: string | undefined): OpenrouterTier {
  if (raw && (OPENROUTER_TIERS as readonly string[]).includes(raw)) {
    return raw as OpenrouterTier;
  }
  return "auto";
}

export async function getConfig() {
  const all = await getAllConfig();

  return {
    // Ordered list of providers the analyzer rotates across. One id → single-
    // provider mode; several ids → rotation with failover.
    aiProviders: resolveAiProviders(
      all[CONFIG_KEYS.AI_PROVIDERS],
      all[CONFIG_KEYS.AI_PROVIDER],
    ),
    geminiApiKey: all[CONFIG_KEYS.GEMINI_API_KEY] || "",
    geminiModel: all[CONFIG_KEYS.GEMINI_MODEL] || "gemini-2.5-flash",
    openrouterApiKey: all[CONFIG_KEYS.OPENROUTER_API_KEY] || "",
    openrouterModel: all[CONFIG_KEYS.OPENROUTER_MODEL] || "auto",
    openrouterTier: resolveOpenrouterTier(all[CONFIG_KEYS.OPENROUTER_TIER]),
    openrouterPaidModel:
      all[CONFIG_KEYS.OPENROUTER_PAID_MODEL] || "meta-llama/llama-3.1-8b-instruct",
    // Groq and Cerebras are OpenAI-compatible free tiers. Defaults pick the
    // highest free-tier throughput model for each.
    groqApiKey: all[CONFIG_KEYS.GROQ_API_KEY] || "",
    groqModel: all[CONFIG_KEYS.GROQ_MODEL] || "llama-3.1-8b-instant",
    cerebrasApiKey: all[CONFIG_KEYS.CEREBRAS_API_KEY] || "",
    cerebrasModel: all[CONFIG_KEYS.CEREBRAS_MODEL] || "llama-3.3-70b",
    // Cloudflare Workers AI — OpenAI-compatible, 10k free Neurons/day. Needs both
    // the account id (it goes in the request URL) and an API token.
    cloudflareAccountId: all[CONFIG_KEYS.CLOUDFLARE_ACCOUNT_ID] || "",
    cloudflareApiKey: all[CONFIG_KEYS.CLOUDFLARE_API_KEY] || "",
    cloudflareModel: all[CONFIG_KEYS.CLOUDFLARE_MODEL] || "@cf/meta/llama-3.1-8b-instruct",
    googleSheetsCredentials: all[CONFIG_KEYS.GOOGLE_SHEETS_CREDENTIALS] || "",
    googleSheetId: all[CONFIG_KEYS.GOOGLE_SHEET_ID] || "",
    targetMarket: all[CONFIG_KEYS.TARGET_MARKET] || "Europe, Eastern Europe, Remote worldwide",
    currentLocation: all[CONFIG_KEYS.CURRENT_LOCATION] || "Armenia",
    jobAnalysisPrompt: all[CONFIG_KEYS.JOB_ANALYSIS_PROMPT] || "",
    sheetColumns: all[CONFIG_KEYS.SHEET_COLUMNS] || "",
    linkedinSheetTab: all[CONFIG_KEYS.LINKEDIN_SHEET_TAB] || "LinkedIn",
    extensionApiKey: all[CONFIG_KEYS.EXTENSION_API_KEY] || "",
    anthropicApiKey: all[CONFIG_KEYS.ANTHROPIC_API_KEY] || "",
    aiRoutesRaw: all[CONFIG_KEYS.AI_ROUTES] || "",
    claudeMonthlyBudgetUsd: parseBudget(all[CONFIG_KEYS.CLAUDE_MONTHLY_BUDGET_USD]),
    // Verdicts scored inside this band go to the Review queue: close to the
    // approval line (60), where a quick human check helps most.
    reviewBandMin: clampInt(all[CONFIG_KEYS.REVIEW_BAND_MIN], 0, 100, 45),
    reviewBandMax: clampInt(all[CONFIG_KEYS.REVIEW_BAND_MAX], 0, 100, 70),
    followUpDays: clampInt(all[CONFIG_KEYS.FOLLOWUP_DAYS], 1, 60, 7),
    // Inter-request pacing for the LLM. 500ms is well under any free-tier
    // per-minute cap (OpenRouter free is 20 req/min ≈ one request every 3s,
    // and batching already cuts request count ~5×). Set higher only if you see
    // 429s; set 0 to disable pacing entirely on a paid plan.
    analyzerRequestDelayMs: Math.max(
      0,
      Number(all[CONFIG_KEYS.ANALYZER_REQUEST_DELAY_MS]) || 500,
    ),
    // How many jobs to pack into a single LLM call. 5 jobs × 3000-char desc =
    // ~18k char prompt — small enough that a fast free model returns in under
    // the analyzer's abort deadline, large enough that an 80-job backlog
    // becomes ~16 calls. Clamped 1–12 so the prompt always fits a free model's
    // context window even at the upper end.
    analyzerBatchSize: Math.min(
      12,
      Math.max(1, Number(all[CONFIG_KEYS.ANALYZER_BATCH_SIZE]) || 5),
    ),
  };
}

export const DEFAULT_CLAUDE_MONTHLY_BUDGET_USD = 10;

function clampInt(raw: string | undefined, min: number, max: number, fallback: number): number {
  const n = Number(raw);
  if (raw == null || raw.trim() === "" || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

// Blank → the default cap. Anything non-numeric or negative also falls back to
// the default, so a typo can never silently remove the cap. 0 means "no cap".
function parseBudget(raw: string | undefined): number {
  if (raw == null || raw.trim() === "") return DEFAULT_CLAUDE_MONTHLY_BUDGET_USD;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_CLAUDE_MONTHLY_BUDGET_USD;
}

export const DEFAULT_SHEET_COLUMNS = [
  { key: "title", label: "Title" },
  { key: "company", label: "Company" },
  { key: "location", label: "Location" },
  { key: "url", label: "URL" },
  { key: "platform", label: "Source" },
  { key: "aiScore", label: "AI Score" },
  { key: "techStack", label: "Tech Stack" },
  { key: "salary", label: "Salary" },
  { key: "createdAt", label: "Date Found" },
];

export function getSheetColumns(configValue: string) {
  if (!configValue) return DEFAULT_SHEET_COLUMNS;
  try {
    const parsed = JSON.parse(configValue);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return DEFAULT_SHEET_COLUMNS;
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}
