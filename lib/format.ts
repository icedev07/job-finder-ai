// Display helpers shared by server and client components (pure, no imports).

const EMPTY = "—";

const compactFmt = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const intFmt = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

function isNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/** Under this a database query's round trip means the app runs next to its database (lib/dbLatency.ts). */
export const NEAR_DB_MS = 25;

/** 1284 → "1.3K", null → "—". */
export function formatCompact(n: number | null | undefined): string {
  return isNum(n) ? compactFmt.format(n) : EMPTY;
}

/** 12900 → "12,900". */
export function formatNumber(n: number | null | undefined): string {
  return isNum(n) ? intFmt.format(n) : EMPTY;
}

/** 0.4567 → "46%". */
export function formatPercent(ratio: number | null | undefined, digits = 0): string {
  return isNum(ratio) ? `${(ratio * 100).toFixed(digits)}%` : EMPTY;
}

export function ratio(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

/** USD with sensible precision: $0.0042 → "$0.0042", $3.5 → "$3.50". */
export function formatUsd(n: number | null | undefined): string {
  if (!isNum(n)) return EMPTY;
  if (n === 0) return "$0";
  if (Math.abs(n) < 0.01) return `$${n.toFixed(4)}`;
  if (Math.abs(n) < 100) return `$${n.toFixed(2)}`;
  return `$${intFmt.format(n)}`;
}

/** 42_000 → "42s", 3_725_000 → "1h 2m". */
export function formatDuration(ms: number | null | undefined): string {
  if (!isNum(ms)) return EMPTY;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 ? `${m}m ${s % 60}s` : `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
}

const dayFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" });
const whenFmt = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "2026-10-29" → "Oct 29". */
export function formatDayKey(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? key : dayFmt.format(d);
}

export function formatDateTime(v: string | Date | null | undefined): string {
  if (!v) return EMPTY;
  const d = typeof v === "string" ? new Date(v) : v;
  return Number.isNaN(d.getTime()) ? EMPTY : dateTimeFmt.format(d);
}

export function formatDate(v: string | Date | null | undefined): string {
  if (!v) return EMPTY;
  const d = typeof v === "string" ? new Date(v) : v;
  return Number.isNaN(d.getTime()) ? EMPTY : dateFmt.format(d);
}

/** "Tue, Nov 3, 02:00 PM": an interview's time, in the time zone of whoever runs it (render it in the browser). */
export function formatWhen(v: string | Date | null | undefined): string {
  if (!v) return EMPTY;
  const d = typeof v === "string" ? new Date(v) : v;
  return Number.isNaN(d.getTime()) ? EMPTY : whenFmt.format(d);
}

/** "3m ago", "2h ago", "5d ago", "in 2d". */
export function timeAgo(v: string | Date | null | undefined, now = Date.now()): string {
  if (!v) return EMPTY;
  const t = (typeof v === "string" ? new Date(v) : v).getTime();
  if (Number.isNaN(t)) return EMPTY;
  const diff = now - t;
  const future = diff < 0;
  const s = Math.abs(diff) / 1000;
  let text: string;
  if (s < 45) text = "just now";
  else if (s < 3600) text = `${Math.round(s / 60)}m`;
  else if (s < 86_400) text = `${Math.round(s / 3600)}h`;
  else if (s < 86_400 * 45) text = `${Math.round(s / 86_400)}d`;
  else text = `${Math.round(s / (86_400 * 30))}mo`;
  if (text === "just now") return text;
  return future ? `in ${text}` : `${text} ago`;
}

export function formatBytes(n: number | null | undefined): string {
  if (!isNum(n)) return EMPTY;
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

// ── Job domain labels & colors ──────────────────────────────────────────────

export type JobStatus = "PENDING" | "APPROVED" | "REJECTED";

export const STATUS_META: Record<JobStatus, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-muted text-muted-foreground" },
  APPROVED: { label: "Approved", className: "bg-tier-match/15 text-tier-match-ink" },
  REJECTED: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
};

export const JOB_STAGES = ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "ARCHIVED"] as const;
export type JobStage = (typeof JOB_STAGES)[number];

export const STAGE_META: Record<JobStage | "NONE", { label: string; dot: string }> = {
  NONE: { label: "Not started", dot: "bg-muted-foreground/40" },
  SAVED: { label: "Saved", dot: "bg-sky-500" },
  APPLIED: { label: "Applied", dot: "bg-indigo-500" },
  INTERVIEW: { label: "Interview", dot: "bg-amber-500" },
  OFFER: { label: "Offer", dot: "bg-emerald-500" },
  REJECTED: { label: "Rejected", dot: "bg-red-500" },
  ARCHIVED: { label: "Archived", dot: "bg-zinc-400" },
};

export function isJobStage(v: unknown): v is JobStage {
  return typeof v === "string" && (JOB_STAGES as readonly string[]).includes(v);
}

/** Why an application closed: the company said no (stage Rejected), or it was archived for one of the others. */
export const CLOSE_REASONS = ["REJECTED", "WITHDREW", "POSITION_CLOSED", "NO_RESPONSE"] as const;
export type CloseReason = (typeof CLOSE_REASONS)[number];

export const CLOSE_REASON_LABEL: Record<CloseReason, string> = {
  REJECTED: "Rejected by the company",
  WITHDREW: "Withdrew",
  POSITION_CLOSED: "Position closed",
  NO_RESPONSE: "No response",
};

export function isCloseReason(v: unknown): v is CloseReason {
  return typeof v === "string" && (CLOSE_REASONS as readonly string[]).includes(v);
}

export const INTERVIEW_KINDS = ["HR", "TECHNICAL", "FINAL", "OTHER"] as const;
export type InterviewKind = (typeof INTERVIEW_KINDS)[number];

export const INTERVIEW_KIND_LABEL: Record<InterviewKind, string> = {
  HR: "HR / recruiter",
  TECHNICAL: "Technical",
  FINAL: "Final",
  OTHER: "Other",
};

export function isInterviewKind(v: unknown): v is InterviewKind {
  return typeof v === "string" && (INTERVIEW_KINDS as readonly string[]).includes(v);
}

/** "Technical interview", "HR interview", … ("Interview" for Other or an unknown kind). */
export function interviewName(kind: unknown): string {
  if (kind === "HR") return "HR interview";
  if (kind === "TECHNICAL" || kind === "FINAL") return `${INTERVIEW_KIND_LABEL[kind]} interview`;
  return "Interview";
}

/** What Writing in a job's panel can draft for the application, one draft of each. */
export const DRAFT_KINDS = ["match", "cover_letter", "intro", "follow_up", "interview_prep"] as const;
export type DraftKind = (typeof DRAFT_KINDS)[number];

export const DRAFT_KIND_INFO: Record<DraftKind, { label: string; hint: string }> = {
  match: {
    label: "Resume match",
    hint: "How the resume fits this job: strengths, gaps, keywords to add and lines to rewrite.",
  },
  cover_letter: { label: "Cover letter", hint: "A cover letter for this job from the resume and profile, ready to paste." },
  intro: { label: "Intro message", hint: "A short note to the recruiter or hiring manager, for LinkedIn or an e-mail." },
  follow_up: {
    label: "Follow-up",
    hint: "An e-mail that fits where the application stands: no answer yet, after an interview, an offer or a no.",
  },
  interview_prep: {
    label: "Interview prep",
    hint: "For the next interview: likely questions, stories from the resume to tell, questions to ask and facts to have ready.",
  },
};

export function isDraftKind(v: unknown): v is DraftKind {
  return typeof v === "string" && (DRAFT_KINDS as readonly string[]).includes(v);
}

/** The stage as the Google Sheet shows it: "Applied", "Archived (no response)", "" outside the pipeline. */
export function stageText(stage: string | null | undefined, closeReason?: string | null): string {
  if (!stage || !isJobStage(stage)) return "";
  const label = STAGE_META[stage].label;
  return stage === "ARCHIVED" && isCloseReason(closeReason) && closeReason !== "REJECTED"
    ? `${label} (${CLOSE_REASON_LABEL[closeReason].toLowerCase()})`
    : label;
}

export type ScoreTier = "hot" | "match" | "maybe" | "low";

export function scoreTier(score: number | null | undefined): ScoreTier {
  if (!isNum(score)) return "low";
  if (score >= 80) return "hot";
  if (score >= 60) return "match";
  if (score >= 40) return "maybe";
  return "low";
}

export const TIER_META: Record<ScoreTier, { label: string; className: string }> = {
  hot: { label: "Strong", className: "bg-tier-hot/15 text-tier-hot-ink" },
  match: { label: "Match", className: "bg-tier-match/15 text-tier-match-ink" },
  maybe: { label: "Maybe", className: "bg-tier-maybe/20 text-tier-maybe-ink" },
  low: { label: "Low", className: "bg-tier-low/15 text-tier-low-ink" },
};

export const APPLY_METHOD_LABEL: Record<string, string> = {
  EASY_APPLY: "Easy Apply",
  EXTERNAL: "Company site",
};

export const ELIGIBILITY_LABEL: Record<string, string> = {
  worldwide: "Worldwide",
  europe: "Europe",
  emea: "EMEA",
  americas: "Americas only",
  specific: "Specific countries",
  unclear: "Unclear",
};

/** "greenhouse" → "Greenhouse", "hnwhoishiring" → "HN Who's hiring". */
const PLATFORM_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  remoteok: "RemoteOK",
  jobicy: "Jobicy",
  landingjobs: "Landing.Jobs",
  remotive: "Remotive",
  workingnomads: "Working Nomads",
  arbeitnow: "Arbeitnow",
  hnwhoishiring: "HN Who's hiring",
  themuse: "The Muse",
  realworkfromanywhere: "Real Work From Anywhere",
  nofluffjobs: "NoFluffJobs",
  weworkremotely: "We Work Remotely",
  jobspresso: "Jobspresso",
  authenticjobs: "Authentic Jobs",
  nodesk: "Nodesk",
  justremote: "JustRemote",
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  mygreenhouse: "MyGreenhouse",
};

export function platformLabel(p: string | null | undefined): string {
  if (!p) return EMPTY;
  return PLATFORM_LABEL[p] ?? p.charAt(0).toUpperCase() + p.slice(1);
}

/** Only http(s) links are rendered as links (guards against javascript: URLs in scraped data). */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
