import { google, type sheets_v4 } from "googleapis";
import type { ScrapedJob } from "../generated/prisma";
import { getConfig, getSheetColumns, invalidateConfigCache } from "./config";
import { stageText } from "./format";
import { prisma } from "./prisma";
import { planFor, serviceAccountEmail, type SheetPlan, type SheetStatus } from "./sheetModel";
import { activeUsers, listUsersWith } from "./users";
import { getUserSettings, invalidateUserSettings, setUserConfig, USER_KEYS, type UserSettings } from "./userSettings";

// Approved jobs go to the Google Sheet of the user they were found for: board
// jobs to their Jobs tab, LinkedIn jobs to their LinkedIn tab. One service
// account (app-wide) writes every sheet. A user's jobs go to the shared
// spreadsheet the admin sets for everyone (their own two tabs there, named
// after them), to a spreadsheet of their own, or nowhere (lib/sheetModel.ts).
// A missing tab is created on first use.
//
// sheetSynced means "the job has a row in its user's sheet". The AI's
// approvals are sent when each scan ends (and LinkedIn ones as the extension
// finds them); a job approved by hand is sent right away. Rows are never
// deleted, so a job rejected later keeps its row and is not sent again if
// approved once more.
//
// For users with Applications on, both tabs get a Stage column (found by its
// header, added at the end when missing) that follows the board: a row is
// written with the job's stage, and moving the job updates its cell. The row
// is found by the job's link and title (or its title and company).
//
// Every delivery is noted in the user's settings (sheet_status): when, how many
// jobs and where, or what went wrong and what to do about it. Settings, Setup,
// the status bar and a job's panel show it.

function getAuth(credentialsJson: string) {
  const credentials = JSON.parse(credentialsJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

/** A1 notation with the tab name quoted, so names with spaces work ("'Jobs Anna'!A1"). */
function a1(tab: string, range: string): string {
  return `'${tab.replace(/'/g, "''")}'!${range}`;
}

/** 0 → "A", 25 → "Z", 26 → "AA". */
function columnLetter(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Every column a header row can reach.
const ALL_COLUMNS = "A:ZZ";
const HEADER_ROW = "A1:ZZ1";
const STAGE_HEADER = "Stage";

function isStageHeader(cell: unknown): boolean {
  return String(cell ?? "").trim().toLowerCase() === "stage";
}

type StagedJob = { stage: string | null; closeReason: string | null };

/** The row with the job's stage in the Stage column (when the tab has one). */
function withStage(row: string[], stageCol: number, job: StagedJob): string[] {
  if (stageCol < 0) return row;
  while (row.length <= stageCol) row.push("");
  row[stageCol] = stageText(job.stage, job.closeReason);
  return row;
}

/**
 * The tab's header row, written when the tab is empty, with a Stage column
 * added at the end for users with Applications on. Returns the header and the
 * Stage column (-1: none).
 */
async function headerWithStage(target: SheetTarget, tab: string, fresh: string[]): Promise<{ header: string[]; stageCol: number }> {
  const { sheets, spreadsheetId, settings } = target;
  const stages = settings.applicationsEnabled;
  const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range: a1(tab, HEADER_ROW) }).catch(() => null);
  let header = (existing?.data?.values?.[0] ?? []).map((v) => String(v ?? ""));
  if (header.length === 0) {
    header = stages && !fresh.some(isStageHeader) ? [...fresh, STAGE_HEADER] : fresh;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: a1(tab, "A1"),
      valueInputOption: "RAW",
      requestBody: { values: [header] },
    });
  }
  if (!stages) return { header, stageCol: -1 };
  let stageCol = header.findIndex(isStageHeader);
  if (stageCol < 0) {
    stageCol = header.length;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: a1(tab, `${columnLetter(stageCol)}1`),
      valueInputOption: "RAW",
      requestBody: { values: [[STAGE_HEADER]] },
    });
    header = [...header, STAGE_HEADER];
  }
  return { header, stageCol };
}

type SheetTarget = {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  settings: UserSettings;
  jobsTab: string;
  linkedinTab: string;
  /** The service account's e-mail: what to share the spreadsheet with. */
  serviceAccount: string;
};

