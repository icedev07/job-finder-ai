import { prisma } from "./prisma";
import { DEFAULT_ANALYSIS_PROMPT } from "./defaultPrompt";

// A user's own settings: what the AI judges their jobs against, their Google
// Sheet, their profile and which job boards they get results from. One
// UserConfig row per key; a missing key means the default below. App-wide
// settings (AI providers and keys, board set-up, the Sheets service account)
// stay in AppConfig (lib/config.ts).

export const USER_KEYS = {
  TARGET_MARKET: "target_market",
  CURRENT_LOCATION: "current_location",
  JOB_ANALYSIS_PROMPT: "job_analysis_prompt",
  // "false" keeps the profile out of the job-matching prompts.
  PROFILE_IN_MATCHING: "profile_in_matching",
  // JSON CandidateProfile (lib/profileModel.ts) — written by /api/admin/profile.
  CANDIDATE_PROFILE: "candidate_profile",
  // Score band whose verdicts land in the Review queue (inclusive).
  REVIEW_BAND_MIN: "review_band_min",
  REVIEW_BAND_MAX: "review_band_max",
  // Days after "Applied" before a follow-up is due.
  FOLLOWUP_DAYS: "followup_days",
  GOOGLE_SHEET_ID: "google_sheet_id",
  JOBS_SHEET_TAB: "jobs_sheet_tab",
  LINKEDIN_SHEET_TAB: "linkedin_sheet_tab",
  SHEET_COLUMNS: "sheet_columns",
  // JSON array of the board keys this user gets results from; missing = every board.
  SCAN_BOARDS: "scan_boards",
  // JSON ExtensionSettings (lib/extensionSettings.ts): how the Chrome extension
  // scans LinkedIn for this user. Written by the popup and Admin → Extension.
  EXTENSION_SETTINGS: "extension_settings",
} as const;

export type UserKey = (typeof USER_KEYS)[keyof typeof USER_KEYS];
export const USER_KEY_LIST = Object.values(USER_KEYS) as UserKey[];

export function isUserKey(key: string): key is UserKey {
  return (USER_KEY_LIST as string[]).includes(key);
}

/** The search options a new user can copy from an existing one (not the profile, sheet or rules). */
export const SEARCH_KEYS: UserKey[] = [
  USER_KEYS.TARGET_MARKET,
  USER_KEYS.CURRENT_LOCATION,
  USER_KEYS.JOB_ANALYSIS_PROMPT,
  USER_KEYS.PROFILE_IN_MATCHING,
  USER_KEYS.REVIEW_BAND_MIN,
  USER_KEYS.REVIEW_BAND_MAX,
  USER_KEYS.FOLLOWUP_DAYS,
  USER_KEYS.SCAN_BOARDS,
  USER_KEYS.EXTENSION_SETTINGS,
];

export type UserSettings = {
  targetMarket: string;
  currentLocation: string;
  /** "" = the built-in prompt. */
  jobAnalysisPrompt: string;
  profileInMatching: boolean;
  reviewBandMin: number;
  reviewBandMax: number;
  followUpDays: number;
  googleSheetId: string;
  jobsSheetTab: string;
  linkedinSheetTab: string;
  sheetColumns: string;
  /** Board keys this user gets results from; null = every board. */
  scanBoards: string[] | null;
};

// Read on every analysis and scan, so cached briefly per user (like AppConfig).
const cache = new Map<number, { values: Record<string, string>; expiresAt: number }>();
const TTL_MS = 10_000;

export function invalidateUserSettings(userId?: number): void {
  if (userId == null) cache.clear();
  else cache.delete(userId);
}

export async function getUserConfigRaw(userId: number): Promise<Record<string, string>> {
  const hit = cache.get(userId);
  if (hit && hit.expiresAt > Date.now()) return hit.values;
  const rows = await prisma.userConfig.findMany({ where: { userId } });
  const values: Record<string, string> = {};
  for (const r of rows) values[r.key] = r.value;
  cache.set(userId, { values, expiresAt: Date.now() + TTL_MS });
  return values;
}

