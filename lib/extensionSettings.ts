import { USER_KEYS, getUserConfigRaw, setUserConfig } from "./userSettings";

// How the Chrome extension scans LinkedIn for a user. Kept on the server, so a
// user gets the same settings in every browser they sign in from, and admins
// can see and change them on Admin → Extension. The popup keeps a copy in
// chrome.storage for the scan itself.

export type EasyApplyMode = "skip" | "analyze";

export type ExtensionSettings = {
  /** "skip": reject and hide Easy Apply jobs without AI; "analyze": judge them like other jobs. */
  easyApplyMode: EasyApplyMode;
  /** With "analyze": the score an Easy Apply job needs to be approved; 0 = the usual bar. */
  easyApplyMinScore: number;
  /** Stop after this many jobs; -1 = no limit. */
  jobLimit: number;
  /** Also hide approved jobs on LinkedIn. */
  hideApproved: boolean;
  /** Scan LinkedIn's chat-style AI search page instead of the classic results. */
  betaMode: boolean;
  /** Upload the scan's log to Logs → Extension at the end of each scan. */
  sendLogs: boolean;
};

export const DEFAULT_JOB_LIMIT = 100;

export const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
  easyApplyMode: "skip",
  easyApplyMinScore: 0,
  jobLimit: DEFAULT_JOB_LIMIT,
  hideApproved: false,
  betaMode: false,
  sendLogs: false,
};

// The same rules as the popup: -1 = every job, 1 or more = that many, anything else the default.
function jobLimit(raw: unknown, fallback: number): number {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  if (i === -1) return -1;
  return i >= 1 ? Math.min(i, 100_000) : fallback;
}

function score(raw: unknown, fallback: number): number {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() ? Number(raw) : NaN;
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
}

function bool(raw: unknown, fallback: boolean): boolean {
  return typeof raw === "boolean" ? raw : fallback;
}

/** `raw` over `base`, field by field: anything missing or malformed keeps the base value. */
export function normalizeExtensionSettings(raw: unknown, base: ExtensionSettings = DEFAULT_EXTENSION_SETTINGS): ExtensionSettings {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    easyApplyMode: r.easyApplyMode === "analyze" || r.easyApplyMode === "skip" ? r.easyApplyMode : base.easyApplyMode,
    easyApplyMinScore: score(r.easyApplyMinScore, base.easyApplyMinScore),
    jobLimit: jobLimit(r.jobLimit, base.jobLimit),
    hideApproved: bool(r.hideApproved, base.hideApproved),
    betaMode: bool(r.betaMode, base.betaMode),
    sendLogs: bool(r.sendLogs, base.sendLogs),
  };
}

export async function getExtensionSettings(userId: number): Promise<ExtensionSettings> {
  const raw = (await getUserConfigRaw(userId))[USER_KEYS.EXTENSION_SETTINGS];
  if (!raw) return { ...DEFAULT_EXTENSION_SETTINGS };
  try {
    return normalizeExtensionSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_EXTENSION_SETTINGS };
  }
}

/** Change some settings; the rest stay as they are. Returns the saved settings. */
export async function saveExtensionSettings(userId: number, patch: unknown): Promise<ExtensionSettings> {
  const next = normalizeExtensionSettings(patch, await getExtensionSettings(userId));
  await setUserConfig(userId, { [USER_KEYS.EXTENSION_SETTINGS]: JSON.stringify(next) });
  return next;
}