type SheetConfig = { googleSheetsCredentials: string; sharedSheetId: string };

/**
 * fresh: read the settings again instead of this server instance's copy (up to
 * 10 s old), for what an admin starts by hand right after changing them: on
 * Vercel the settings are saved by another instance, whose copy is the only one
 * refreshed.
 */
async function loadPlan(userId: number, fresh = false): Promise<{ plan: SheetPlan; settings: UserSettings; config: SheetConfig }> {
  if (fresh) {
    invalidateConfigCache();
    invalidateUserSettings(userId);
  }
  const [config, settings, everyone] = await Promise.all([getConfig(), getUserSettings(userId), listUsersWith(userId)]);
  const user = everyone.find((u) => u.id === userId);
  const plan: SheetPlan = user
    ? planFor(user, settings, config, everyone)
    : { ok: false, mode: settings.sheetMode, reason: "this user no longer exists." };
  return { plan, settings, config };
}

/** Where this user's jobs go, or why nowhere. */
export async function userSheetPlan(userId: number): Promise<SheetPlan> {
  return (await loadPlan(userId)).plan;
}

/** The user's sheet, or null when their jobs go nowhere (Sheets is off for them, or not set up). */
export async function sheetTargetFor(userId: number): Promise<SheetTarget | null> {
  const { plan, settings, config } = await loadPlan(userId);
  if (!plan.ok) return null;
  return {
    sheets: google.sheets({ version: "v4", auth: getAuth(config.googleSheetsCredentials) }),
    spreadsheetId: plan.spreadsheetId,
    settings,
    jobsTab: plan.jobsTab,
    linkedinTab: plan.linkedinTab,
    serviceAccount: serviceAccountEmail(config.googleSheetsCredentials),
  };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function clipText(text: string, max = 160): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** What went wrong with a user's sheet, and what to do about it. */
export function sheetProblem(err: unknown, serviceAccount: string): string {
  const e = err as { status?: unknown; response?: { status?: unknown; data?: any }; message?: unknown } | null;
  const status = Number(e?.response?.status ?? e?.status) || 0;
  const data = e?.response?.data;
  const raw = String(
    (typeof data?.error === "object" ? data.error?.message : data?.error_description) ?? e?.message ?? err ?? "",
  ).trim();
  if (err instanceof SyntaxError) {
    return "The service account JSON can't be read: paste the whole key file again (Settings → Google Sheets).";
  }
  if (/has not been used in project|it is disabled|SERVICE_DISABLED|accessNotConfigured/i.test(raw)) {
    const link = raw.match(/https:\/\/console\.(?:developers|cloud)\.google\.com\/\S+/)?.[0]?.replace(/[.,)]+$/, "");
    return `The Google Sheets API is off in the service account's Google Cloud project: turn it on${link ? ` at ${link}` : " (APIs & Services → Library → Google Sheets API)"}, wait a minute and try again.`;
  }
  if (/not supported for this document/i.test(raw)) {
    return "This is an Excel file in Google Drive, not a Google Sheet: open it, choose File → Save as Google Sheets, and use the new sheet's link.";
  }
  if (/invalid_grant|invalid_client|unauthorized_client|Invalid JWT|account not found/i.test(raw) || status === 401) {
    return `Google refused the service account's key (${clipText(raw, 80)}): create a new key for it in Google Cloud and paste it under Settings → Google Sheets.`;
  }
  if (status === 403 || /caller does not have permission|PERMISSION_DENIED/i.test(raw)) {
    return `The service account can't edit this spreadsheet: share it with ${serviceAccount || "the service account's e-mail (Settings → Google Sheets)"} as Editor.`;
  }
  if (status === 404 || /Requested entity was not found|NOT_FOUND/i.test(raw)) {
    return "The spreadsheet was not found: check its link or ID, and that it still exists.";
  }
  if (status === 429 || /quota|rate limit/i.test(raw)) {
    return "Google's limit on Sheets requests was reached: the jobs go with the next delivery.";
  }
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up|network|timed? ?out/i.test(raw)) {
    return `Google could not be reached (${clipText(raw, 80)}): the jobs go with the next delivery.`;
  }
  return clipText(raw) || "Unknown error";
}