function clampInt(raw: string | undefined, min: number, max: number, fallback: number): number {
  const n = Number(raw);
  if (raw == null || raw.trim() === "" || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function parseScanBoards(raw: string | undefined): string[] | null {
  if (raw == null || raw.trim() === "") return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((b): b is string => typeof b === "string");
  } catch {
    // unreadable — every board
  }
  return null;
}

export async function getUserSettings(userId: number): Promise<UserSettings> {
  const v = await getUserConfigRaw(userId);
  const prompt = v[USER_KEYS.JOB_ANALYSIS_PROMPT] || "";
  return {
    targetMarket: (v[USER_KEYS.TARGET_MARKET] || "").trim(),
    currentLocation: (v[USER_KEYS.CURRENT_LOCATION] || "").trim(),
    // A saved copy of the built-in prompt is the built-in prompt: it keeps
    // getting improvements.
    jobAnalysisPrompt: prompt.trim() === DEFAULT_ANALYSIS_PROMPT.trim() ? "" : prompt,
    profileInMatching: v[USER_KEYS.PROFILE_IN_MATCHING] !== "false",
    // Verdicts scored inside this band go to the Review queue: close to the
    // approval line (60), where a quick human check helps most.
    reviewBandMin: clampInt(v[USER_KEYS.REVIEW_BAND_MIN], 0, 100, 45),
    reviewBandMax: clampInt(v[USER_KEYS.REVIEW_BAND_MAX], 0, 100, 70),
    followUpDays: clampInt(v[USER_KEYS.FOLLOWUP_DAYS], 1, 60, 7),
    googleSheetId: (v[USER_KEYS.GOOGLE_SHEET_ID] || "").trim(),
    jobsSheetTab: (v[USER_KEYS.JOBS_SHEET_TAB] || "").trim() || "Jobs",
    linkedinSheetTab: (v[USER_KEYS.LINKEDIN_SHEET_TAB] || "").trim() || "LinkedIn",
    sheetColumns: v[USER_KEYS.SHEET_COLUMNS] || "",
    scanBoards: parseScanBoards(v[USER_KEYS.SCAN_BOARDS]),
  };
}

export async function setUserConfig(userId: number, values: Record<string, string>): Promise<string[]> {
  const saved: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    if (!isUserKey(key)) continue;
    await prisma.userConfig.upsert({
      where: { userId_key: { userId, key } },
      update: { value },
      create: { userId, key, value },
    });
    saved.push(key);
  }
  invalidateUserSettings(userId);
  return saved;
}

/** Whether the board's results are wanted by this user. */
export function wantsBoard(settings: UserSettings, board: string): boolean {
  return settings.scanBoards == null || settings.scanBoards.includes(board);
}

// What the AI is told when a user has not filled these in yet. New users get
// them in the Add user dialog, so these are a last resort.
export function promptLocation(settings: UserSettings): string {
  return settings.currentLocation || "an unspecified country";
}

export function promptMarket(settings: UserSettings): string {
  return settings.targetMarket || "remote roles open worldwide";
}

/** Copy one user's set-up to another (Add user → "Copy from"). Never their jobs. */
export async function copyUserSetup(
  fromId: number,
  toId: number,
  parts: { search?: boolean; rules?: boolean; profile?: boolean },
): Promise<void> {
  if (parts.search) {
    const rows = await prisma.userConfig.findMany({ where: { userId: fromId, key: { in: SEARCH_KEYS } } });
    if (rows.length) {
      await prisma.userConfig.createMany({
        data: rows.map((r) => ({ userId: toId, key: r.key, value: r.value })),
        skipDuplicates: true,
      });
    }
  }
  if (parts.rules) {
    const rules = await prisma.skipRule.findMany({ where: { userId: fromId } });
    if (rules.length) {
      await prisma.skipRule.createMany({
        data: rules.map((r) => ({ userId: toId, type: r.type, pattern: r.pattern, active: r.active })),
      });
    }
  }
  if (parts.profile) {
    const profile = await prisma.userConfig.findUnique({
      where: { userId_key: { userId: fromId, key: USER_KEYS.CANDIDATE_PROFILE } },
    });
    if (profile) {
      await prisma.userConfig.upsert({
        where: { userId_key: { userId: toId, key: USER_KEYS.CANDIDATE_PROFILE } },
        update: { value: profile.value },
        create: { userId: toId, key: USER_KEYS.CANDIDATE_PROFILE, value: profile.value },
      });
    }
    const resumes = await prisma.resume.findMany({ where: { userId: fromId } });
    for (const r of resumes) {
      await prisma.resume.create({
        data: {
          userId: toId,
          name: r.name,
          fileName: r.fileName,
          mimeType: r.mimeType,
          sizeBytes: r.sizeBytes,
          data: r.data,
          textContent: r.textContent,
          parsed: r.parsed,
          tags: r.tags,
          isDefault: r.isDefault,
        },
      });
    }
    const answers = await prisma.savedAnswer.findMany({ where: { userId: fromId } });
    if (answers.length) {
      await prisma.savedAnswer.createMany({
        data: answers.map((a) => ({ userId: toId, question: a.question, answer: a.answer, tags: a.tags })),
      });
    }
  }
  invalidateUserSettings(toId);
}
