import { google, type sheets_v4 } from "googleapis";
import type { ScrapedJob } from "../generated/prisma";
import { getConfig, getSheetColumns } from "./config";
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
  return String(job[key] ?? "");
}

const NOT_CONFIGURED =
  "Google Sheets is not set up for this user: add the service account in Settings → Google Sheets and the user's spreadsheet ID.";

/** Append board jobs to the user's Jobs tab, with the header row first on an empty tab. */
async function appendToJobsTab(target: SheetTarget, jobs: ScrapedJob[]): Promise<void> {
  const { sheets, spreadsheetId, settings } = target;
  const tab = settings.jobsSheetTab;
  const columns = getSheetColumns(settings.sheetColumns);
  await ensureTab(target, tab);

  const existing = await sheets.spreadsheets.values
    .get({ spreadsheetId, range: a1(tab, "A1:A1") })
    .catch(() => null);
  if (!existing?.data?.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: a1(tab, "A1"),
      valueInputOption: "RAW",
      requestBody: { values: [columns.map((c) => c.label)] },
    });
  }

  const rows = jobs.map((job) => columns.map((col) => getJobValue(job, col.key)));
  await appendRows(target, a1(tab, "A:Z"), rows, jobs.map((j) => j.id));
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
  return oneAtATime(() => sendNow(ids, scope));
}

async function sendNow(ids: number[], scope: { userId?: number }): Promise<number> {
  // As many as one change touches (lib/jobActions.ts).
  const unique = Array.from(new Set(ids)).slice(0, 500);
  if (unique.length === 0) return 0;
  const jobs = await prisma.scrapedJob.findMany({
    where: { id: { in: unique }, ...scope, status: "APPROVED", sheetSynced: false },
    orderBy: { createdAt: "asc" },
  });
  const byUser = new Map<number, ScrapedJob[]>();
  for (const job of jobs) byUser.set(job.userId, [...(byUser.get(job.userId) ?? []), job]);
  let sent = 0;
  for (const [userId, list] of byUser) {
    try {
      const target = await sheetTargetFor(userId);
      if (target) sent += await appendApproved(target, list);
    } catch (err) {
      console.error(`[sheets] sending ${list.length} approved job(s) of user #${userId} failed: ${(err as Error)?.message || err}`);
    }
  }
  return sent;
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

type LinkedInSheetJob = {
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
  const headerRow = existing?.data?.values?.[0] || [];

  if (headerRow.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: a1(tab, "A1"),
      valueInputOption: "RAW",
      requestBody: { values: [LINKEDIN_HEADER] },
    });
  } else if (headerRow.length === 8) {
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

  const countRes = await sheets.spreadsheets.values
    .get({ spreadsheetId, range: a1(tab, "A:A") })
    .catch(() => null);
  const rowCount = countRes?.data?.values?.length || 1;

  // Job Url stays as the LinkedIn viewer link (so we can re-open the original
  // posting), and the trailing Url column gets the company apply link when the
  // extension captured it, falling back to the LinkedIn link otherwise.
  const rows = jobs.map((job, i) => [
    String(rowCount + i),
    job.createdAt.toISOString().split("T")[0],
    "LinkedIn",
    job.url,
    job.company,
    job.location || "",
    job.title,
    (job.manualApplyUrl && job.manualApplyUrl.trim()) || job.url,
    applyViaLabel(job.applyMethod),
  ]);
  await appendRows(target, a1(tab, "A:I"), rows, jobs.map((j) => j.id));
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
  const columns = getSheetColumns(settings.sheetColumns);
  await ensureTab(target, tab);

  const jobs = await prisma.scrapedJob.findMany({
    where: { userId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
  });

  const header = [columns.map((c) => c.label)];
  const data = jobs.map((job) => columns.map((col) => getJobValue(job, col.key)));

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: a1(tab, "A:Z") });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: a1(tab, "A1"),
    valueInputOption: "RAW",
    requestBody: { values: [...header, ...data] },
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
