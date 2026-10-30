import { after, NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { sendApprovedJobsNow } from "@/lib/googleSheetsSync";
import { prisma } from "@/lib/prisma";
import {
  hasReview,
  MAX_REVIEW_IDS,
  parseReviewUndo,
  reviewJobs,
  reviewQueueWhere,
  undoReview,
  type ReviewAction,
} from "@/lib/review";
import { adminScope, scopedUsers, type ScopedUser } from "@/lib/scope";

export const dynamic = "force-dynamic";

// The Review queue of the user being viewed, or of every user (narrowed to one
// of them with ?only=<id> / "only" in the body).

const JOB_SELECT = {
  id: true,
  userId: true,
  platform: true,
  title: true,
  company: true,
  location: true,
  url: true,
  manualApplyUrl: true,
  applyMethod: true,
  salary: true,
  techStack: true,
  status: true,
  aiScore: true,
  aiReason: true,
  eligibility: true,
  createdAt: true,
} as const;

function narrow(users: ScopedUser[], only: unknown): ScopedUser[] {
  const id = Number(only);
  return only == null || only === "" || !Number.isInteger(id) ? users : users.filter((u) => u.id === id);
}

// GET ?limit=50 (at most 500) &description=0 (the list view leaves it out)
//   → { jobs (newest first), total, users: each user in view with their band,
//       whether Review is on and how many close calls wait }
export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const params = req.nextUrl.searchParams;
  const limit = Math.min(500, Math.max(1, Math.round(Number(params.get("limit"))) || 50));
  const withDescription = params.get("description") !== "0";
  const users = await scopedUsers(scope);
  const queue = narrow(users, params.get("only"));
  const where = reviewQueueWhere(queue);

  const [jobs, total, waiting] = await Promise.all([
    hasReview(queue)
      ? prisma.scrapedJob.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          select: { ...JOB_SELECT, description: withDescription },
        })
      : [],
    hasReview(queue) ? prisma.scrapedJob.count({ where }) : 0,
    hasReview(users)
      ? prisma.scrapedJob.groupBy({ by: ["userId"], where: reviewQueueWhere(users), _count: { _all: true } })
      : [],
  ]);
  const counts = new Map(waiting.map((g) => [g.userId, g._count._all]));
  return NextResponse.json({
    jobs: jobs.map((j) => ({ ...j, description: j.description ? j.description.slice(0, 4000) : null })),
    total,
    users: users.map((u) => ({
      id: u.id,
      review: u.settings.reviewEnabled,
      band: { min: u.settings.reviewBandMin, max: u.settings.reviewBandMax },
      waiting: counts.get(u.id) ?? 0,
    })),
  });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

// POST { action: "approve" | "reject" | "keep", ids: number[] }
//      { action: "keep", all: true, only?: userId }   ("Mark all reviewed")
//      { action: "undo", undo }                        (undo as returned by the above)
// Approve: 👍, approved, saved to Applications and sent to the user's Google
// Sheet right after the response. Reject: 👎 and rejected. Keep: leaves the
// queue with the AI verdict, no rating.
export async function POST(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return badRequest("Expected an object");
  const users = await scopedUsers(scope);

  if (body.action === "undo") {
    const undo = parseReviewUndo(body.undo);
    if (typeof undo === "string") return badRequest(undo);
    return NextResponse.json({ ok: true, ...(await undoReview(users.map((u) => u.id), undo)) });
  }

  const action = body.action as ReviewAction;
  if (action !== "approve" && action !== "reject" && action !== "keep") {
    return badRequest('action must be "approve", "reject", "keep" or "undo"');
  }
  let ids: number[] | "all";
  if (body.all === true) {
    if (action !== "keep") return badRequest("Only keep works on the whole queue");
    ids = "all";
  } else {
    if (!Array.isArray(body.ids) || body.ids.length === 0) return badRequest("ids[] is required");
    if (body.ids.length > MAX_REVIEW_IDS) return badRequest(`At most ${MAX_REVIEW_IDS} jobs at a time`);
    ids = body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  }

  const queueUsers = ids === "all" ? narrow(users, body.only) : users;
  const result = await reviewJobs(queueUsers, ids, action);

  // Approved jobs not in a sheet yet go to their user's sheet after the response;
  // `sheet` counts those whose user has one.
  let sheet = 0;
  const toSend = result.approved.filter((j) => !j.inSheet);
  if (toSend.length) {
    if ((await getConfig()).googleSheetsCredentials) {
      const withSheet = new Set(users.filter((u) => u.settings.googleSheetId).map((u) => u.id));
      sheet = toSend.filter((j) => withSheet.has(j.userId)).length;
    }
    after(() => sendApprovedJobsNow(toSend.map((j) => j.id)));
  }
  return NextResponse.json({ ok: true, updated: result.updated, undo: result.undo, sheet });
}
