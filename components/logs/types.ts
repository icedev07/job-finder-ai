import type { ReactNode } from 'react';

// Row shapes returned by GET /api/admin/logs (dates arrive as ISO strings).

export const LOG_TYPES = ['jobs', 'analysis', 'scans', 'extension'] as const;
export type LogType = (typeof LOG_TYPES)[number];

export function isLogType(v: unknown): v is LogType {
  return typeof v === 'string' && (LOG_TYPES as readonly string[]).includes(v);
}

/** Mirrors the `take:` limits in /api/admin/logs, so the count can say when a view is capped. */
export const ROW_CAP: Record<LogType, number> = { jobs: 500, analysis: 500, scans: 200, extension: 500 };

export type Noun = { one: string; many: string };

export const NOUN: Record<LogType, Noun> = {
  jobs: { one: 'job', many: 'jobs' },
  analysis: { one: 'analysis log', many: 'analysis logs' },
  scans: { one: 'scan log', many: 'scan logs' },
  extension: { one: 'extension log', many: 'extension logs' },
};

export type JobRow = {
  id: number;
  platform: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  manualApplyUrl: string | null;
  status: string;
  aiScore: number | null;
  aiReason: string | null;
  createdAt: string;
};

export type AnalysisLogRow = {
  id: number;
  scrapedJobId: number;
  model: string;
  approved: boolean;
  score: number | null;
  reason: string | null;
  tokensUsed: number | null;
  createdAt: string;
  scrapedJob?: { title: string; company: string; url: string; platform: string } | null;
};

export type ScanLogRow = {
  id: number;
  board: string;
  jobsFound: number;
  jobsSaved: number;
  errors: string | null;
  durationMs: number | null;
  createdAt: string;
};

export type ExtensionLogRow = {
  id: number;
  level: string;
  message: string;
  sessionId: string | null;
  createdAt: string;
};

export type LogColumn<T> = {
  id: string;
  header: ReactNode;
  /** Classes for the header and every cell of the column (alignment, wrapping). */
  className?: string;
  cell: (row: T) => ReactNode;
};