/** Note how the last delivery to the user's sheet went (never throws). */
async function note(userId: number, status: Omit<SheetStatus, "at">): Promise<void> {
  try {
    const value: SheetStatus = { at: new Date().toISOString(), ...status };
    await setUserConfig(userId, { [USER_KEYS.SHEET_STATUS]: JSON.stringify(value) });
  } catch (err) {
    console.error(`[sheets] noting the delivery of user #${userId} failed: ${(err as Error)?.message || err}`);
  }
}

/** Note a failure for the user (the caller logs it); returns what went wrong and what to do. */
async function noteFailure(userId: number, err: unknown, serviceAccount: string): Promise<string> {
  const error = sheetProblem(err, serviceAccount);
  await note(userId, { ok: false, sent: 0, tabs: [], error });
  return error;
}

// Tabs known to exist, per spreadsheet (for the life of the server instance).
const knownTabs = new Map<string, Set<string>>();

async function tabTitles(target: SheetTarget): Promise<Set<string>> {
  const meta = await target.sheets.spreadsheets.get({
    spreadsheetId: target.spreadsheetId,
    fields: "sheets.properties.title",
  });
  return new Set((meta.data.sheets ?? []).map((s) => s.properties?.title ?? ""));
}

async function ensureTab(target: SheetTarget, tab: string): Promise<boolean> {
  const known = knownTabs.get(target.spreadsheetId);
  if (known?.has(tab)) return false;
  const titles = await tabTitles(target);
  let created = false;
  if (!titles.has(tab)) {
    try {
      await target.sheets.spreadsheets.batchUpdate({
        spreadsheetId: target.spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
      });
      created = true;
    } catch (err) {
      // Another server instance may have just added it.
      if (!(await tabTitles(target)).has(tab)) throw err;
    }
    titles.add(tab);
  }
  knownTabs.set(target.spreadsheetId, titles);
  return created;
}

const APPEND_BATCH = 50;

/** Append rows (one per job), marking each batch as in the sheet once it is there. */
async function appendRows(target: SheetTarget, range: string, rows: string[][], jobIds: number[]): Promise<void> {
  for (let i = 0; i < rows.length; i += APPEND_BATCH) {
    await target.sheets.spreadsheets.values.append({
      spreadsheetId: target.spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: rows.slice(i, i + APPEND_BATCH) },
    });
    await prisma.scrapedJob.updateMany({
      where: { id: { in: jobIds.slice(i, i + APPEND_BATCH) } },
      data: { sheetSynced: true },
    });
  }
}

function getJobValue(job: Record<string, any>, key: string): string {
  if (key === "createdAt") return job.createdAt?.toISOString?.()?.split("T")[0] || String(job.createdAt || "");
  if (key === "aiScore") return job.aiScore != null ? String(job.aiScore) : "";
  // For LinkedIn, `url` is the linkedin.com viewer link; the real company
  // apply page is in `manualApplyUrl`. For other sources, manualApplyUrl is
  // usually empty and `url` already points to the apply page. Preferring the
  // manual apply when present makes the sheet usable without the user having
  // to click through linkedin first.
  if (key === "url") return String(job.manualApplyUrl || job.url || "");
  if (key === "applyMethod") return applyViaLabel(job.applyMethod);
  if (key === "stage") return stageText(job.stage, job.closeReason);
  return String(job[key] ?? "");
}

type SheetColumn = { key: string; label: string };

/** Append board jobs to the user's Jobs tab, with the header row first on an empty tab. */
async function appendToJobsTab(target: SheetTarget, jobs: ScrapedJob[]): Promise<void> {
  const tab = target.jobsTab;
  const columns: SheetColumn[] = getSheetColumns(target.settings.sheetColumns);
  await ensureTab(target, tab);
  const { stageCol } = await headerWithStage(target, tab, columns.map((c) => c.label));

  const rows = jobs.map((job) => withStage(columns.map((col) => getJobValue(job, col.key)), stageCol, job));
  await appendRows(target, a1(tab, ALL_COLUMNS), rows, jobs.map((j) => j.id));
}

