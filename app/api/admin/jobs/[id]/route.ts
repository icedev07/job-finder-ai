import { after, NextRequest, NextResponse } from "next/server";
import { jobTimeline } from "@/lib/applicationEvents";
import { updateSheetsAfterChange } from "@/lib/googleSheetsSync";
import { getConfig } from "@/lib/config";
import { jobInterviews } from "@/lib/interviews";
import { prisma } from "@/lib/prisma";
import { parseJobPatch, touchesSheet, updateJobs } from "@/lib/jobActions";
import { setSentResume } from "@/lib/resumes";
import { adminActor, adminScope, userWhere } from "@/lib/scope";
import { getUserSettings } from "@/lib/userSettings";
import { jobDrafts, writingResumes } from "@/lib/writing";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Full job for the detail panel: description, AI history, apply links, its
// application's interviews, drafts (with the user's resumes to write from) and
// timeline, and how often the same company has shown up (a ghost-job / spam
// signal).
export async function GET(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  // The job, and what needs only its id, at once (a job out of view returns 404 and the rest is dropped).
  const [job, events, interviews, drafts] = await Promise.all([
    prisma.scrapedJob.findFirst({
      where: { id, ...userWhere(scope) },
      include: { analysisLogs: { orderBy: { createdAt: "desc" }, take: 10 } },
    }),
    jobTimeline(id),
    jobInterviews(id),
    jobDrafts(id),
  ]);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60_000);
  const [sameCompany, resume, writing, settings, config] = await Promise.all([
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
    writingResumes(job),
    getUserSettings(job.userId),
    getConfig(),
  ]);
  // Its user's Google Sheet: whether there is one, and the tab the job goes to.
  const sheet = {
    configured: !!(config.googleSheetsCredentials && settings.googleSheetId),
    tab: job.platform === "linkedin" ? settings.linkedinSheetTab : settings.jobsSheetTab,
  };

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
    interviews,
    drafts,
    writing,
    sheet,
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
  // The resume sent with the application (for the Dashboard's insights), one of the job's user's.
  const sent = (body as Record<string, unknown>).resumeId;
  if (sent !== undefined) {
    if (sent !== null && !(Number.isInteger(sent) && (sent as number) > 0)) {
      return NextResponse.json({ error: "resumeId must be a resume's id or null" }, { status: 400 });
    }
    const set = await setSentResume(id, sent as number | null, userWhere(scope));
    if (set === null) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (!set) return NextResponse.json({ error: "That resume is not one of this user's resumes" }, { status: 400 });
  }
  const updated = await updateJobs([id], patch, { scope: userWhere(scope), actor: adminActor(scope) });
  if (!updated) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  // Approved by hand: to the user's Google Sheet right after the response; moved: its Stage there.
  if (touchesSheet(patch)) after(() => updateSheetsAfterChange([id], userWhere(scope)));
  return NextResponse.json({ ok: true });
}
