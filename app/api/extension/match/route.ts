import { NextRequest, NextResponse } from "next/server";
import { findJobForPage } from "@/lib/applications";
import { pickResumeForJob } from "@/lib/resumes";
import { extensionCorsHeaders, requireExtensionUser } from "@/lib/extensionAuth";

export const dynamic = "force-dynamic";

const CORS = extensionCorsHeaders("POST, OPTIONS");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// POST { url, title?, company?, pageText? } → the stored job this form belongs
// to (its AI verdict and stage) and the resume variant to attach.
export async function POST(req: NextRequest) {
  const auth = await requireExtensionUser(req, CORS);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS });
  }
  const url = typeof body.url === "string" ? body.url : "";
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400, headers: CORS });
  const job = await findJobForPage({
    userId,
    url,
    title: typeof body.title === "string" ? body.title : undefined,
    company: typeof body.company === "string" ? body.company : undefined,
  });
  const text = [job?.title, job?.description, typeof body.pageText === "string" ? body.pageText : ""].filter(Boolean).join("\n");
  const resume = await pickResumeForJob(userId, text).catch(() => null);
  return NextResponse.json(
    {
      job: job
        ? { id: job.id, title: job.title, company: job.company, status: job.status, aiScore: job.aiScore, aiReason: job.aiReason, stage: job.stage }
        : null,
      resume: resume ? { id: resume.id, name: resume.name } : null,
    },
    { headers: CORS },
  );
}