/** Approved jobs not in the sheet yet, each to its tab: LinkedIn jobs to the LinkedIn tab, the rest to the Jobs tab. Returns the tabs written. */
async function appendApproved(target: SheetTarget, jobs: ScrapedJob[]): Promise<string[]> {
  const send = async (list: ScrapedJob[]) => {
    const boards = list.filter((j) => j.platform !== "linkedin");
    const linkedin = list.filter((j) => j.platform === "linkedin");
    if (boards.length) await appendToJobsTab(target, boards);
    if (linkedin.length) await appendToLinkedInTab(target, linkedin);
  };
  try {
    await send(jobs);
  } catch (err) {
    // A tab deleted by hand since this server instance last saw it: look again, once.
    if (!/Unable to parse range/i.test(String((err as Error)?.message ?? err))) throw err;
    knownTabs.delete(target.spreadsheetId);
    // Only the jobs not marked yet: the retry must not add a row twice.
    const left = await prisma.scrapedJob.findMany({ where: { id: { in: jobs.map((j) => j.id) }, sheetSynced: false }, select: { id: true } });
    const ids = new Set(left.map((j) => j.id));
    await send(jobs.filter((j) => ids.has(j.id)));
  }
  const tabs: string[] = [];
  if (jobs.some((j) => j.platform !== "linkedin")) tabs.push(target.jobsTab);
  if (jobs.some((j) => j.platform === "linkedin")) tabs.push(target.linkedinTab);
  return tabs;
}

/** Send jobs to the user's sheet and note how it went (a failure is noted, then thrown with what to do). */
async function deliver(userId: number, target: SheetTarget, jobs: ScrapedJob[]): Promise<number> {
  try {
    const tabs = await appendApproved(target, jobs);
    await note(userId, { ok: true, sent: jobs.length, tabs });
    return jobs.length;
  } catch (err) {
    throw new Error(await noteFailure(userId, err, target.serviceAccount));
  }
}

/** Send one user's approved jobs that are not in their sheet yet. */
async function syncUserApprovedJobs(userId: number, target: SheetTarget): Promise<number> {
  const jobs = await prisma.scrapedJob.findMany({
    where: { userId, status: "APPROVED", sheetSynced: false },
    orderBy: { createdAt: "asc" },
  });
  return jobs.length ? deliver(userId, target, jobs) : 0;
}

// Every write to the sheets from this server instance runs after the one
// before it: a push after an approval, the sync after a scan, the extension's
// LinkedIn rows, a full rewrite. A sync that starts while a push is still
// retrying then finds the job already sent instead of adding it twice, and
// quick approvals don't race to create the same tab or number the same
// LinkedIn row.
let writing: Promise<unknown> = Promise.resolve();

function oneAtATime<T>(work: () => Promise<T>): Promise<T> {
  const run = writing.then(work);
  writing = run.catch(() => undefined);
  return run;
}

/**
 * Send these jobs to their users' sheets now, if they are approved and not in
 * a sheet yet (jobs approved by hand); `scope` limits them to one user's.
 * Users without a sheet are skipped: their jobs wait for the next sync. Never
 * throws: a failure is noted for the user, and the next sync sends the job.
 */
export function sendApprovedJobsNow(ids: number[], scope: { userId?: number } = {}): Promise<number> {
  return oneAtATime(async () => (await sendNow(ids, scope)).size);
}

/**
 * After jobs changed by hand (approved, moved, closed): send the approved ones
 * that are not in their user's sheet yet, and update the Stage of the ones
 * already there. Never throws.
 */
export function updateSheetsAfterChange(
  ids: number[],
  scope: { userId?: number } = {},
): Promise<{ sent: number; staged: number }> {
  return oneAtATime(async () => {
    const sent = await sendNow(ids, scope);
    const staged = await syncStages(
      ids.filter((id) => !sent.has(id)),
      scope,
    );
    return { sent: sent.size, staged };
  });
}

// As many as one change touches (lib/jobActions.ts).
const MAX_IDS = 500;

