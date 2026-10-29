import { NextRequest, NextResponse } from "next/server";
import { analyzeJobPreview } from "@/lib/jobAnalyzer";
import { parseAiRoutes, type AiRoute } from "@/lib/aiRoutes";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { adminScope, CHOOSE_USER_MESSAGE, userWhere, viewingUserId } from "@/lib/scope";

export const dynamic = "force-dynamic";

// Judge one job with any route (provider chain + Claude model + effort)
// without saving a verdict. Body: { jobId? , job?: {...}, route?: AiRoute }.
// A stored job is judged with its own user's search options; a pasted one
// with the viewed user's.
export async function POST(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  let job = body.job;
  let userId = viewingUserId(scope);
  if (body.jobId != null) {
    const row = await prisma.scrapedJob.findFirst({
      where: { id: Number(body.jobId), ...userWhere(scope) },
      select: { userId: true, title: true, company: true, location: true, description: true },
    });
    if (!row) return NextResponse.json({ ok: false, error: `Job ${body.jobId} not found` }, { status: 404 });
    job = row;
    userId = row.userId;
  }
  if (userId == null) return NextResponse.json({ ok: false, error: CHOOSE_USER_MESSAGE }, { status: 400 });
  if (!job?.title || !job?.company) {
    return NextResponse.json({ ok: false, error: "Provide a jobId or a job with title, company and description." }, { status: 400 });
  }

  // Sanitize the requested route through the same parser the saved routes use.
  let route: AiRoute | undefined;
  if (body.route) {
    const config = await getConfig();
    route = parseAiRoutes(JSON.stringify({ extension: body.route }), config.aiProviders).extension;
  }

  try {
    const result = await analyzeJobPreview(
      {
        title: String(job.title),
        company: String(job.company),
        location: job.location ? String(job.location) : null,
        description: job.description ? String(job.description) : null,
      },
      { userId, route, signal: AbortSignal.timeout(55_000) },
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message || String(e) });
  }
}
