import { after, NextRequest, NextResponse } from "next/server";
import { updateSheetsAfterChange } from "@/lib/googleSheetsSync";
import { prisma } from "@/lib/prisma";
import { JOB_LIST_SELECT, jobsOrderBy, jobsWhere, parseJobsQuery } from "@/lib/jobsQuery";
import { deleteJobs, parseJobPatch, touchesSheet, updateJobs } from "@/lib/jobActions";
import { adminActor, adminScope, userWhere, viewingUserId } from "@/lib/scope";

export const dynamic = "force-dynamic";

// All for the user being viewed (or every user):
// GET  → one page of jobs for the admin Jobs table (+ facet counts with facets=1).
// PATCH { ids, set } → bulk stage / close reason / feedback / status / notes /
//   follow-up changes; right after the response, jobs approved by hand go to
//   their user's Google Sheet and moved ones get their Stage updated there.
// DELETE { ids } → bulk delete (max 500).

export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const params = new URL(req.url).searchParams;
  const q = parseJobsQuery(params);
  const where = jobsWhere(q, viewingUserId(scope));
  const mine = userWhere(scope);
  const page = q.page ?? 1;
  const limit = q.limit ?? 25;

  const [jobs, total] = await Promise.all([
    prisma.scrapedJob.findMany({
      where,
      orderBy: jobsOrderBy(q.sort),
      skip: (page - 1) * limit,
      take: limit,
      select: JOB_LIST_SELECT,
    }),
    prisma.scrapedJob.count({ where }),
  ]);

  let facets: Record<string, { value: string | null; count: number }[]> | undefined;
  if (params.get("facets") === "1") {
    const [platforms, statuses, stages, applyMethods, eligibility] = await Promise.all([
      prisma.scrapedJob.groupBy({ by: ["platform"], where: mine, _count: { _all: true } }),
      prisma.scrapedJob.groupBy({ by: ["status"], where: mine, _count: { _all: true } }),
      prisma.scrapedJob.groupBy({ by: ["stage"], where: mine, _count: { _all: true } }),
      prisma.scrapedJob.groupBy({ by: ["applyMethod"], where: mine, _count: { _all: true } }),
      prisma.scrapedJob.groupBy({ by: ["eligibility"], where: mine, _count: { _all: true } }),
    ]);
    const rows = <T extends { _count: { _all: number } }>(list: T[], key: (r: T) => string | null) =>
      list.map((r) => ({ value: key(r), count: r._count._all })).sort((a, b) => b.count - a.count);
    facets = {
      platforms: rows(platforms, (r) => r.platform),
      statuses: rows(statuses, (r) => r.status),
      stages: rows(stages, (r) => r.stage),
      applyMethods: rows(applyMethods, (r) => r.applyMethod),
      eligibility: rows(eligibility, (r) => r.eligibility),
    };
  }

  return NextResponse.json({ jobs, total, page, limit, facets });
}

function idsFrom(body: unknown): number[] | null {
  const ids = (body as { ids?: unknown })?.ids;
  if (!Array.isArray(ids)) return null;
  return ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
}

export async function PATCH(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const ids = idsFrom(body);
  if (!ids?.length) return NextResponse.json({ error: "ids[] is required" }, { status: 400 });
  const patch = parseJobPatch((body as { set?: unknown }).set);
  if (typeof patch === "string") return NextResponse.json({ error: patch }, { status: 400 });
  const updated = await updateJobs(ids, patch, { scope: userWhere(scope), actor: adminActor(scope) });
  if (touchesSheet(patch)) after(() => updateSheetsAfterChange(ids, userWhere(scope)));
  return NextResponse.json({ ok: true, updated });
}

export async function DELETE(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const ids = idsFrom(body);
  if (!ids?.length) return NextResponse.json({ error: "ids[] is required" }, { status: 400 });
  const deleted = await deleteJobs(ids, userWhere(scope));
  return NextResponse.json({ ok: true, deleted });
}
