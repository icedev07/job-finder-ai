import { google, type sheets_v4 } from "googleapis";
import { getConfig, getSheetColumns } from "./config";
import { prisma } from "./prisma";
import { activeUsers } from "./users";
import { getUserSettings, type UserSettings } from "./userSettings";

// Approved jobs go to the Google Sheet of the user they were found for. One
// service account (app-wide) writes every sheet; each user names their own
// spreadsheet and tabs, so several users can share one spreadsheet with
// separate tabs. A missing tab is created on first use.

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

async function ensureTab(target: SheetTarget, tab: string): Promise<void> {
  const known = knownTabs.get(target.spreadsheetId);
  if (known?.has(tab)) return;
  const meta = await target.sheets.spreadsheets.get({
    spreadsheetId: target.spreadsheetId,
    fields: "sheets.properties.title",
  });
  const titles = new Set((meta.data.sheets ?? []).map((s) => s.properties?.title ?? ""));
  if (!titles.has(tab)) {
    await target.sheets.spreadsheets.batchUpdate({
      spreadsheetId: target.spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    });
    titles.add(tab);
  }
  knownTabs.set(target.spreadsheetId, titles);
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

/** Append one user's approved, not yet exported jobs to their "Jobs" tab. */
async function syncUserApprovedJobs(userId: number, target: SheetTarget): Promise<number> {
  const jobs = await prisma.scrapedJob.findMany({
    where: { userId, status: "APPROVED", sheetSynced: false },
    orderBy: { createdAt: "asc" },
  });
  if (jobs.length === 0) return 0;

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
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: a1(tab, "A:Z"),
      valueInputOption: "RAW",
      requestBody: { values: rows.slice(i, i + batchSize) },
    });
  }

  await prisma.scrapedJob.updateMany({
    where: { id: { in: jobs.map((j) => j.id) } },
    data: { sheetSynced: true },
  });
  return jobs.length;
}

/**
 * Export approved jobs that are not in a sheet yet. With a user: only theirs
 * (throws when their sheet is not set up). Without: every active user with a
 * sheet, one after another; a user whose sheet fails is skipped, the rest
 * still sync.
 */
export async function syncApprovedJobsToSheet(userId?: number): Promise<{ synced: number }> {
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
}

const LINKEDIN_HEADER = ["No", "Date", "Platform", "Job Url", "Company", "Country", "Role", "Url", "Apply via"];

export function applyViaLabel(applyMethod: string | null | undefined): string {
  if (applyMethod === "EASY_APPLY") return "Easy Apply";
  if (applyMethod === "EXTERNAL") return "Company site";
  return "";
}

/** Add one approved LinkedIn job to its user's LinkedIn tab (no-op when their sheet is not set up). */
export async function syncJobToLinkedInTab(job: {
  id: number;
  userId: number;
  title: string;
  company: string;
  location: string | null;
  url: string;
  manualApplyUrl?: string | null;
  applyMethod?: string | null;
  createdAt: Date;
}): Promise<void> {
  const target = await sheetTargetFor(job.userId);
  if (!target) return;
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
  const applyHref = (job.manualApplyUrl && job.manualApplyUrl.trim()) || job.url;
  const row = [
    String(rowCount),
    job.createdAt.toISOString().split("T")[0],
    "LinkedIn",
    job.url,
    job.company,
    job.location || "",
    job.title,
    applyHref,
    applyViaLabel(job.applyMethod),
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: a1(tab, "A:I"),
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });

  await prisma.scrapedJob.update({
    where: { id: job.id },
    data: { sheetSynced: true },
  });
}

/** Rewrite one user's "Jobs" tab with all of their approved jobs, newest first. */
export async function fullSyncToSheet(userId: number): Promise<{ synced: number }> {
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

  return { synced: jobs.length };
}
