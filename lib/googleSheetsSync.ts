import { google, type sheets_v4 } from "googleapis";
import type { ScrapedJob } from "../generated/prisma";
import { getConfig, getSheetColumns } from "./config";
import { stageText } from "./format";
import { prisma } from "./prisma";
import { activeUsers } from "./users";
import { getUserSettings, type UserSettings } from "./userSettings";

// Approved jobs go to the Google Sheet of the user they were found for: board
// jobs to the Jobs tab, LinkedIn jobs to the LinkedIn tab. One service account
// (app-wide) writes every sheet; each user names their own spreadsheet and
// tabs, so several users can share one spreadsheet with separate tabs. A
// missing tab is created on first use.
//
// sheetSynced means "the job has a row in its user's sheet". The AI's
// approvals are sent at the end of each scan (and LinkedIn ones as the
// extension finds them); a job approved by hand is sent right away. Rows are
// never deleted, so a job rejected later keeps its row and is not sent again
// if approved once more.
//
// For users with Applications on, both tabs get a Stage column (found by its
// header, added at the end when missing) that follows the board: a row is
// written with the job's stage, and moving the job updates its cell. The row
// is found by the job's link and title (or its title and company).

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

type SheetTarget = { sheets: sheets_v4.Sheets; spreadsheetId: string; settings: UserSettings };

/** The user's sheet, or null when Sheets is not set up for them (no service account or no spreadsheet). */
export async function sheetTargetFor(userId: number): Promise<SheetTarget | null> {
  const [config, settings] = await Promise.all([getConfig(), getUserSettings(userId)]);
  if (!config.googleSheetsCredentials || !settings.googleSheetId) return null;
  const sheets = google.sheets({ version: "v4", auth: getAuth(config.googleSheetsCredentials) });
  return { sheets, spreadsheetId: settings.googleSheetId, settings };
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

async function ensureTab(target: SheetTarget, tab: string): Promise<void> {
  const known = knownTabs.get(target.spreadsheetId);
  if (known?.has(tab)) return;
  const titles = await tabTitles(target);
  if (!titles.has(tab)) {
    try {
      await target.sheets.spreadsheets.batchUpdate({
        spreadsheetId: target.spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
      });
    } catch (err) {
      // Another server instance may have just added it.
      if (!(await tabTitles(target)).has(tab)) throw err;
    }
    titles.add(tab);
  }
  knownTabs.set(target.spreadsheetId, titles);
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

const NOT_CONFIGURED =
  "Google Sheets is not set up for this user: add the service account in Settings → Google Sheets and the user's spreadsheet ID.";

type SheetColumn = { key: string; label: string };

/** Append board jobs to the user's Jobs tab, with the header row first on an empty tab. */
async function appendToJobsTab(target: SheetTarget, jobs: ScrapedJob[]): Promise<void> {
  const { settings } = target;
  const tab = settings.jobsSheetTab;
  const columns: SheetColumn[] = getSheetColumns(settings.sheetColumns);
  await ensureTab(target, tab);
  const { stageCol } = await headerWithStage(target, tab, columns.map((c) => c.label));

  const rows = jobs.map((job) => withStage(columns.map((col) => getJobValue(job, col.key)), stageCol, job));
  await appendRows(target, a1(tab, ALL_COLUMNS), rows, jobs.map((j) => j.id));
}

/** Approved jobs not in the sheet yet, each to its tab: LinkedIn jobs to the LinkedIn tab, the rest to the Jobs tab. */
async function appendApproved(target: SheetTarget, jobs: ScrapedJob[]): Promise<number> {
  const boards = jobs.filter((j) => j.platform !== "linkedin");
  const linkedin = jobs.filter((j) => j.platform === "linkedin");
  if (boards.length) await appendToJobsTab(target, boards);
  if (linkedin.length) await appendToLinkedInTab(target, linkedin);
  return jobs.length;
}

/** Send one user's approved jobs that are not in their sheet yet. */
async function syncUserApprovedJobs(userId: number, target: SheetTarget): Promise<number> {
  const jobs = await prisma.scrapedJob.findMany({
    where: { userId, status: "APPROVED", sheetSynced: false },
    orderBy: { createdAt: "asc" },
  });
  return jobs.length ? appendApproved(target, jobs) : 0;
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
 * throws: a failure is logged, and the next sync sends the job.
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
    try {
      const target = await sheetTargetFor(userId);
      if (!target) continue;
      await appendApproved(target, list);
      for (const job of list) sent.add(job.id);
    } catch (err) {
      console.error(`[sheets] sending ${list.length} approved job(s) of user #${userId} failed: ${(err as Error)?.message || err}`);
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
    try {
      const target = await sheetTargetFor(userId);
      if (!target?.settings.applicationsEnabled) continue;
      // LinkedIn jobs have their row in the LinkedIn tab, and one in the Jobs tab after Sync Sheets.
      const linkedin = list.filter((j) => j.platform === "linkedin");
      written += await writeStages(target, target.settings.jobsSheetTab, list, jobsTabRow(target.settings));
      if (linkedin.length) written += await writeStages(target, target.settings.linkedinSheetTab, linkedin, linkedInTabRow);
    } catch (err) {
      console.error(`[sheets] updating the stage of ${list.length} job(s) of user #${userId} failed: ${(err as Error)?.message || err}`);
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
 * (throws when their sheet is not set up). Without: every active user with a
 * sheet, one after another; a user whose sheet fails is skipped, the rest
 * still sync.
 */
export function syncApprovedJobsToSheet(userId?: number): Promise<{ synced: number }> {
  return oneAtATime(async () => {
    if (userId != null) {
      const target = await sheetTargetFor(userId);
      if (!target) throw new Error(NOT_CONFIGURED);
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

/** Add a LinkedIn job the AI just approved to its user's LinkedIn tab (no-op when their sheet is not set up). */
export async function syncJobToLinkedInTab(job: Pick<LinkedInSheetJob, "id" | "userId">): Promise<void> {
  await sendApprovedJobsNow([job.id], { userId: job.userId });
}

/** Append LinkedIn jobs to the user's LinkedIn tab, numbered on from its last row. */
async function appendToLinkedInTab(target: SheetTarget, jobs: LinkedInSheetJob[]): Promise<void> {
  const { sheets, spreadsheetId, settings } = target;
  const tab = settings.linkedinSheetTab;
  await ensureTab(target, tab);

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

/** Rewrite one user's "Jobs" tab with all of their approved jobs, newest first. */
export function fullSyncToSheet(userId: number): Promise<{ synced: number }> {
  return oneAtATime(() => rewriteJobsTab(userId));
}

async function rewriteJobsTab(userId: number): Promise<{ synced: number }> {
  const target = await sheetTargetFor(userId);
  if (!target) throw new Error(NOT_CONFIGURED);
  const { sheets, spreadsheetId, settings } = target;
  const tab = settings.jobsSheetTab;
  const columns: SheetColumn[] = getSheetColumns(settings.sheetColumns);
  await ensureTab(target, tab);

  const jobs = await prisma.scrapedJob.findMany({
    where: { userId, status: "APPROVED" },
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
    where: { userId, status: "APPROVED" },
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
