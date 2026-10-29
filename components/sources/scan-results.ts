// Shapes of the scanner API responses and the per-board "last run" summary the
// source cards display, built either from a run made on this page or from the
// stored ScanLog rows that /api/admin/stats returns.

export type ScannerConfig = Record<string, string>;

/** /api/admin/stats → latestPerBoard: the newest ScanLog row of each board. */
export type LastScan = {
  board: string;
  jobsFound: number;
  jobsSaved: number;
  errors: string | null;
  createdAt: string;
};

/** /api/admin/stats → recentScans: the 10 newest ScanLog rows, any board. */
export type RecentScan = { board: string; durationMs: number | null; createdAt: string };

export type StatsResponse = {
  pendingJobs?: number;
  latestPerBoard?: LastScan[];
  recentScans?: RecentScan[];
};

/** POST /api/admin/scanners/run with one board (the error body has the same fields). */
export type RunResponse = {
  success?: boolean;
  error?: string;
  warning?: string;
  jobsFound?: number;
  jobsSaved?: number;
  jobsRefreshed?: number;
  jobsRescanned?: number;
  approved?: number;
  rejected?: number;
  unanalyzed?: number;
  durationMs?: number;
};

/** POST /api/admin/analyze. */
export type AnalyzeResponse = {
  success?: boolean;
  error?: string;
  analyzed?: number;
  approved?: number;
  rejected?: number;
  remaining?: number;
  rateLimited?: boolean;
  rateLimitReason?: string;
  retryAfterMs?: number;
  batchError?: string;
};

export type RunSummary = {
  /** When the run finished (ISO). */
  at: string;
  found: number;
  /** Jobs stored with a fresh AI verdict (a stored log also counts re-analyzed duplicates). */
  saved: number;
  /** Null when the stored log does not say. */
  approved: number | null;
  rejected: number | null;
  refreshed: number;
  rescanned: number;
  durationMs: number | null;
  /** Feed warnings and "N left for next run (…)". */
  note: string | null;
  /** The run failed. */
  error: string | null;
};

const count = (v: unknown) => Number(v || 0);

// runFeedScan (lib/scrapers/index.ts) joins its notes with "; ", one of them
// being "checked N: A suitable, R not suitable". ScanLog stores that text in
// `errors`, so it is the only place the stats carry the AI verdict counts.
const VERDICTS_RE = /^checked \d+: (\d+) suitable, (\d+) not suitable$/;

export function parseScanNote(note: string | null | undefined): {
  verdicts: { approved: number; rejected: number } | null;
  rest: string | null;
} {
  let verdicts: { approved: number; rejected: number } | null = null;
  const rest: string[] = [];
  for (const raw of (note ?? '').split('; ')) {
    const part = raw.trim();
    const m = VERDICTS_RE.exec(part);
    if (m) verdicts = { approved: Number(m[1]), rejected: Number(m[2]) };
    else if (part) rest.push(part);
  }
  return { verdicts, rest: rest.length ? rest.join('; ') : null };
}

export function summaryFromRun(data: RunResponse, at: string): RunSummary {
  return {
    at,
    found: count(data.jobsFound),
    saved: count(data.jobsSaved),
    approved: count(data.approved),
    rejected: count(data.rejected),
    refreshed: count(data.jobsRefreshed),
    rescanned: count(data.jobsRescanned),
    durationMs: typeof data.durationMs === 'number' ? data.durationMs : null,
    note: parseScanNote(data.warning).rest,
    error: null,
  };
}

export function failedRun(error: string, at: string): RunSummary {
  return {
    at,
    found: 0,
    saved: 0,
    approved: null,
    rejected: null,
    refreshed: 0,
    rescanned: 0,
    durationMs: null,
    note: null,
    error,
  };
}

export function summaryFromLog(log: LastScan, durationMs: number | null): RunSummary {
  const { verdicts, rest } = parseScanNote(log.errors);
  // No verdict line means nothing was checked when nothing was stored.
  const known = verdicts ?? (log.jobsSaved === 0 ? { approved: 0, rejected: 0 } : null);
  return {
    at: log.createdAt,
    found: log.jobsFound,
    saved: log.jobsSaved,
    approved: known?.approved ?? null,
    rejected: known?.rejected ?? null,
    refreshed: 0,
    rescanned: 0,
    durationMs,
    note: rest,
    error: null,
  };
}

/** Durations of each board's newest log row, when that row is among the recent scans. */
export function latestDurations(
  recent: RecentScan[],
  latest: Record<string, LastScan>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of recent) {
    if (r.board in out || typeof r.durationMs !== 'number') continue;
    if (latest[r.board]?.createdAt === r.createdAt) out[r.board] = r.durationMs;
  }
  return out;
}

/** Share of the AI-checked jobs judged suitable; null when nothing was checked or the counts are unknown. */
export function runYield(s: RunSummary): { approved: number; checked: number; ratio: number } | null {
  if (s.approved === null || s.rejected === null) return null;
  const checked = s.approved + s.rejected;
  return checked > 0 ? { approved: s.approved, checked, ratio: s.approved / checked } : null;
}
