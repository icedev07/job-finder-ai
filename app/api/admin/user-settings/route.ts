import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { FEED_KEYS } from "@/lib/scrapers";
import { adminScope, requireOneUser } from "@/lib/scope";
import {
  SPREADSHEET_LINK_HINT,
  isSheetMode,
  planFor,
  serviceAccountEmail,
  sheetOwnerName,
  sheetTabs,
  spreadsheetIdFrom,
} from "@/lib/sheetModel";
import { USER_KEYS, getUserConfigRaw, getUserSettings, invalidateUserSettings, isUserKey, setUserConfig } from "@/lib/userSettings";

export const dynamic = "force-dynamic";

// The viewed user's own settings: what the AI judges their jobs against, their
// Google Sheet and the job boards they get results from. The profile has its
// own route (/api/admin/profile).

export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const userId = requireOneUser(scope);
  if (userId instanceof NextResponse) return userId;
  // The settings as saved (the last delivery is written by other instances).
  invalidateUserSettings(userId);
  const [raw, config, unsent] = await Promise.all([
    getUserConfigRaw(userId),
    getConfig(),
    prisma.scrapedJob.count({ where: { userId, status: "APPROVED", sheetSynced: false } }),
  ]);
  const s = await getUserSettings(userId);
  const user = scope.users.find((u) => u.id === userId)!;
  const who = sheetOwnerName(user, scope.users);
  const plan = planFor(user, s, config, scope.users);
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
    saved_reminder_days: String(s.savedReminderDays),
    no_answer_days: String(s.noAnswerDays),
    sheet_mode: s.sheetMode,
    google_sheet_id: s.googleSheetId,
    // Blank tab names mean the defaults for the mode (see `sheet`).
    jobs_sheet_tab: (raw[USER_KEYS.JOBS_SHEET_TAB] || "").trim(),
    linkedin_sheet_tab: (raw[USER_KEYS.LINKEDIN_SHEET_TAB] || "").trim(),
    sheet_columns: s.sheetColumns,
    // Where the jobs go now (or why nowhere), the default tab names in each
    // kind of spreadsheet, the last delivery and the shared spreadsheet.
    sheet: {
      who,
      plan,
      defaults: {
        shared: sheetTabs("shared", { jobs: "", linkedin: "" }, who),
        own: sheetTabs("own", { jobs: "", linkedin: "" }, who),
      },
      status: s.sheetStatus,
      unsent,
      sharedSheetId: config.sharedSheetId,
      serviceAccount: serviceAccountEmail(config.googleSheetsCredentials),
    },
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
    // The profile and the extension settings have their own routes, which check
    // them; the sheet's last delivery is written by the app.
    if (
      !isUserKey(key) ||
      key === USER_KEYS.CANDIDATE_PROFILE ||
      key === USER_KEYS.EXTENSION_SETTINGS ||
      key === USER_KEYS.SHEET_STATUS ||
      typeof value !== "string"
    ) {
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
  if (values.saved_reminder_days !== undefined && !intIn(values.saved_reminder_days, 0, 90)) {
    return badRequest("Days in Saved must be a whole number from 0 (never) to 90.");
  }
  if (values.no_answer_days !== undefined && !intIn(values.no_answer_days, 0, 180)) {
    return badRequest("Days without an answer must be a whole number from 0 (never) to 180.");
  }
  for (const key of ["profile_in_matching", "review_enabled", "applications_enabled"] as const) {
    if (values[key] !== undefined && !["true", "false"].includes(values[key])) {
      return badRequest(`${key} must be "true" or "false".`);
    }
  }
  if (values.sheet_mode !== undefined && !isSheetMode(values.sheet_mode)) {
    return badRequest('sheet_mode must be "shared", "own" or "off".');
  }
  if (values.google_sheet_id !== undefined) {
    // A pasted link is kept as the spreadsheet's id.
    const id = spreadsheetIdFrom(values.google_sheet_id);
    if (id === null) return badRequest(`Their own spreadsheet: ${SPREADSHEET_LINK_HINT}`);
    values.google_sheet_id = id;
  }
  if (values.sheet_mode === "own" && !(values.google_sheet_id ?? current.googleSheetId)) {
    return badRequest("Paste the link of their own spreadsheet, or choose the shared spreadsheet.");
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