/** The ids sent. */
async function sendNow(ids: number[], scope: { userId?: number }): Promise<Set<number>> {
  const unique = Array.from(new Set(ids)).slice(0, MAX_IDS);
  const sent = new Set<number>();
  if (unique.length === 0) return sent;
  const jobs = await prisma.scrapedJob.findMany({
    where: { id: { in: unique }, ...scope, status: "APPROVED", sheetSynced: false },
    orderBy: { createdAt: "asc" },
  });
  for (const [userId, list] of byUser(jobs)) {
    let target: SheetTarget | null = null;
    try {
      target = await sheetTargetFor(userId);
      if (!target) continue;
      await deliver(userId, target, list);
      for (const job of list) sent.add(job.id);
    } catch (err) {
      console.error(`[sheets] sending ${list.length} approved job(s) of user #${userId} failed: ${(err as Error)?.message || err}`);
      // A key that can't be read fails before there is a target to deliver to.
      if (!target) await noteFailure(userId, err, "");
    }
  }
  return sent;
}

function byUser<T extends { userId: number }>(jobs: T[]): Map<number, T[]> {
  const out = new Map<number, T[]>();
  for (const job of jobs) out.set(job.userId, [...(out.get(job.userId) ?? []), job]);
  return out;
}

type RowJob = StagedJob & {
  id: number;
  userId: number;
  platform: string;
  title: string;
  company: string;
  url: string;
  manualApplyUrl: string | null;
};

/** Update the Stage cell of these jobs' rows (users with Applications on). Returns the cells written. */
async function syncStages(ids: number[], scope: { userId?: number }): Promise<number> {
  const unique = Array.from(new Set(ids)).slice(0, MAX_IDS);
  if (unique.length === 0) return 0;
  const jobs: RowJob[] = await prisma.scrapedJob.findMany({
    where: { id: { in: unique }, ...scope, sheetSynced: true },
    select: {
      id: true,
      userId: true,
      platform: true,
      title: true,
      company: true,
      url: true,
      manualApplyUrl: true,
      stage: true,
      closeReason: true,
    },
  });
  let written = 0;
  for (const [userId, list] of byUser(jobs)) {
    let target: SheetTarget | null = null;
    try {
      target = await sheetTargetFor(userId);
      if (!target?.settings.applicationsEnabled) continue;
      // LinkedIn jobs have their row in the LinkedIn tab (and, in a sheet synced before 4.8, one in the Jobs tab too).
      const linkedin = list.filter((j) => j.platform === "linkedin");
      written += await writeStages(target, target.jobsTab, list, jobsTabRow(target.settings));
      if (linkedin.length) written += await writeStages(target, target.linkedinTab, linkedin, linkedInTabRow);
      // It works again: the problem noted last time is gone.
      if (target.settings.sheetStatus?.ok === false) {
        await note(userId, { ok: true, sent: 0, tabs: [target.jobsTab, ...(linkedin.length ? [target.linkedinTab] : [])] });
      }
    } catch (err) {
      console.error(`[sheets] updating the stage of ${list.length} job(s) of user #${userId} failed: ${(err as Error)?.message || err}`);
      await noteFailure(userId, err, target?.serviceAccount ?? "");
    }
  }
  return written;
}

/** Finds a job's rows in a tab from its header: true when the row is the job's. */
type RowMatcher = (header: string[]) => ((row: unknown[], job: RowJob) => boolean) | null;

const same = (a: unknown, b: string | null | undefined) => !!b && String(a ?? "").trim() === b.trim();

