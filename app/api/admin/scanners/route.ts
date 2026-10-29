import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateConfigCache } from "@/lib/config";
import { adminOnly } from "@/lib/scope";

export const dynamic = "force-dynamic";

const SCANNER_KEY_PREFIXES = [
  "remoteok",
  "jobicy",
  "landingjobs",
  // hidden / low-competition zero-auth sources
  "remotive",
  "workingnomads",
  "arbeitnow",
  "hnwhoishiring",
  "themuse",
  "realworkfromanywhere",
  "nofluffjobs",
  "weworkremotely",
  "jobspresso",
  "authenticjobs",
  "nodesk",
  "justremote",
  "greenhouse",
  "lever",
  "ashby",
  "mygreenhouse",
];
const SCANNER_KEY_SUFFIXES = ["_search_url", "_max_jobs", "_enabled"];

// Per-scanner secret keys (cookies, tokens) that don't follow the
// "{prefix}{suffix}" pattern but still need to be writable from the UI.
const SCANNER_SECRET_KEYS = [
  "mygreenhouse_session_cookie",
  "mygreenhouse_xsrf_token",
];

// MyGreenhouse search-filter selections — the portal's own job-search facets
// (date posted, salary, work type, employment type) plus our post-fetch
// location filter (Europe / selected locations).
const MYGREENHOUSE_FILTER_KEYS = [
  "mygreenhouse_date_posted",
  "mygreenhouse_salary",
  "mygreenhouse_work_types",
  "mygreenhouse_employment_types",
  "mygreenhouse_locations",
];

// Standalone config keys that aren't per-scanner.
const GLOBAL_SCANNER_KEYS = ["scanner_rescan_after_days", "analyzer_batch_size"];

function isAllowedKey(key: string): boolean {
  if (GLOBAL_SCANNER_KEYS.includes(key)) return true;
  if (SCANNER_SECRET_KEYS.includes(key)) return true;
  if (MYGREENHOUSE_FILTER_KEYS.includes(key)) return true;
  return SCANNER_KEY_PREFIXES.some((p) => SCANNER_KEY_SUFFIXES.some((s) => key === `${p}${s}`));
}

export async function GET(req: NextRequest) {
  const denied = await adminOnly(req);
  if (denied) return denied;
  const expectedKeys = [
    ...GLOBAL_SCANNER_KEYS,
    ...SCANNER_SECRET_KEYS,
    ...MYGREENHOUSE_FILTER_KEYS,
    ...SCANNER_KEY_PREFIXES.flatMap((p) => SCANNER_KEY_SUFFIXES.map((s) => `${p}${s}`)),
  ];
  const rows = await prisma.appConfig.findMany({
    where: { key: { in: expectedKeys } },
  });
  const config: Record<string, string> = {};
  for (const row of rows) config[row.key] = row.value;
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const denied = await adminOnly(req);
  if (denied) return denied;
  const body = await req.json();
  let wrote = false;
  for (const [key, value] of Object.entries(body)) {
    if (isAllowedKey(key) && typeof value === "string") {
      await prisma.appConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      wrote = true;
    }
  }
  if (wrote) invalidateConfigCache();
  return NextResponse.json({ ok: true });
}
