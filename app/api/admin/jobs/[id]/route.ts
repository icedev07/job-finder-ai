import { after, NextRequest, NextResponse } from "next/server";
import { jobTimeline } from "@/lib/applicationEvents";
import { updateSheetsAfterChange } from "@/lib/googleSheetsSync";
import { prisma } from "@/lib/prisma";
import { parseJobPatch, touchesSheet, updateJobs } from "@/lib/jobActions";
import { adminActor, adminScope, userWhere } from "@/lib/scope";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Full job for the detail panel: description, AI history, apply links, its
// application's timeline, and how often the same company has shown up (a
// ghost-job / spam signal).
export async function GET(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const job = await prisma.scrapedJob.findFirst({
    where: { id, ...userWhere(scope) },
    include: { analysisLogs: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60_000);
  const [sameCompany, resume, events] = await Promise.all([
    prisma.scrapedJob.count({
      where: {
        userId: job.userId,
        company: { equals: job.company, mode: "insensitive" },
        createdAt: { gte: ninetyDaysAgo },
        NOT: { id },
      },
    }),
    job.resumeId
      ? prisma.resume.findUnique({ where: { id: job.resumeId }, select: { id: true, name: true, fileName: true } })
      : Promise.resolve(null),
    jobTimeline(id),
  ]);

  let signals: Record<string, unknown> | null = null;
  try {
    signals = job.signals ? JSON.parse(job.signals) : null;
  } catch {
    signals = null;
  }
  let application: Record<string, unknown> | null = null;
  try {
    application = job.applicationData ? JSON.parse(job.applicationData) : null;
  } catch {
    application = null;
  }

  return NextResponse.json({
    job: { ...job, signals, applicationData: application },
    sameCompany90d: sameCompany,
    resume,
    events,
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const patch = parseJobPatch(body);
  if (typeof patch === "string") return NextResponse.json({ error: patch }, { status: 400 });
  const updated = await updateJobs([id], patch, { scope: userWhere(scope), actor: adminActor(scope) });
  if (!updated) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  // Approved by hand: to the user's Google Sheet right after the response; moved: its Stage there.
  if (touchesSheet(patch)) after(() => updateSheetsAfterChange([id], userWhere(scope)));
  return NextResponse.json({ ok: true });
}