const sameText = (a: unknown, b: string) => String(a ?? "").trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The Jobs tab: by the URL column (the apply link, or the job link) and, when
 * the tab has one, the title (two jobs can share a company's careers page);
 * without a URL column, by title and company.
 */
function jobsTabRow(settings: UserSettings): RowMatcher {
  const columns: SheetColumn[] = getSheetColumns(settings.sheetColumns);
  const labelOf = (key: string) => columns.find((c) => c.key === key)?.label;
  return (header) => {
    const col = (key: string) => {
      const label = labelOf(key);
      return label ? header.findIndex((h) => h.trim() === label.trim()) : -1;
    };
    const url = col("url");
    const title = col("title");
    const company = col("company");
    if (url >= 0) {
      return (row, job) =>
        (same(row[url], job.manualApplyUrl) || same(row[url], job.url)) && (title < 0 || sameText(row[title], job.title));
    }
    if (title >= 0 && company >= 0) return (row, job) => sameText(row[title], job.title) && sameText(row[company], job.company);
    return null;
  };
}

/** The LinkedIn tab: by its Job Url column (D), the LinkedIn link. */
const linkedInTabRow: RowMatcher = (header) => {
  const col = header.findIndex((h) => h.trim().toLowerCase() === "job url");
  const at = col >= 0 ? col : 3;
  return (row, job) => same(row[at], job.url);
};

async function writeStages(target: SheetTarget, tab: string, jobs: RowJob[], matcher: RowMatcher): Promise<number> {
  const { sheets, spreadsheetId } = target;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: a1(tab, ALL_COLUMNS) }).catch((err: unknown) => {
    // A tab that is not there has no rows to update; anything else is a failure.
    if (/Unable to parse range/i.test(String((err as Error)?.message ?? err))) return null;
    throw err;
  });
  const rows = res?.data?.values ?? [];
  if (rows.length < 2) return 0;
  const header = rows[0].map((v) => String(v ?? ""));
  const matches = matcher(header);
  if (!matches) return 0;
  let stageCol = header.findIndex(isStageHeader);
  const data: sheets_v4.Schema$ValueRange[] = [];
  let cells = 0;
  for (const job of jobs) {
    for (let i = 1; i < rows.length; i++) {
      if (!matches(rows[i], job)) continue;
      if (stageCol < 0) {
        stageCol = header.length;
        data.push({ range: a1(tab, `${columnLetter(stageCol)}1`), values: [[STAGE_HEADER]] });
      }
      data.push({ range: a1(tab, `${columnLetter(stageCol)}${i + 1}`), values: [[stageText(job.stage, job.closeReason)]] });
      cells++;
    }
  }
  if (cells === 0) return 0;
  await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data } });
  return cells;
}

/**
 * Export approved jobs that are not in a sheet yet. With a user: only theirs
 * (throws, with why, when their jobs go nowhere). Without: every active user
 * with a sheet, one after another; a user whose sheet fails is skipped, the
 * rest still sync.
 */
export function syncApprovedJobsToSheet(userId?: number): Promise<{ synced: number }> {
  return oneAtATime(async () => {
    if (userId != null) {
      const { plan } = await loadPlan(userId, true);
      if (!plan.ok) throw new Error(capitalize(plan.reason));
      const target = await targetOrNote(userId);
      return { synced: await syncUserApprovedJobs(userId, target) };
    }
    let synced = 0;
    for (const user of await activeUsers()) {
      try {
        const target = await sheetTargetFor(user.id);
        if (target) synced += await syncUserApprovedJobs(user.id, target);
      } catch (err) {
        console.error(`[sheets] sync for user ${user.username} failed: ${(err as Error)?.message || err}`);
      }
    }
    return { synced };
  });
}

/** The user's sheet; a key that can't be read is noted for them, then thrown. */
async function targetOrNote(userId: number): Promise<SheetTarget> {
  let target: SheetTarget | null;
  try {
    target = await sheetTargetFor(userId);
  } catch (err) {
    throw new Error(await noteFailure(userId, err, ""));
  }
  if (!target) throw new Error("The Google Sheet is not set up for this user.");
  return target;
}

const LINKEDIN_HEADER = ["No", "Date", "Platform", "Job Url", "Company", "Country", "Role", "Url", "Apply via"];

export function applyViaLabel(applyMethod: string | null | undefined): string {
  if (applyMethod === "EASY_APPLY") return "Easy Apply";
  if (applyMethod === "EXTERNAL") return "Company site";
  return "";
}

type LinkedInSheetJob = StagedJob & {
  id: number;
  userId: number;
  title: string;
  company: string;
  location: string | null;
  url: string;
  manualApplyUrl?: string | null;
  applyMethod?: string | null;
  createdAt: Date;
};

/** Add a LinkedIn job the AI just approved to its user's LinkedIn tab (no-op when their jobs go nowhere). */
export async function syncJobToLinkedInTab(job: Pick<LinkedInSheetJob, "id" | "userId">): Promise<void> {
  await sendApprovedJobsNow([job.id], { userId: job.userId });
}

