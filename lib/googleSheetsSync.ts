import { google } from "googleapis";
import { getConfig, getSheetColumns } from "./config";
import { prisma } from "./prisma";

function getAuth(credentialsJson: string) {
  const credentials = JSON.parse(credentialsJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
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

export async function syncApprovedJobsToSheet(): Promise<{ synced: number }> {
  const config = await getConfig();
  if (!config.googleSheetsCredentials || !config.googleSheetId) {
    throw new Error("Google Sheets not configured. Go to /admin/settings to set credentials.");
  }

  const auth = getAuth(config.googleSheetsCredentials);
  const sheets = google.sheets({ version: "v4", auth });
  const columns = getSheetColumns(config.sheetColumns);

  const jobs = await prisma.scrapedJob.findMany({
    where: { status: "APPROVED", sheetSynced: false },
    orderBy: { createdAt: "asc" },
  });

  if (jobs.length === 0) return { synced: 0 };

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheetId,
    range: "Jobs!A1:A1",
  }).catch(() => null);

  const hasHeader = existing?.data?.values && existing.data.values.length > 0;

  if (!hasHeader) {
    const header = columns.map((c) => c.label);
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.googleSheetId,
      range: "Jobs!A1",
      valueInputOption: "RAW",
      requestBody: { values: [header] },
    });
  }

  const rows = jobs.map((job) =>
    columns.map((col) => getJobValue(job, col.key))
  );

  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await sheets.spreadsheets.values.append({
      spreadsheetId: config.googleSheetId,
      range: "Jobs!A:Z",
      valueInputOption: "RAW",
      requestBody: { values: batch },
    });
  }

  const syncedIds = jobs.map((j) => j.id);
  await prisma.scrapedJob.updateMany({
    where: { id: { in: syncedIds } },
    data: { sheetSynced: true },
  });

  return { synced: jobs.length };
}

const LINKEDIN_HEADER = ["No", "Date", "Platform", "Job Url", "Company", "Country", "Role", "Url", "Apply via"];

export function applyViaLabel(applyMethod: string | null | undefined): string {
  if (applyMethod === "EASY_APPLY") return "Easy Apply";
  if (applyMethod === "EXTERNAL") return "Company site";
  return "";
}

export async function syncJobToLinkedInTab(job: {
  id: number;
  title: string;
  company: string;
  location: string | null;
  url: string;
  manualApplyUrl?: string | null;
  applyMethod?: string | null;
  createdAt: Date;
}): Promise<void> {
  const config = await getConfig();
  if (!config.googleSheetsCredentials || !config.googleSheetId) return;

  const auth = getAuth(config.googleSheetsCredentials);
  const sheets = google.sheets({ version: "v4", auth });
  const tab = config.linkedinSheetTab || "LinkedIn";

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheetId,
    range: `${tab}!A1:I1`,
  }).catch(() => null);

  const headerRow = existing?.data?.values?.[0] || [];

  if (headerRow.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.googleSheetId,
      range: `${tab}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [LINKEDIN_HEADER] },
    });
  } else if (headerRow.length === 8) {
    // A tab created before the "Apply via" column existed — extend its header.
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.googleSheetId,
      range: `${tab}!I1`,
      valueInputOption: "RAW",
      requestBody: { values: [["Apply via"]] },
    }).catch(() => {});
  }

  const countRes = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheetId,
    range: `${tab}!A:A`,
  }).catch(() => null);
  const rowCount = (countRes?.data?.values?.length || 1);

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
    spreadsheetId: config.googleSheetId,
    range: `${tab}!A:I`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });

  await prisma.scrapedJob.update({
    where: { id: job.id },
    data: { sheetSynced: true },
  });
}

export async function fullSyncToSheet(): Promise<{ synced: number }> {
  const config = await getConfig();
  if (!config.googleSheetsCredentials || !config.googleSheetId) {
    throw new Error("Google Sheets not configured. Go to /admin/settings to set credentials.");
  }

  const auth = getAuth(config.googleSheetsCredentials);
  const sheets = google.sheets({ version: "v4", auth });
  const columns = getSheetColumns(config.sheetColumns);

  const jobs = await prisma.scrapedJob.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
  });

  const header = [columns.map((c) => c.label)];
  const data = jobs.map((job) =>
    columns.map((col) => getJobValue(job, col.key))
  );

  await sheets.spreadsheets.values.clear({
    spreadsheetId: config.googleSheetId,
    range: "Jobs!A:Z",
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.googleSheetId,
    range: "Jobs!A1",
    valueInputOption: "RAW",
    requestBody: { values: [...header, ...data] },
  });

  await prisma.scrapedJob.updateMany({
    where: { status: "APPROVED" },
    data: { sheetSynced: true },
  });

  return { synced: jobs.length };
}
