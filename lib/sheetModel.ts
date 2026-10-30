// Where a user's approved jobs go in Google Sheets, shared by the server and
// the admin UI (no server imports).
//
// One service account writes every spreadsheet. A user's jobs go to the
// shared spreadsheet the admin sets for everyone (their own two tabs in it,
// named after them), to a spreadsheet of their own, or nowhere.

export const SHEET_MODES = ["shared", "own", "off"] as const;
export type SheetMode = (typeof SHEET_MODES)[number];

export function isSheetMode(value: unknown): value is SheetMode {
  return typeof value === "string" && (SHEET_MODES as readonly string[]).includes(value);
}

/** The saved choice, else their own spreadsheet when they have one, else the shared one. */
export function resolveSheetMode(saved: string | undefined, ownId: string): SheetMode {
  if (isSheetMode(saved)) return saved;
  return ownId ? "own" : "shared";
}

/** The last delivery to a user's sheet, or the last test of it (written by the server). */
export type SheetStatus = {
  at: string;
  ok: boolean;
  /** Jobs added (0 for a test). */
  sent: number;
  /** The tabs it wrote to. */
  tabs: string[];
  /** What went wrong and what to do (when not ok). */
  error?: string;
};

export function parseSheetStatus(raw: string | undefined): SheetStatus | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (s && typeof s.at === "string" && typeof s.ok === "boolean") {
      return {
        at: s.at,
        ok: s.ok,
        sent: Number(s.sent) || 0,
        tabs: Array.isArray(s.tabs) ? s.tabs.map(String) : [],
        ...(s.error ? { error: String(s.error) } : {}),
      };
    }
  } catch {
    // unreadable: as if nothing was sent yet
  }
  return null;
}

/**
 * The spreadsheet's id from what was pasted: its link
 * (https://docs.google.com/spreadsheets/d/<id>/edit#gid=0) or the id itself.
 * "" when blank, null when it is neither.
 */
export function spreadsheetIdFrom(input: string): string | null {
  const s = input.trim();
  if (!s) return "";
  const link = s.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)/);
  if (link) return link[1];
  return /^[A-Za-z0-9_-]+$/.test(s) ? s : null;
}

export const SPREADSHEET_LINK_HINT =
  "Paste the spreadsheet's link (https://docs.google.com/spreadsheets/d/…) or its ID.";

export function spreadsheetUrl(id: string): string {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/edit`;
}

/** A user's name for a tab name: without the characters a tab name cannot have. */
function forTab(text: string): string {
  return text
    .replace(/[[\]*?/\\:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/**
 * The tabs a user's jobs go to: the names saved in their settings, else
 * "Jobs" and "LinkedIn" in their own spreadsheet, and "<name> – Jobs" and
 * "<name> – LinkedIn" in the shared one.
 */
export function sheetTabs(mode: SheetMode, saved: { jobs: string; linkedin: string }, who: string): { jobs: string; linkedin: string } {
  const prefix = mode === "shared" ? `${forTab(who) || "User"} – ` : "";
  return {
    jobs: saved.jobs.trim() || `${prefix}Jobs`,
    linkedin: saved.linkedin.trim() || `${prefix}LinkedIn`,
  };
}

/**
 * Whose tabs these are in the shared spreadsheet: the user's name, with their
 * user ID when someone added before them has the same name (so the tabs of
 * the first one never move).
 */
export function sheetOwnerName(
  user: { id: number; username: string; name: string },
  everyone: { id: number; name: string }[],
): string {
  const name = user.name.trim() || user.username;
  const twin = everyone.some((u) => u.id < user.id && u.name.trim().toLowerCase() === name.toLowerCase());
  return twin ? `${name} (${user.username})` : name;
}

export type SheetPlan =
  | { ok: true; mode: "shared" | "own"; spreadsheetId: string; jobsTab: string; linkedinTab: string }
  | { ok: false; mode: SheetMode; reason: string };

/** Where a user's jobs go, or why they go nowhere. */
export function sheetPlan(p: {
  mode: SheetMode;
  ownId: string;
  sharedId: string;
  serviceAccount: boolean;
  tabs: { jobs: string; linkedin: string };
  who: string;
}): SheetPlan {
  if (p.mode === "off") {
    return { ok: false, mode: "off", reason: "the Google Sheet is off for this user (Settings → Google Sheet)." };
  }
  if (!p.serviceAccount) {
    return { ok: false, mode: p.mode, reason: "there is no Google service account yet (Settings → Google Sheets)." };
  }
  const spreadsheetId = p.mode === "shared" ? p.sharedId : p.ownId;
  if (!spreadsheetId) {
    return {
      ok: false,
      mode: p.mode,
      reason:
        p.mode === "shared"
          ? "there is no shared spreadsheet yet (Settings → Google Sheets)."
          : "this user's own spreadsheet is not set (Settings → Google Sheet).",
    };
  }
  const tabs = sheetTabs(p.mode, p.tabs, p.who);
  return { ok: true, mode: p.mode, spreadsheetId, jobsTab: tabs.jobs, linkedinTab: tabs.linkedin };
}

/** Where a user's jobs go, or why nowhere, from their settings and the app's (no server imports, so pages can use it). */
export function planFor(
  user: { id: number; username: string; name: string },
  settings: { sheetMode: SheetMode; googleSheetId: string; jobsSheetTab: string; linkedinSheetTab: string },
  config: { googleSheetsCredentials: string; sharedSheetId: string },
  everyone: { id: number; name: string }[],
): SheetPlan {
  return sheetPlan({
    mode: settings.sheetMode,
    ownId: settings.googleSheetId,
    sharedId: config.sharedSheetId,
    serviceAccount: !!config.googleSheetsCredentials,
    tabs: { jobs: settings.jobsSheetTab, linkedin: settings.linkedinSheetTab },
    who: sheetOwnerName(user, everyone),
  });
}

/** The service account's e-mail ("" when the JSON has none). */
export function serviceAccountEmail(credentialsJson: string): string {
  try {
    const email = JSON.parse(credentialsJson)?.client_email;
    return typeof email === "string" ? email : "";
  } catch {
    return "";
  }
}