/** The LinkedIn tab's header (written on an empty tab, "Apply via" added to an old one), with its Stage column. */
async function linkedInHeader(target: SheetTarget): Promise<{ stageCol: number }> {
  const { sheets, spreadsheetId } = target;
  const tab = target.linkedinTab;
  const existing = await sheets.spreadsheets.values
    .get({ spreadsheetId, range: a1(tab, "A1:I1") })
    .catch(() => null);
  if ((existing?.data?.values?.[0] || []).length === 8) {
    // A tab created before the "Apply via" column existed — extend its header.
    await sheets.spreadsheets.values
      .update({
        spreadsheetId,
        range: a1(tab, "I1"),
        valueInputOption: "RAW",
        requestBody: { values: [["Apply via"]] },
      })
      .catch(() => {});
  }
  const { stageCol } = await headerWithStage(target, tab, LINKEDIN_HEADER);
  return { stageCol };
}

/** Append LinkedIn jobs to the user's LinkedIn tab, numbered on from its last row. */
async function appendToLinkedInTab(target: SheetTarget, jobs: LinkedInSheetJob[]): Promise<void> {
  const { sheets, spreadsheetId } = target;
  const tab = target.linkedinTab;
  await ensureTab(target, tab);
  const { stageCol } = await linkedInHeader(target);

  const countRes = await sheets.spreadsheets.values
    .get({ spreadsheetId, range: a1(tab, "A:A") })
    .catch(() => null);
  const rowCount = countRes?.data?.values?.length || 1;

  // Job Url stays as the LinkedIn viewer link (so we can re-open the original
  // posting), and the trailing Url column gets the company apply link when the
  // extension captured it, falling back to the LinkedIn link otherwise.
  const rows = jobs.map((job, i) =>
    withStage(
      [
        String(rowCount + i),
        job.createdAt.toISOString().split("T")[0],
        "LinkedIn",
        job.url,
        job.company,
        job.location || "",
        job.title,
        (job.manualApplyUrl && job.manualApplyUrl.trim()) || job.url,
        applyViaLabel(job.applyMethod),
      ],
      stageCol,
      job,
    ),
  );
  await appendRows(target, a1(tab, ALL_COLUMNS), rows, jobs.map((j) => j.id));
}

export type SheetCheck =
  | {
      ok: true;
      title: string;
      spreadsheetId: string;
      tabs: { name: string; created: boolean }[];
      serviceAccount: string;
    }
  | { ok: false; error: string };

/**
 * Test and set up: open the user's spreadsheet as the service account and
 * make sure both of their tabs are there, with their header rows. It proves
 * the service account can edit the sheet, and the result is noted like a
 * delivery.
 */
export function prepareSheet(userId: number): Promise<SheetCheck> {
  return oneAtATime(async () => {
    const { plan } = await loadPlan(userId, true);
    if (!plan.ok) return { ok: false, error: capitalize(plan.reason) };
    let target: SheetTarget | null = null;
    try {
      target = await sheetTargetFor(userId);
      if (!target) return { ok: false, error: "The Google Sheet is not set up for this user." };
      const meta = await target.sheets.spreadsheets.get({
        spreadsheetId: target.spreadsheetId,
        fields: "properties.title,sheets.properties.title",
      });
      // What is there now (a tab deleted by hand is made again).
      knownTabs.set(target.spreadsheetId, new Set((meta.data.sheets ?? []).map((s) => s.properties?.title ?? "")));
      const columns: SheetColumn[] = getSheetColumns(target.settings.sheetColumns);
      const jobsCreated = await ensureTab(target, target.jobsTab);
      await headerWithStage(target, target.jobsTab, columns.map((c) => c.label));
      const linkedinCreated = await ensureTab(target, target.linkedinTab);
      await linkedInHeader(target);
      await note(userId, { ok: true, sent: 0, tabs: [target.jobsTab, target.linkedinTab] });
      return {
        ok: true,
        title: meta.data.properties?.title || "(untitled)",
        spreadsheetId: target.spreadsheetId,
        tabs: [
          { name: target.jobsTab, created: jobsCreated },
          { name: target.linkedinTab, created: linkedinCreated },
        ],
        serviceAccount: target.serviceAccount,
      };
    } catch (err) {
      return { ok: false, error: await noteFailure(userId, err, target?.serviceAccount ?? "") };
    }
  });
}

