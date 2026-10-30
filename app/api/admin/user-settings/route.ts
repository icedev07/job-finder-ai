import { NextRequest, NextResponse } from "next/server";
import { FEED_KEYS } from "@/lib/scrapers";
import { adminScope, requireOneUser } from "@/lib/scope";
import { USER_KEYS, getUserConfigRaw, getUserSettings, isUserKey, setUserConfig } from "@/lib/userSettings";

export const dynamic = "force-dynamic";

// The viewed user's own settings: what the AI judges their jobs against, their
// Google Sheet and the job boards they get results from. The profile has its
// own route (/api/admin/profile).

export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const userId = requireOneUser(scope);
  if (userId instanceof NextResponse) return userId;
  const [raw, s] = await Promise.all([getUserConfigRaw(userId), getUserSettings(userId)]);
  const user = scope.users.find((u) => u.id === userId)!;
  return NextResponse.json({
    user: { id: user.id, username: user.username, name: user.name },
    target_market: s.targetMarket,
    current_location: s.currentLocation,
    job_analysis_prompt: s.jobAnalysisPrompt,
    profile_in_matching: s.profileInMatching ? "true" : "false",
    review_enabled: s.reviewEnabled ? "true" : "false",
    review_band_min: String(s.reviewBandMin),
    review_band_max: String(s.reviewBandMax),
    applications_enabled: s.applicationsEnabled ? "true" : "false",
    followup_days: String(s.followUpDays),
    google_sheet_id: s.googleSheetId,
    // Blank tab names mean the defaults ("Jobs", "LinkedIn").
    jobs_sheet_tab: (raw[USER_KEYS.JOBS_SHEET_TAB] || "").trim(),
    linkedin_sheet_tab: (raw[USER_KEYS.LINKEDIN_SHEET_TAB] || "").trim(),
    sheet_columns: s.sheetColumns,
    // "" = every board; else a JSON array of board keys.
    scan_boards: s.scanBoards == null ? "" : JSON.stringify(s.scanBoards),
  });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function intIn(value: string, min: number, max: number): boolean {
  const n = Number(value);
  return value.trim() !== "" && Number.isInteger(n) && n >= min && n <= max;
}

// PUT { key: value, ... } — only the user setting keys; anything else is ignored.
export async function PUT(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const userId = requireOneUser(scope);
  if (userId instanceof NextResponse) return userId;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return badRequest("Expected an object");

  const values: Record<string, string> = {};
  const ignored: string[] = [];
  for (const [key, value] of Object.entries(body)) {
    // The profile and the extension settings have their own routes, which check them.
    if (!isUserKey(key) || key === USER_KEYS.CANDIDATE_PROFILE || key === USER_KEYS.EXTENSION_SETTINGS || typeof value !== "string") {
      ignored.push(key);
      continue;
    }
    values[key] = key === USER_KEYS.JOB_ANALYSIS_PROMPT || key === USER_KEYS.SHEET_COLUMNS ? value : value.trim();
  }

  // The AI judges every job against these two, so they can't be blanked.
  if (values.target_market !== undefined && !values.target_market) return badRequest("Set a target market.");
  if (values.current_location !== undefined && !values.current_location) {
    return badRequest("Set where the user is based.");
  }
  const current = await getUserSettings(userId);
  const min = values.review_band_min ?? String(current.reviewBandMin);
  const max = values.review_band_max ?? String(current.reviewBandMax);
  if (!intIn(min, 0, 100) || !intIn(max, 0, 100) || Number(min) > Number(max)) {
    return badRequest("The review band must be two scores 0–100 with min ≤ max.");
  }
  if (values.followup_days !== undefined && !intIn(values.followup_days, 1, 60)) {
    return badRequest("Follow-up days must be a whole number from 1 to 60.");
  }
  for (const key of ["profile_in_matching", "review_enabled", "applications_enabled"] as const) {
    if (values[key] !== undefined && !["true", "false"].includes(values[key])) {
      return badRequest(`${key} must be "true" or "false".`);
    }
  }
  if (values.sheet_columns?.trim()) {
    try {
      const cols = JSON.parse(values.sheet_columns);
      if (!Array.isArray(cols)) throw new Error("not an array");
    } catch {
      return badRequest("Sheet columns must be a JSON array (or blank for the defaults).");
    }
  }
  if (values.scan_boards) {
    let boards: unknown;
    try {
      boards = JSON.parse(values.scan_boards);
    } catch {
      return badRequest("scan_boards must be a JSON array of board keys.");
    }
    if (!Array.isArray(boards) || boards.some((b) => typeof b !== "string" || !FEED_KEYS.includes(b))) {
      return badRequest(`scan_boards may only list these boards: ${FEED_KEYS.join(", ")}.`);
    }
    values.scan_boards = JSON.stringify([...new Set(boards as string[])]);
  }

  const saved = await setUserConfig(userId, values);
  return NextResponse.json({ ok: true, saved, ignored });
}
