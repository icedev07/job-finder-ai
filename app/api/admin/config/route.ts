import { NextRequest, NextResponse } from "next/server";
import {
  CONFIG_KEYS,
  SECRET_CONFIG_KEYS,
  getAllConfig,
  getConfig,
  isSecretConfigKey,
  secretHint,
  setConfigValue,
} from "@/lib/config";
import { MIN_ADMIN_PASSWORD_LENGTH, hashPassword } from "@/lib/adminAuth";
import { parseAiRoutes } from "@/lib/aiRoutes";

export const dynamic = "force-dynamic";

// Keys the settings page may write. Scanner settings have their own route
// (/api/admin/scanners); anything else is ignored rather than stored.
const WRITABLE_KEYS = new Set<string>(
  Object.values(CONFIG_KEYS).filter((k) => k !== CONFIG_KEYS.AI_PROVIDER),
);

export async function GET() {
  const all = await getAllConfig();
  const config = await getConfig();

  // Secrets are write-only: report only whether each is set plus a hint.
  const secrets: Record<string, { set: boolean; hint: string }> = {};
  for (const key of SECRET_CONFIG_KEYS) {
    const value = all[key] || "";
    secrets[key] = { set: value.trim().length > 0, hint: secretHint(key, value) };
  }

  return NextResponse.json({
    // Resolved provider list (handles migration from the legacy ai_provider).
    ai_providers: JSON.stringify(config.aiProviders),
    ai_routes: JSON.stringify(parseAiRoutes(config.aiRoutesRaw, config.aiProviders)),
    claude_monthly_budget_usd: String(config.claudeMonthlyBudgetUsd),
    gemini_model: all.gemini_model || "gemini-2.5-flash",
    openrouter_model: all.openrouter_model || "auto",
    openrouter_tier: config.openrouterTier,
    openrouter_paid_model: config.openrouterPaidModel,
    groq_model: all.groq_model || "llama-3.1-8b-instant",
    cerebras_model: all.cerebras_model || "llama-3.3-70b",
    cloudflare_account_id: all.cloudflare_account_id || "",
    cloudflare_model: all.cloudflare_model || "@cf/meta/llama-3.1-8b-instruct",
    google_sheet_id: all.google_sheet_id || "",
    target_market: all.target_market || "",
    current_location: all.current_location || "",
    job_analysis_prompt: all.job_analysis_prompt || "",
    sheet_columns: all.sheet_columns || "",
    linkedin_sheet_tab: all.linkedin_sheet_tab || "LinkedIn",
    profile_in_matching: all.profile_in_matching === "false" ? "false" : "true",
    review_band_min: String(config.reviewBandMin),
    review_band_max: String(config.reviewBandMax),
    followup_days: String(config.followUpDays),
    admin_password_set: !!all.admin_password || !!process.env.ADMIN_PASSWORD?.trim(),
    admin_password_from_env: !!process.env.ADMIN_PASSWORD?.trim(),
    secrets,
  });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

// PUT { key: value, ..., __clear?: string[] }
//   - non-secret keys are stored as given;
//   - a secret sent as "" (or not sent) keeps its current value — the UI never
//     sees the stored secret, so an untouched field must not wipe it;
//   - secrets listed in __clear are removed;
//   - admin_password is stored as an scrypt hash.
export async function PUT(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return badRequest("Expected an object");

  const ignored: string[] = [];
  const writes: [string, string][] = [];

  for (const [key, value] of Object.entries(body)) {
    if (key.startsWith("__")) continue;
    if (!WRITABLE_KEYS.has(key)) {
      ignored.push(key);
      continue;
    }
    if (typeof value !== "string") continue;

    if (key === CONFIG_KEYS.ADMIN_PASSWORD) {
      const password = value.trim();
      if (!password) continue;
      if (process.env.ADMIN_PASSWORD?.trim()) {
        return badRequest("The admin password is set by the ADMIN_PASSWORD env var — change it there.");
      }
      if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
        return badRequest(`The admin password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`);
      }
      writes.push([key, await hashPassword(password)]);
      continue;
    }

    if (isSecretConfigKey(key)) {
      const v = value.trim();
      // Blank, or an echo of the masked hint, means "keep the stored value".
      if (!v || v.startsWith("…") || v.startsWith("•")) continue;
      if (key === CONFIG_KEYS.GOOGLE_SHEETS_CREDENTIALS) {
        try {
          const parsed = JSON.parse(v);
          if (!parsed?.client_email || !parsed?.private_key) {
            return badRequest("The service account JSON must contain client_email and private_key.");
          }
        } catch {
          return badRequest("The service account JSON is not valid JSON.");
        }
      }
      writes.push([key, v]);
      continue;
    }

    if (key === CONFIG_KEYS.CLAUDE_MONTHLY_BUDGET_USD) {
      const n = Number(value);
      if (value.trim() !== "" && (!Number.isFinite(n) || n < 0)) {
        return badRequest("The monthly Claude budget must be a number ≥ 0 (0 = no cap).");
      }
    }
    if (key === CONFIG_KEYS.AI_ROUTES && value.trim()) {
      try {
        JSON.parse(value);
      } catch {
        return badRequest("ai_routes must be valid JSON.");
      }
    }
    writes.push([key, value]);
  }

  const clear = Array.isArray(body.__clear) ? body.__clear : [];
  for (const key of clear) {
    if (typeof key === "string" && isSecretConfigKey(key)) writes.push([key, ""]);
  }

  for (const [key, value] of writes) {
    await setConfigValue(key, value);
  }
  return NextResponse.json({ ok: true, saved: writes.map(([k]) => k), ignored });
}