/**
 * Sync Sheets: rewrite one user's Jobs tab with their approved board jobs,
 * newest first, and add to their LinkedIn tab every approved LinkedIn job it
 * does not have yet (each job has one row, in its own tab).
 */
export function fullSyncToSheet(userId: number): Promise<{ synced: number }> {
  return oneAtATime(async () => {
    const { plan } = await loadPlan(userId, true);
    if (!plan.ok) throw new Error(capitalize(plan.reason));
    const target = await targetOrNote(userId);
    try {
      const boards = await rewriteJobsTab(userId, target);
      const linkedin = await completeLinkedInTab(userId, target);
      await note(userId, { ok: true, sent: boards.synced + linkedin, tabs: [target.jobsTab, target.linkedinTab] });
      return { synced: boards.synced + linkedin };
    } catch (err) {
      throw new Error(await noteFailure(userId, err, target.serviceAccount));
    }
  });
}

/** Add the approved LinkedIn jobs missing from the user's LinkedIn tab (found by their link); returns how many. */
async function completeLinkedInTab(userId: number, target: SheetTarget): Promise<number> {
  const jobs = await prisma.scrapedJob.findMany({
    where: { userId, status: "APPROVED", platform: "linkedin" },
    orderBy: { createdAt: "asc" },
  });
  if (jobs.length === 0) return 0;
  const tab = target.linkedinTab;
  await ensureTab(target, tab);
  const res = await target.sheets.spreadsheets.values.get({ spreadsheetId: target.spreadsheetId, range: a1(tab, ALL_COLUMNS) });
  const rows = res.data.values ?? [];
  const header = (rows[0] ?? []).map((v) => String(v ?? ""));
  const urlCol = header.findIndex((h) => h.trim().toLowerCase() === "job url");
  const have = new Set(rows.slice(1).map((r) => String(r[urlCol >= 0 ? urlCol : 3] ?? "").trim()).filter(Boolean));
  const missing = jobs.filter((j) => !have.has(j.url.trim()));
  if (missing.length) await appendToLinkedInTab(target, missing);
  const present = jobs.filter((j) => !j.sheetSynced && have.has(j.url.trim())).map((j) => j.id);
  if (present.length) await prisma.scrapedJob.updateMany({ where: { id: { in: present } }, data: { sheetSynced: true } });
  return missing.length;
}

async function rewriteJobsTab(userId: number, target: SheetTarget): Promise<{ synced: number }> {
  const { sheets, spreadsheetId, settings } = target;
  const tab = target.jobsTab;
  const columns: SheetColumn[] = getSheetColumns(settings.sheetColumns);
  await ensureTab(target, tab);

  // Board jobs only: LinkedIn jobs have their rows in the LinkedIn tab.
  const jobs = await prisma.scrapedJob.findMany({
    where: { userId, status: "APPROVED", platform: { not: "linkedin" } },
    orderBy: { createdAt: "desc" },
  });

  const labels = columns.map((c) => c.label);
  const header = settings.applicationsEnabled && !labels.some(isStageHeader) ? [...labels, STAGE_HEADER] : labels;
  const stageCol = settings.applicationsEnabled ? header.findIndex(isStageHeader) : -1;
  const data = jobs.map((job) => withStage(columns.map((col) => getJobValue(job, col.key)), stageCol, job));

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: a1(tab, `A:${columnLetter(Math.max(25, header.length - 1))}`) });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: a1(tab, "A1"),
    valueInputOption: "RAW",
    requestBody: { values: [header, ...data] },
  });

  await prisma.scrapedJob.updateMany({
    where: { userId, status: "APPROVED", platform: { not: "linkedin" } },
    data: { sheetSynced: true },
  });
  // The rewrite dropped the rows of board jobs no longer approved: approved
  // again, they go back in. LinkedIn jobs keep theirs in the LinkedIn tab.
  await prisma.scrapedJob.updateMany({
    where: { userId, status: { not: "APPROVED" }, platform: { not: "linkedin" }, sheetSynced: true },
    data: { sheetSynced: false },
  });

  return { synced: jobs.length };
}
