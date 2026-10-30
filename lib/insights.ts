import { platformLabel } from "./format";
import { prisma } from "./prisma";

// The Dashboard's insights into every application sent so far (appliedAt set):
// how many got an answer, reached an interview or an offer, how long the first
// answer took, and how each source and resume did. An answer is the company
// moving the application on: to Interview, Offer or Rejected (or an interview
// added), when the timeline first shows it after applying.

export type InsightGroup = {
  /** The source's platform, or the resume's id ("" when none was recorded). */
  key: string;
  label: string;
  /** Whose resume it is (resumes only). */
  userId: number | null;
  applied: number;
  answered: number;
  interviews: number;
  offers: number;
};

export type Insights = {
  applied: number;
  answered: number;
  interviews: number;
  offers: number;
  rejected: number;
  /** Still at Applied with no answer. */
  waiting: number;
  /** Median days from applying to the first answer, over `answerTimes` answers. */
  medianDaysToAnswer: number | null;
  answerTimes: number;
  sources: InsightGroup[];
  resumes: InsightGroup[];
};

const DAY_MS = 24 * 60 * 60_000;
const ANSWER_STAGES = ["INTERVIEW", "OFFER", "REJECTED"];

function median(values: number[]): number | null {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** For these users' applications (it throws before /api/setup has added the tables it reads). */
export async function applicationInsights(userIds: number[]): Promise<Insights> {
  const apps = userIds.length
    ? await prisma.scrapedJob.findMany({
        where: { userId: { in: userIds }, appliedAt: { not: null } },
        select: {
          platform: true,
          resumeId: true,
          stage: true,
          closeReason: true,
          appliedAt: true,
          events: { where: { kind: "stage", toStage: { in: ANSWER_STAGES } }, select: { toStage: true, createdAt: true } },
          interviews: { select: { createdAt: true } },
        },
      })
    : [];
  const resumeIds = [...new Set(apps.flatMap((a) => (a.resumeId == null ? [] : [a.resumeId])))];
  const resumeRows = resumeIds.length
    ? await prisma.resume.findMany({ where: { id: { in: resumeIds } }, select: { id: true, name: true, userId: true } })
    : [];

  const out: Insights = {
    applied: 0,
    answered: 0,
    interviews: 0,
    offers: 0,
    rejected: 0,
    waiting: 0,
    medianDaysToAnswer: null,
    answerTimes: 0,
    sources: [],
    resumes: [],
  };
  const sources = new Map<string, InsightGroup>();
  const resumes = new Map<string, InsightGroup>();
  const group = (map: Map<string, InsightGroup>, key: string, make: () => Omit<InsightGroup, "applied" | "answered" | "interviews" | "offers">) => {
    let g = map.get(key);
    if (!g) {
      g = { ...make(), applied: 0, answered: 0, interviews: 0, offers: 0 };
      map.set(key, g);
    }
    return g;
  };
  const days: number[] = [];

  for (const a of apps) {
    const applied = a.appliedAt!.getTime();
    const to = new Set(a.events.map((e) => e.toStage));
    const offer = a.stage === "OFFER" || to.has("OFFER");
    const interview = offer || a.stage === "INTERVIEW" || to.has("INTERVIEW") || a.interviews.length > 0;
    const rejected = a.stage === "REJECTED" || a.closeReason === "REJECTED" || to.has("REJECTED");
    const answered = interview || rejected;
    // The first answer the timeline shows after applying (one recorded before it can't date the answer).
    const times = [...a.events.map((e) => e.createdAt.getTime()), ...a.interviews.map((i) => i.createdAt.getTime())].filter((t) => t >= applied);
    if (answered && times.length) days.push((Math.min(...times) - applied) / DAY_MS);

    out.applied++;
    if (answered) out.answered++;
    if (interview) out.interviews++;
    if (offer) out.offers++;
    if (a.stage === "REJECTED") out.rejected++;
    if (!answered && a.stage === "APPLIED") out.waiting++;
    const r = a.resumeId == null ? null : resumeRows.find((x) => x.id === a.resumeId);
    for (const g of [
      group(sources, a.platform, () => ({ key: a.platform, label: platformLabel(a.platform), userId: null })),
      group(resumes, a.resumeId == null ? "" : String(a.resumeId), () => ({
        key: a.resumeId == null ? "" : String(a.resumeId),
        label: a.resumeId == null ? "Not recorded" : (r?.name ?? "A deleted resume"),
        userId: r?.userId ?? null,
      })),
    ]) {
      g.applied++;
      if (answered) g.answered++;
      if (interview) g.interviews++;
      if (offer) g.offers++;
    }
  }

  out.medianDaysToAnswer = median(days);
  out.answerTimes = days.length;
  const byApplied = (a: InsightGroup, b: InsightGroup) => b.applied - a.applied || a.label.localeCompare(b.label);
  out.sources = [...sources.values()].sort(byApplied);
  // Resumes first, then the applications without one.
  out.resumes = [...resumes.values()].sort((a, b) => Number(a.key === "") - Number(b.key === "") || byApplied(a, b));
  return out;
}

/** At least this many applications before a source or resume can be the best one. */
export const BEST_MIN_APPLIED = 3;

/** The group whose applications most often reached an interview (ties: more applications), among those with enough. */
export function bestGroup(groups: InsightGroup[]): InsightGroup | null {
  let best: InsightGroup | null = null;
  for (const g of groups) {
    if (g.key === "" || g.applied < BEST_MIN_APPLIED || g.interviews === 0) continue;
    const rate = g.interviews / g.applied;
    const bestRate = best ? best.interviews / best.applied : -1;
    if (rate > bestRate || (rate === bestRate && best && g.applied > best.applied)) best = g;
  }
  return best;
}
