import { NextRequest, NextResponse } from "next/server";
import { analyzeJobPreview } from "@/lib/jobAnalyzer";
import { parseAiRoutes, type AiRoute } from "@/lib/aiRoutes";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { adminOnly } from "@/lib/scope";

export const dynamic = "force-dynamic";

// Judge one job with any route (provider chain + Claude model + effort)
// without saving a verdict. Body: { jobId? , job?: {...}, route?: AiRoute }.
export async function POST(req: NextRequest) {
  const denied = await adminOnly(req);
  if (denied) return denied;
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  let job = body.job;
  if (body.jobId != null) {
    const row = await prisma.scrapedJob.findUnique({
      where: { id: Number(body.jobId) },
      select: { title: true, company: true, location: true, description: true },
    });
    if (!row) return NextResponse.json({ ok: false, error: `Job ${body.jobId} not found` }, { status: 404 });
    job = row;
  }
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
      { route, signal: AbortSignal.timeout(55_000) },
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message || String(e) });
  }
}
