import type { Prisma } from "../generated/prisma";
import { prisma } from "./prisma";

// The fields an application card shows (the Applications board, Next actions),
// and each card's next interview.

export const CARD_SELECT = {
  id: true,
  userId: true,
  title: true,
  company: true,
  location: true,
  platform: true,
  aiScore: true,
  stage: true,
  closeReason: true,
  stageUpdatedAt: true,
  appliedAt: true,
  followUpAt: true,
  url: true,
  manualApplyUrl: true,
  applyMethod: true,
  createdAt: true,
} satisfies Prisma.ScrapedJobSelect;

/** An interview that started less than this long ago still counts as coming up. */
export const STARTED_MS = 60 * 60_000;

/** The cards with the start of their next interview (null: none; also before /api/setup added interviews). */
export async function withNextInterviews<T extends { id: number }>(
  cards: T[],
  now = new Date(),
): Promise<(T & { nextInterviewAt: Date | null })[]> {
  let next = new Map<number, Date | null>();
  if (cards.length) {
    try {
      const rows = await prisma.interview.groupBy({
        by: ["jobId"],
        where: { jobId: { in: cards.map((c) => c.id) }, at: { gte: new Date(now.getTime() - STARTED_MS) } },
        _min: { at: true },
      });
      next = new Map(rows.map((r) => [r.jobId, r._min.at]));
    } catch (err) {
      console.error(`[interviews] could not read the next interviews: ${(err as Error)?.message || err}`);
    }
  }
  return cards.map((c) => ({ ...c, nextInterviewAt: next.get(c.id) ?? null }));
}
