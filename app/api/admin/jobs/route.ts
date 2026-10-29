import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { JOB_LIST_SELECT, jobsOrderBy, jobsWhere, parseJobsQuery } from "@/lib/jobsQuery";
import { deleteJobs, parseJobPatch, updateJobs } from "@/lib/jobActions";

export const dynamic = "force-dynamic";

// GET  → one page of jobs for the admin Jobs table (+ facet counts with facets=1).
// PATCH { ids, set } → bulk stage / feedback / status / notes changes.
// DELETE { ids } → bulk delete (max 500).

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const q = parseJobsQuery(params);
  const where = jobsWhere(q);
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
      prisma.scrapedJob.groupBy({ by: ["platform"], _count: { _all: true } }),
      prisma.scrapedJob.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.scrapedJob.groupBy({ by: ["stage"], _count: { _all: true } }),
      prisma.scrapedJob.groupBy({ by: ["applyMethod"], _count: { _all: true } }),
      prisma.scrapedJob.groupBy({ by: ["eligibility"], _count: { _all: true } }),
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
  const updated = await updateJobs(ids, patch);
  return NextResponse.json({ ok: true, updated });
}

export async function DELETE(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const ids = idsFrom(body);
  if (!ids?.length) return NextResponse.json({ error: "ids[] is required" }, { status: 400 });
  const deleted = await deleteJobs(ids);
  return NextResponse.json({ ok: true, deleted });
}
